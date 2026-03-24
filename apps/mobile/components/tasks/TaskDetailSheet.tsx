import { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateTask, useDeleteTask, useTaskDetailQuery, useUpdateTask } from "@/lib/tasks";
import { PriorityBadge } from "./PriorityBadge";

interface TaskDetailSheetProps {
	taskId: string | null;
	workspaceId: string;
	visible: boolean;
	onClose: () => void;
}

const STATUS_OPTIONS = [
	{ key: "todo" as const, label: "To Do", icon: "○" },
	{ key: "in_progress" as const, label: "In Progress", icon: "◐" },
	{ key: "done" as const, label: "Done", icon: "●" },
];

export function TaskDetailSheet({ taskId, workspaceId, visible, onClose }: TaskDetailSheetProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { data: task } = useTaskDetailQuery(taskId || "");
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();
	const createTask = useCreateTask();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
	const [priority, setPriority] = useState(4);
	const [newSubtask, setNewSubtask] = useState("");

	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description || "");
			setStatus(task.status);
			setPriority(task.priority);
		}
	}, [task]);

	const handleSave = () => {
		if (!taskId) return;
		updateTask.mutate({
			id: taskId,
			title,
			description: description || undefined,
			status,
			priority,
		});
	};

	const handleDelete = () => {
		if (!taskId) return;
		deleteTask.mutate(taskId, { onSuccess: onClose });
	};

	const handleAddSubtask = () => {
		if (!newSubtask.trim() || !taskId) return;
		createTask.mutate(
			{
				title: newSubtask.trim(),
				parentTaskId: taskId,
				workspaceId,
			},
			{ onSuccess: () => setNewSubtask("") },
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={onClose}>
						<Text style={[styles.headerButton, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Task</Text>
					<Pressable onPress={handleSave}>
						<Text style={[styles.headerButton, { color: colors.tint }]}>Save</Text>
					</Pressable>
				</View>

				<ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
					{/* Title */}
					<TextInput
						style={[styles.titleInput, { color: colors.text }]}
						value={title}
						onChangeText={setTitle}
						placeholder="Task title"
						placeholderTextColor={colors.textSecondary}
						multiline
					/>

					{/* Description */}
					<TextInput
						style={[styles.descriptionInput, { color: colors.text, borderColor: colors.border }]}
						value={description}
						onChangeText={setDescription}
						placeholder="Add a description..."
						placeholderTextColor={colors.textSecondary}
						multiline
						numberOfLines={3}
					/>

					{/* Status */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Status</Text>
					<View style={styles.optionRow}>
						{STATUS_OPTIONS.map((opt) => (
							<Pressable
								key={opt.key}
								style={[
									styles.statusChip,
									{
										backgroundColor: status === opt.key ? colors.tint + "15" : colors.surface,
										borderColor: status === opt.key ? colors.tint : colors.border,
									},
								]}
								onPress={() => setStatus(opt.key)}
							>
								<Text style={styles.statusChipIcon}>{opt.icon}</Text>
								<Text
									style={[
										styles.statusChipText,
										{ color: status === opt.key ? colors.tint : colors.text },
									]}
								>
									{opt.label}
								</Text>
							</Pressable>
						))}
					</View>

					{/* Priority */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Priority</Text>
					<View style={styles.optionRow}>
						{[1, 2, 3, 4].map((p) => (
							<Pressable
								key={p}
								style={[
									styles.priorityChip,
									{
										backgroundColor: priority === p ? colors.tint + "15" : colors.surface,
										borderColor: priority === p ? colors.tint : colors.border,
									},
								]}
								onPress={() => setPriority(p)}
							>
								<PriorityBadge priority={p} />
							</Pressable>
						))}
					</View>

					{/* Labels */}
					{task?.labels && task.labels.length > 0 && (
						<>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Labels</Text>
							<View style={styles.optionRow}>
								{task.labels.map((label) => (
									<View
										key={label.id}
										style={[
											styles.labelChip,
											{ backgroundColor: label.color + "20", borderColor: label.color + "40" },
										]}
									>
										<Text style={[styles.labelText, { color: label.color }]}>{label.name}</Text>
									</View>
								))}
							</View>
						</>
					)}

					{/* Subtasks */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subtasks</Text>
					{task?.subtaskList?.map((sub) => (
						<View key={sub.id} style={[styles.subtaskItem, { borderColor: colors.border }]}>
							<Text
								style={[
									styles.subtaskIcon,
									{ color: sub.status === "done" ? colors.success : colors.textSecondary },
								]}
							>
								{sub.status === "done" ? "●" : "○"}
							</Text>
							<Text
								style={[
									styles.subtaskTitle,
									{ color: colors.text },
									sub.status === "done" && {
										textDecorationLine: "line-through",
										color: colors.textSecondary,
									},
								]}
							>
								{sub.title}
							</Text>
						</View>
					))}

					{/* Add subtask */}
					<View style={[styles.addSubtask, { borderColor: colors.border }]}>
						<TextInput
							style={[styles.addSubtaskInput, { color: colors.text }]}
							value={newSubtask}
							onChangeText={setNewSubtask}
							placeholder="Add subtask..."
							placeholderTextColor={colors.textSecondary}
							onSubmitEditing={handleAddSubtask}
							returnKeyType="done"
						/>
						<Pressable onPress={handleAddSubtask}>
							<Text style={[styles.addButton, { color: colors.tint }]}>Add</Text>
						</Pressable>
					</View>

					{/* Delete */}
					<Pressable
						style={[styles.deleteButton, { borderColor: colors.danger }]}
						onPress={handleDelete}
					>
						<Text style={[styles.deleteText, { color: colors.danger }]}>Delete Task</Text>
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerButton: {
		fontSize: 16,
		fontWeight: "500",
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
	},
	body: {
		flex: 1,
		padding: 20,
	},
	titleInput: {
		fontSize: 22,
		fontWeight: "700",
		marginBottom: 12,
	},
	descriptionInput: {
		fontSize: 15,
		lineHeight: 22,
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginBottom: 20,
		minHeight: 80,
		textAlignVertical: "top",
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
		marginTop: 4,
	},
	optionRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 20,
	},
	statusChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		gap: 6,
	},
	statusChipIcon: {
		fontSize: 14,
	},
	statusChipText: {
		fontSize: 13,
		fontWeight: "600",
	},
	priorityChip: {
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	labelChip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
	},
	labelText: {
		fontSize: 13,
		fontWeight: "600",
	},
	subtaskItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		borderBottomWidth: 1,
		gap: 10,
	},
	subtaskIcon: {
		fontSize: 16,
	},
	subtaskTitle: {
		fontSize: 14,
		flex: 1,
	},
	addSubtask: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 10,
		borderStyle: "dashed",
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginTop: 8,
		marginBottom: 24,
	},
	addSubtaskInput: {
		flex: 1,
		fontSize: 14,
	},
	addButton: {
		fontSize: 14,
		fontWeight: "600",
	},
	deleteButton: {
		alignItems: "center",
		paddingVertical: 14,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 40,
	},
	deleteText: {
		fontSize: 15,
		fontWeight: "600",
	},
});
