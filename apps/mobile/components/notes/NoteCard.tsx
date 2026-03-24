import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { Note } from "@/lib/notes";
import { parseBlocks } from "@/lib/notes";

interface NoteCardProps {
	note: Note;
	onPress: (note: Note) => void;
}

export function NoteCard({ note, onPress }: NoteCardProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const blocks = parseBlocks(note.contentBlocksJson);
	const preview = blocks
		.filter((b) => b.content)
		.map((b) => b.content)
		.join(" ")
		.slice(0, 120);

	const timeAgo = formatTimeAgo(note.updatedAt);

	return (
		<Pressable
			style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			onPress={() => onPress(note)}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
					{note.title}
				</Text>
				{note.isPinned && <Text style={styles.pin}>📌</Text>}
			</View>
			{preview ? (
				<Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
					{preview}
				</Text>
			) : null}
			<Text style={[styles.time, { color: colors.textSecondary }]}>{timeAgo}</Text>
		</Pressable>
	);
}

function formatTimeAgo(dateStr: string): string {
	const now = Date.now();
	const diff = now - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 10,
		borderWidth: 1,
		padding: 14,
		marginBottom: 8,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: 15,
		fontWeight: "700",
		flex: 1,
	},
	pin: { fontSize: 12, marginLeft: 6 },
	preview: {
		fontSize: 13,
		lineHeight: 18,
		marginTop: 6,
	},
	time: {
		fontSize: 11,
		marginTop: 8,
	},
});
