import { Stack, router } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { NoteCard } from "@/components/notes/NoteCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateNote, useFoldersQuery, useNotesQuery } from "@/lib/notes";
import type { Note } from "@/lib/notes";
import { useWorkspaceStore } from "@/stores/workspace";

export default function NotesScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

	const [search, setSearch] = useState("");
	const [activeFolderId, setActiveFolderId] = useState<string | undefined>();

	const { data: notes, isLoading } = useNotesQuery({
		workspaceId: workspaceId || "",
		folderId: activeFolderId,
		search: search || undefined,
	});

	const { data: folders } = useFoldersQuery(workspaceId || "");
	const createNote = useCreateNote();

	const handlePressNote = useCallback((note: Note) => {
		router.push(`/(tabs)/notes/${note.id}`);
	}, []);

	const handleCreateNote = () => {
		if (!workspaceId) return;
		createNote.mutate(
			{
				title: "Untitled",
				contentBlocks: [{ id: crypto.randomUUID(), type: "text", content: "" }],
				folderId: activeFolderId,
				workspaceId,
			},
			{
				onSuccess: (note) => router.push(`/(tabs)/notes/${note.id}`),
			},
		);
	};

	if (!workspaceId) {
		return (
			<>
				<Stack.Screen options={{ title: "Notes" }} />
				<View style={[styles.center, { backgroundColor: colors.background }]}>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>No workspace</Text>
				</View>
			</>
		);
	}

	// Separate pinned notes
	const pinnedNotes = notes?.filter((n) => n.isPinned) || [];
	const regularNotes = notes?.filter((n) => !n.isPinned) || [];

	return (
		<>
			<Stack.Screen options={{ title: "Notes" }} />

			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Search bar */}
				<View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
					<TextInput
						style={[
							styles.searchInput,
							{ color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
						]}
						value={search}
						onChangeText={setSearch}
						placeholder="Search notes..."
						placeholderTextColor={colors.textSecondary}
					/>
				</View>

				{/* Folder chips */}
				{folders && folders.length > 0 && (
					<View style={[styles.folderBar, { borderBottomColor: colors.border }]}>
						<Pressable
							style={[
								styles.folderChip,
								{
									backgroundColor: !activeFolderId ? colors.tint + "15" : "transparent",
									borderColor: !activeFolderId ? colors.tint : colors.border,
								},
							]}
							onPress={() => setActiveFolderId(undefined)}
						>
							<Text
								style={[
									styles.folderChipText,
									{ color: !activeFolderId ? colors.tint : colors.textSecondary },
								]}
							>
								All
							</Text>
						</Pressable>
						{folders.map((folder) => (
							<Pressable
								key={folder.id}
								style={[
									styles.folderChip,
									{
										backgroundColor:
											activeFolderId === folder.id ? colors.tint + "15" : "transparent",
										borderColor: activeFolderId === folder.id ? colors.tint : colors.border,
									},
								]}
								onPress={() =>
									setActiveFolderId(activeFolderId === folder.id ? undefined : folder.id)
								}
							>
								<Text
									style={[
										styles.folderChipText,
										{ color: activeFolderId === folder.id ? colors.tint : colors.textSecondary },
									]}
								>
									{folder.name}
								</Text>
							</Pressable>
						))}
					</View>
				)}

				{/* Notes list */}
				{isLoading ? (
					<View style={styles.center}>
						<ActivityIndicator color={colors.tint} />
					</View>
				) : (
					<FlatList
						data={[...pinnedNotes, ...regularNotes]}
						keyExtractor={(item) => item.id}
						renderItem={({ item, index }) => (
							<Animated.View entering={FadeIn.duration(200).delay(index * 30)}>
								{index === 0 && pinnedNotes.length > 0 && (
									<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pinned</Text>
								)}
								{index === pinnedNotes.length &&
									pinnedNotes.length > 0 &&
									regularNotes.length > 0 && (
										<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
											Notes
										</Text>
									)}
								<NoteCard note={item} onPress={handlePressNote} />
							</Animated.View>
						)}
						contentContainerStyle={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Text style={[styles.emptyTitle, { color: colors.text }]}>No notes yet</Text>
								<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
									Tap + to create your first note
								</Text>
							</View>
						}
					/>
				)}

				{/* FAB */}
				<Pressable
					style={[styles.fab, { backgroundColor: colors.tint }]}
					onPress={handleCreateNote}
				>
					<Text style={styles.fabIcon}>+</Text>
				</Pressable>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, alignItems: "center", justifyContent: "center" },
	searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
	searchInput: {
		fontSize: 15,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	folderBar: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	folderChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
	folderChipText: { fontSize: 13, fontWeight: "600" },
	sectionLabel: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
		marginTop: 4,
	},
	list: { padding: 16, paddingBottom: 100 },
	emptyContainer: { alignItems: "center", paddingTop: 100 },
	emptyTitle: { fontSize: 18, fontWeight: "700" },
	emptySubtitle: { fontSize: 14, marginTop: 6 },
	fab: {
		position: "absolute",
		right: 20,
		bottom: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	fabIcon: { color: "#FFFFFF", fontSize: 28, fontWeight: "400", marginTop: -2 },
});
