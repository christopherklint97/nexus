import { useState } from "react";
import {
	FlatList,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	useCommentsQuery,
	useCreateComment,
	useDeleteComment,
	useResolveComment,
	type Comment,
} from "@/lib/collaboration";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
	visible: boolean;
	onClose: () => void;
	pageType: string;
	pageId: string;
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}

export function CommentsPanel({ visible, onClose, pageType, pageId }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) || "";
	const { data: allComments } = useCommentsQuery(pageType, pageId);
	const createComment = useCreateComment();
	const resolveComment = useResolveComment();
	const deleteComment = useDeleteComment();
	const [newComment, setNewComment] = useState("");
	const [replyTo, setReplyTo] = useState<string | null>(null);

	// Separate root comments and replies
	const rootComments = allComments?.filter((c) => !c.parentCommentId) || [];
	const replies = allComments?.filter((c) => c.parentCommentId) || [];

	const getReplies = (parentId: string) => replies.filter((r) => r.parentCommentId === parentId);

	const handleSubmit = () => {
		if (!newComment.trim()) return;
		createComment.mutate(
			{
				content: newComment.trim(),
				pageType,
				pageId,
				parentCommentId: replyTo || undefined,
				workspaceId,
			},
			{
				onSuccess: () => {
					setNewComment("");
					setReplyTo(null);
				},
			},
		);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						Comments ({allComments?.length || 0})
					</Text>
					<Pressable onPress={onClose}>
						<Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
					</Pressable>
				</View>

				{/* Comments List */}
				<FlatList
					data={rootComments}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.list}
					renderItem={({ item }) => (
						<View style={[styles.commentCard, { borderColor: colors.border }]}>
							{/* Comment Header */}
							<View style={styles.commentHeader}>
								<View style={[styles.avatar, { backgroundColor: colors.tint }]}>
									<Text style={styles.avatarText}>
										{(item.author.name || "U").charAt(0).toUpperCase()}
									</Text>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={[styles.authorName, { color: colors.text }]}>
										{item.author.name}
									</Text>
									<Text style={[styles.timeText, { color: colors.textSecondary }]}>
										{timeAgo(item.createdAt)}
									</Text>
								</View>
								{item.isResolved ? (
									<Pressable onPress={() => resolveComment.mutate({ id: item.id, resolve: false })}>
										<Text style={[styles.resolvedBadge, { color: colors.success }]}>
											{"\u2713"} Resolved
										</Text>
									</Pressable>
								) : (
									<Pressable onPress={() => resolveComment.mutate({ id: item.id, resolve: true })}>
										<Text style={[styles.resolveBtn, { color: colors.textSecondary }]}>Resolve</Text>
									</Pressable>
								)}
							</View>

							{/* Comment Body */}
							<Text style={[styles.commentBody, { color: colors.text }]}>{item.content}</Text>

							{/* Actions */}
							<View style={styles.commentActions}>
								<Pressable onPress={() => setReplyTo(item.id)}>
									<Text style={[styles.actionText, { color: colors.tint }]}>Reply</Text>
								</Pressable>
								<Pressable onPress={() => deleteComment.mutate(item.id)}>
									<Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
								</Pressable>
							</View>

							{/* Replies */}
							{getReplies(item.id).map((reply) => (
								<View key={reply.id} style={[styles.replyCard, { borderLeftColor: colors.border }]}>
									<Text style={[styles.replyAuthor, { color: colors.text }]}>
										{reply.author.name}
										<Text style={{ color: colors.textSecondary }}> {timeAgo(reply.createdAt)}</Text>
									</Text>
									<Text style={[styles.replyBody, { color: colors.text }]}>{reply.content}</Text>
								</View>
							))}
						</View>
					)}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
								No comments yet. Start a discussion below.
							</Text>
						</View>
					}
				/>

				{/* Input */}
				<View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
					{replyTo && (
						<View style={styles.replyIndicator}>
							<Text style={[styles.replyIndicatorText, { color: colors.textSecondary }]}>
								Replying to comment...
							</Text>
							<Pressable onPress={() => setReplyTo(null)}>
								<Text style={{ color: colors.danger }}>{"\u2715"}</Text>
							</Pressable>
						</View>
					)}
					<View style={styles.inputRow}>
						<TextInput
							style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
							value={newComment}
							onChangeText={setNewComment}
							placeholder="Add a comment..."
							placeholderTextColor={colors.textSecondary}
							multiline
						/>
						<Pressable
							style={[styles.sendBtn, { backgroundColor: newComment.trim() ? colors.tint : colors.border }]}
							onPress={handleSubmit}
							disabled={!newComment.trim()}
						>
							<Text style={styles.sendBtnText}>{"\u2191"}</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerTitle: { fontSize: 17, fontWeight: "700" },
	doneText: { fontSize: 15, fontWeight: "600" },
	list: { padding: 16, paddingBottom: 100 },
	commentCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
	commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
	avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
	avatarText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
	authorName: { fontSize: 13, fontWeight: "700" },
	timeText: { fontSize: 11 },
	resolvedBadge: { fontSize: 12, fontWeight: "600" },
	resolveBtn: { fontSize: 12, fontWeight: "500" },
	commentBody: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
	commentActions: { flexDirection: "row", gap: 16 },
	actionText: { fontSize: 13, fontWeight: "500" },
	replyCard: { borderLeftWidth: 2, paddingLeft: 10, marginTop: 8, marginLeft: 8 },
	replyAuthor: { fontSize: 12, fontWeight: "600" },
	replyBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
	empty: { alignItems: "center", paddingTop: 40 },
	emptyText: { fontSize: 14 },
	inputBar: { padding: 12, borderTopWidth: 1 },
	replyIndicator: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
	replyIndicatorText: { fontSize: 12 },
	inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
	input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
	sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	sendBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
