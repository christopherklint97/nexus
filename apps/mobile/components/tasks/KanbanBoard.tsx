import { useRef } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/tasks";

const COLUMNS = [
	{ key: "todo" as const, label: "To Do", color: "#94A3B8" },
	{ key: "in_progress" as const, label: "In Progress", color: "#4361EE" },
	{ key: "done" as const, label: "Done", color: "#10B981" },
];

interface KanbanBoardProps {
	tasks: Task[];
	onPressTask: (task: Task) => void;
	onToggleStatus: (task: Task) => void;
}

export function KanbanBoard({ tasks, onPressTask, onToggleStatus }: KanbanBoardProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const tasksByStatus = {
		todo: tasks.filter((t) => t.status === "todo"),
		in_progress: tasks.filter((t) => t.status === "in_progress"),
		done: tasks.filter((t) => t.status === "done"),
	};

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.container}
			pagingEnabled={false}
			snapToAlignment="start"
			decelerationRate="fast"
		>
			{COLUMNS.map((column) => (
				<Animated.View
					key={column.key}
					entering={FadeIn.duration(300)}
					style={[styles.column, { backgroundColor: colors.background }]}
				>
					<View style={styles.columnHeader}>
						<View style={[styles.columnDot, { backgroundColor: column.color }]} />
						<Text style={[styles.columnTitle, { color: colors.text }]}>{column.label}</Text>
						<View style={[styles.countBadge, { backgroundColor: colors.border }]}>
							<Text style={[styles.countText, { color: colors.textSecondary }]}>
								{tasksByStatus[column.key].length}
							</Text>
						</View>
					</View>

					<FlatList
						data={tasksByStatus[column.key]}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<TaskCard
								task={item}
								onPress={onPressTask}
								onToggleStatus={onToggleStatus}
							/>
						)}
						contentContainerStyle={styles.columnContent}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<View style={[styles.emptyState, { borderColor: colors.border }]}>
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
									No tasks
								</Text>
							</View>
						}
					/>
				</Animated.View>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 12,
		paddingTop: 8,
		gap: 12,
	},
	column: {
		width: 300,
		flex: 1,
	},
	columnHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 10,
		gap: 8,
	},
	columnDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	columnTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	countBadge: {
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 8,
	},
	countText: {
		fontSize: 12,
		fontWeight: "600",
	},
	columnContent: {
		paddingHorizontal: 4,
		paddingBottom: 100,
	},
	emptyState: {
		borderWidth: 1,
		borderStyle: "dashed",
		borderRadius: 10,
		padding: 24,
		alignItems: "center",
	},
	emptyText: {
		fontSize: 13,
	},
});
