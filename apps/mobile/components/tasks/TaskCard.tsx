import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { PriorityBadge } from "./PriorityBadge";
import type { Task } from "@/lib/tasks";

interface TaskCardProps {
	task: Task;
	onPress: (task: Task) => void;
	onToggleStatus: (task: Task) => void;
}

const STATUS_ICONS: Record<string, string> = {
	todo: "○",
	in_progress: "◐",
	done: "●",
};

export function TaskCard({ task, onPress, onToggleStatus }: TaskCardProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const isDone = task.status === "done";
	const hasSubtasks = task.subtasks.total > 0;
	const subtaskProgress = hasSubtasks
		? Math.round((task.subtasks.done / task.subtasks.total) * 100)
		: 0;

	return (
		<Pressable
			style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			onPress={() => onPress(task)}
		>
			<View style={styles.row}>
				<Pressable style={styles.statusButton} onPress={() => onToggleStatus(task)}>
					<Text
						style={[
							styles.statusIcon,
							{ color: isDone ? colors.success : colors.textSecondary },
						]}
					>
						{STATUS_ICONS[task.status]}
					</Text>
				</Pressable>

				<View style={styles.content}>
					<Text
						style={[
							styles.title,
							{ color: colors.text },
							isDone && styles.titleDone,
							isDone && { color: colors.textSecondary },
						]}
						numberOfLines={2}
					>
						{task.title}
					</Text>

					<View style={styles.meta}>
						<PriorityBadge priority={task.priority} />

						{task.labels.map((label) => (
							<View
								key={label.id}
								style={[styles.label, { backgroundColor: label.color + "20", borderColor: label.color + "40" }]}
							>
								<Text style={[styles.labelText, { color: label.color }]}>
									{label.name}
								</Text>
							</View>
						))}

						{task.dueDate && (
							<Text style={[styles.dueDate, { color: colors.textSecondary }]}>
								{formatDueDate(task.dueDate)}
							</Text>
						)}
					</View>

					{hasSubtasks && (
						<View style={styles.subtaskRow}>
							<View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
								<View
									style={[
										styles.progressFill,
										{
											backgroundColor: colors.success,
											width: `${subtaskProgress}%`,
										},
									]}
								/>
							</View>
							<Text style={[styles.subtaskText, { color: colors.textSecondary }]}>
								{task.subtasks.done}/{task.subtasks.total}
							</Text>
						</View>
					)}
				</View>
			</View>
		</Pressable>
	);
}

function formatDueDate(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	if (diffDays === -1) return "Yesterday";
	if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
	if (diffDays <= 7) return `${diffDays}d`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 10,
		borderWidth: 1,
		padding: 14,
		marginBottom: 8,
	},
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	statusButton: {
		width: 28,
		height: 28,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
		marginTop: -2,
	},
	statusIcon: {
		fontSize: 20,
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: 15,
		fontWeight: "600",
		lineHeight: 20,
	},
	titleDone: {
		textDecorationLine: "line-through",
	},
	meta: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 8,
	},
	label: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 1,
	},
	labelText: {
		fontSize: 11,
		fontWeight: "600",
	},
	dueDate: {
		fontSize: 12,
		fontWeight: "500",
	},
	subtaskRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 10,
		gap: 8,
	},
	progressTrack: {
		flex: 1,
		height: 4,
		borderRadius: 2,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 2,
	},
	subtaskText: {
		fontSize: 11,
		fontWeight: "600",
	},
});
