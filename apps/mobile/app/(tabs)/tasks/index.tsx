import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskListView } from "@/components/tasks/TaskListView";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useTasksQuery, useUpdateTask } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";
import { useWorkspaceStore } from "@/stores/workspace";

type ViewMode = "list" | "kanban";
type SortBy = "priority" | "due_date" | "created_at";
type FilterStatus = "all" | "todo" | "in_progress" | "done";

export default function TasksScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

	const [viewMode, setViewMode] = useState<ViewMode>("list");
	const [sortBy, setSortBy] = useState<SortBy>("priority");
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [showDetail, setShowDetail] = useState(false);
	const [showQuickAdd, setShowQuickAdd] = useState(false);

	const { data: tasks, isLoading } = useTasksQuery({
		workspaceId: workspaceId || "",
		status: filterStatus === "all" ? undefined : filterStatus,
		sort: sortBy,
		order: sortBy === "priority" ? "asc" : "desc",
	});

	const updateTask = useUpdateTask();

	const handlePressTask = useCallback((task: Task) => {
		setSelectedTaskId(task.id);
		setShowDetail(true);
	}, []);

	const handleToggleStatus = useCallback(
		(task: Task) => {
			const nextStatus: Record<string, string> = {
				todo: "in_progress",
				in_progress: "done",
				done: "todo",
			};
			updateTask.mutate({ id: task.id, status: nextStatus[task.status] });
		},
		[updateTask],
	);

	// Placeholder when no workspace is set
	if (!workspaceId) {
		return (
			<>
				<Stack.Screen options={{ title: "Tasks" }} />
				<View style={[styles.center, { backgroundColor: colors.background }]}>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>No workspace selected</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
						Sign in to see your tasks
					</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: "Tasks",
					headerRight: () => (
						<View style={styles.headerActions}>
							{/* Sort toggle */}
							<Pressable
								style={[styles.headerChip, { borderColor: colors.border }]}
								onPress={() => {
									const next: Record<SortBy, SortBy> = {
										priority: "due_date",
										due_date: "created_at",
										created_at: "priority",
									};
									setSortBy(next[sortBy]);
								}}
							>
								<Text style={[styles.headerChipText, { color: colors.textSecondary }]}>
									{sortBy === "priority" ? "Priority" : sortBy === "due_date" ? "Due" : "Recent"}
								</Text>
							</Pressable>

							{/* View toggle */}
							<Pressable
								style={[styles.headerChip, { borderColor: colors.border }]}
								onPress={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
							>
								<Text style={[styles.headerChipText, { color: colors.textSecondary }]}>
									{viewMode === "list" ? "☰" : "▦"}
								</Text>
							</Pressable>
						</View>
					),
				}}
			/>

			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Filter chips */}
				<View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
					{(["all", "todo", "in_progress", "done"] as FilterStatus[]).map((status) => (
						<Pressable
							key={status}
							style={[
								styles.filterChip,
								{
									backgroundColor: filterStatus === status ? colors.tint + "15" : "transparent",
									borderColor: filterStatus === status ? colors.tint : colors.border,
								},
							]}
							onPress={() => setFilterStatus(status)}
						>
							<Text
								style={[
									styles.filterChipText,
									{
										color: filterStatus === status ? colors.tint : colors.textSecondary,
									},
								]}
							>
								{status === "all"
									? "All"
									: status === "todo"
										? "To Do"
										: status === "in_progress"
											? "Active"
											: "Done"}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Content */}
				{isLoading ? (
					<View style={styles.center}>
						<ActivityIndicator color={colors.tint} />
					</View>
				) : viewMode === "list" ? (
					<TaskListView
						tasks={tasks || []}
						onPressTask={handlePressTask}
						onToggleStatus={handleToggleStatus}
					/>
				) : (
					<KanbanBoard
						tasks={(tasks || []).filter((t) => !t.parentTaskId)}
						onPressTask={handlePressTask}
						onToggleStatus={handleToggleStatus}
					/>
				)}

				{/* FAB */}
				<Pressable
					style={[styles.fab, { backgroundColor: colors.tint }]}
					onPress={() => setShowQuickAdd(true)}
				>
					<Text style={styles.fabIcon}>+</Text>
				</Pressable>
			</View>

			{/* Modals */}
			<TaskDetailSheet
				taskId={selectedTaskId}
				workspaceId={workspaceId}
				visible={showDetail}
				onClose={() => {
					setShowDetail(false);
					setSelectedTaskId(null);
				}}
			/>

			<QuickAddTask
				visible={showQuickAdd}
				workspaceId={workspaceId}
				onClose={() => setShowQuickAdd(false)}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "700",
	},
	emptySubtitle: {
		fontSize: 14,
		marginTop: 6,
	},
	headerActions: {
		flexDirection: "row",
		gap: 6,
		marginRight: 4,
	},
	headerChip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
	},
	headerChipText: {
		fontSize: 13,
		fontWeight: "600",
	},
	filterBar: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	filterChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
	},
	filterChipText: {
		fontSize: 13,
		fontWeight: "600",
	},
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
	fabIcon: {
		color: "#FFFFFF",
		fontSize: 28,
		fontWeight: "400",
		marginTop: -2,
	},
});
