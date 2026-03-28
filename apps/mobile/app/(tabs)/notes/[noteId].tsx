import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { Breadcrumbs, type Crumb } from "@/components/navigation/Breadcrumbs";
import { CommentsPanel } from "@/components/collaboration/CommentsPanel";
import { ShareSheet } from "@/components/collaboration/ShareSheet";
import { AIAssistPanel } from "@/components/notes/AIAssistPanel";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { parseBlocks, useFoldersQuery, useDeleteNote, useNoteDetailQuery, useUpdateNote } from "@/lib/notes";
import type { NoteBlock } from "@/lib/notes";
import { useWorkspaceStore } from "@/stores/workspace";
import { useNavigationStore } from "@/stores/navigation";

export default function NoteEditorScreen() {
	const { noteId } = useLocalSearchParams<{ noteId: string }>();
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { data: note } = useNoteDetailQuery(noteId);
	const { data: folders } = useFoldersQuery(workspaceId || "");
	const updateNote = useUpdateNote();
	const deleteNote = useDeleteNote();
	const { addRecent } = useNavigationStore();

	const [title, setTitle] = useState("");
	const [blocks, setBlocks] = useState<NoteBlock[]>([]);
	const [isPinned, setIsPinned] = useState(false);
	const [showAI, setShowAI] = useState(false);
	const [showComments, setShowComments] = useState(false);
	const [showShare, setShowShare] = useState(false);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// Load note data
	useEffect(() => {
		if (note) {
			setTitle(note.title);
			setBlocks(parseBlocks(note.contentBlocksJson));
			setIsPinned(note.isPinned);
			addRecent({
				id: note.id,
				title: note.title,
				icon: note.isPinned ? "\uD83D\uDCCC" : "\uD83D\uDCC4",
				route: `/(tabs)/notes/${note.id}`,
				type: "note",
			});
		}
	}, [note, addRecent]);

	// Auto-save with debounce
	const scheduleAutoSave = useCallback(() => {
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			if (!noteId) return;
			updateNote.mutate({
				id: noteId,
				title: title || "Untitled",
				contentBlocks: blocks,
				isPinned,
			});
		}, 1000);
	}, [noteId, title, blocks, isPinned, updateNote]);

	const handleTitleChange = (text: string) => {
		setTitle(text);
		scheduleAutoSave();
	};

	const handleBlocksChange = (newBlocks: NoteBlock[]) => {
		setBlocks(newBlocks);
		scheduleAutoSave();
	};

	const handleTogglePin = () => {
		setIsPinned(!isPinned);
		if (noteId) {
			updateNote.mutate({ id: noteId, isPinned: !isPinned });
		}
	};

	const handleDelete = () => {
		Alert.alert("Delete Note", "This note will be permanently deleted.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
					deleteNote.mutate(noteId, { onSuccess: () => router.back() });
				},
			},
		]);
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: "",
					headerRight: () => (
						<View style={styles.headerActions}>
							<Pressable style={styles.headerBtn} onPress={() => setShowAI(true)}>
								<Text style={{ fontSize: 16 }}>{"\u2728"}</Text>
							</Pressable>
							<Pressable style={styles.headerBtn} onPress={() => setShowComments(true)}>
								<Text style={{ fontSize: 16 }}>{"\uD83D\uDCAC"}</Text>
							</Pressable>
							<Pressable style={styles.headerBtn} onPress={() => setShowShare(true)}>
								<Text style={{ fontSize: 16 }}>{"\uD83D\uDD17"}</Text>
							</Pressable>
							<Pressable style={styles.headerBtn} onPress={handleTogglePin}>
								<Text style={{ fontSize: 16 }}>{isPinned ? "📌" : "📍"}</Text>
							</Pressable>
						</View>
					),
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				{/* Breadcrumbs */}
				<Breadcrumbs
					crumbs={[
						{ label: "Notes", route: "/(tabs)/notes", icon: "\uD83D\uDCC4" },
						...(note?.folderId && folders
							? (() => {
									const folder = folders.find((f) => f.id === note.folderId);
									return folder ? [{ label: folder.name, route: "/(tabs)/notes", icon: "\uD83D\uDCC1" }] : [];
								})()
							: []),
						{ label: title || "Untitled" },
					]}
				/>

				{/* Title */}
				<TextInput
					style={[styles.titleInput, { color: colors.text }]}
					value={title}
					onChangeText={handleTitleChange}
					placeholder="Untitled"
					placeholderTextColor={colors.textSecondary}
					multiline
				/>

				{/* Backlinks */}
				{note?.backlinks && note.backlinks.length > 0 && (
					<View style={[styles.backlinks, { borderColor: colors.border }]}>
						<Text style={[styles.backlinksLabel, { color: colors.textSecondary }]}>
							Referenced by
						</Text>
						{note.backlinks.map((bl) => (
							<Pressable key={bl.id} onPress={() => router.push(`/(tabs)/notes/${bl.id}`)}>
								<Text style={[styles.backlinkItem, { color: colors.tint }]}>{bl.title}</Text>
							</Pressable>
						))}
					</View>
				)}

				{/* Documents */}
				{note?.documents && note.documents.length > 0 && (
					<View style={[styles.docsSection, { borderColor: colors.border }]}>
						<Text style={[styles.docsLabel, { color: colors.textSecondary }]}>Attachments</Text>
						{note.documents.map((doc) => (
							<View key={doc.id} style={[styles.docRow, { borderColor: colors.border }]}>
								<Text style={[styles.docName, { color: colors.text }]}>{doc.name}</Text>
								<Text style={[styles.docSize, { color: colors.textSecondary }]}>
									{formatSize(doc.sizeBytes)}
								</Text>
							</View>
						))}
					</View>
				)}

				{/* Block editor */}
				<BlockEditor blocks={blocks} onChange={handleBlocksChange} />

				{/* Auto-save indicator */}
				{updateNote.isPending && (
					<View style={[styles.saveIndicator, { backgroundColor: colors.surface }]}>
						<Text style={[styles.saveText, { color: colors.textSecondary }]}>Saving...</Text>
					</View>
				)}
			</KeyboardAvoidingView>

			{/* Comments */}
			<CommentsPanel
				visible={showComments}
				onClose={() => setShowComments(false)}
				pageType="note"
				pageId={noteId}
			/>

			{/* Share */}
			<ShareSheet
				visible={showShare}
				onClose={() => setShowShare(false)}
				pageType="note"
				pageId={noteId}
				pageTitle={title || "Untitled"}
			/>

			{/* AI Assistant */}
			<AIAssistPanel
				visible={showAI}
				onClose={() => setShowAI(false)}
				content={blocks.map((b) => b.content).filter(Boolean).join("\n")}
				pageContext={title}
				onInsert={(text) => {
					const newBlock: NoteBlock = {
						id: crypto.randomUUID(),
						type: "text",
						content: text,
					};
					setBlocks([...blocks, newBlock]);
					scheduleAutoSave();
				}}
				onReplace={(text) => {
					const newBlock: NoteBlock = {
						id: crypto.randomUUID(),
						type: "text",
						content: text,
					};
					setBlocks([newBlock]);
					scheduleAutoSave();
				}}
			/>
		</>
	);
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1048576).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	titleInput: {
		fontSize: 26,
		fontWeight: "800",
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 8,
	},
	headerActions: { flexDirection: "row", gap: 12, marginRight: 4, alignItems: "center" },
	headerBtn: { padding: 4 },
	headerBtnText: { fontSize: 14, fontWeight: "600" },
	backlinks: {
		borderTopWidth: 1,
		borderBottomWidth: 1,
		marginHorizontal: 20,
		paddingVertical: 8,
		marginBottom: 8,
	},
	backlinksLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	backlinkItem: { fontSize: 13, fontWeight: "500", paddingVertical: 2 },
	docsSection: {
		borderBottomWidth: 1,
		marginHorizontal: 20,
		paddingBottom: 8,
		marginBottom: 8,
	},
	docsLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	docRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 6,
		borderBottomWidth: 0.5,
	},
	docName: { fontSize: 13, fontWeight: "500", flex: 1 },
	docSize: { fontSize: 12 },
	saveIndicator: {
		position: "absolute",
		bottom: 16,
		right: 16,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	saveText: { fontSize: 12, fontWeight: "500" },
});
