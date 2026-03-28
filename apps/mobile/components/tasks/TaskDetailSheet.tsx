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
import { toast } from "@/components/ui/Toast";
import { PriorityBadge } from "./PriorityBadge";

const RECURRENCE_PRESETS = [
	{ label: "None", value: "" },
	{ label: "Daily", value: "FREQ=DAILY;INTERVAL=1" },
	{ label: "Weekdays", value: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR" },
	{ label: "Weekly", value: "FREQ=WEEKLY;INTERVAL=1" },
	{ label: "Biweekly", value: "FREQ=WEEKLY;INTERVAL=2" },
	{ label: "Monthly", value: "FREQ=MONTHLY;INTERVAL=1" },
	{ label: "Yearly", value: "FREQ=YEARLY;INTERVAL=1" },
] as const;

function getRecurrenceLabel(rule: string | null): string {
	if (!rule) return "None";
	const preset = RECURRENCE_PRESETS.find((p) => p.value === rule);
	return preset?.label || "Custom";
}

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
	const [dueDate, setDueDate] = useState("");
	const [recurrenceRule, setRecurrenceRule] = useState("");
	const [showRecurrence, setShowRecurrence] = useState(false);
	const [newSubtask, setNewSubtask] = useState("");

	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description || "");
			setStatus(task.status);
			setPriority(task.priority);
			setDueDate(task.dueDate || "");
			setRecurrenceRule(task.recurrenceRule || "");
		}
	}, [task]);

	const handleSave = () => {
		if (!taskId) return;
		updateTask.mutate(
			{
				id: taskId,
				title,
				description: description || undefined,
				status,
				priority,
				dueDate: dueDate || undefined,
				recurrenceRule: recurrenceRule || undefined,
			},
			{
				onSuccess: (data: any) => {
					if (data?.nextRecurrence) {
						toast.info(`Next occurrence created for ${new Date(data.nextRecurrence.dueDate).toLocaleDateString()}`);
					}
				},
			},
		);
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

					{/* Due Date */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Due Date</Text>
					<TextInput
						style={[
							styles.dateInput,
							{
								color: colors.text,
								borderColor: colors.border,
								backgroundColor: colors.surface,
							},
						]}
						value={dueDate ? new Date(dueDate).toLocaleDateString() : ""}
						placeholder="No due date (tap to set YYYY-MM-DD)"
						placeholderTextColor={colors.textSecondary}
						onChangeText={(text) => {
							// Accept ISO format or try to parse
							if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
								setDueDate(new Date(text).toISOString());
							} else if (text === "") {
								setDueDate("");
							}
						}}
						keyboardType="default"
					/>
					{dueDate ? (
						<Pressable onPress={() => setDueDate("")}>
							<Text style={[styles.clearDateText, { color: colors.danger }]}>Clear due date</Text>
						</Pressable>
					) : null}

					{/* Recurrence */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Repeat</Text>
					<Pressable
						style={[styles.recurrenceBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
						onPress={() => setShowRecurrence(!showRecurrence)}
					>
						<Text style={[styles.recurrenceLabel, { color: recurrenceRule ? colors.tint : colors.textSecondary }]}>
							{recurrenceRule ? "\uD83D\uDD01 " : ""}{getRecurrenceLabel(recurrenceRule || null)}
						</Text>
					</Pressable>
					{showRecurrence && (
						<View style={styles.recurrenceOptions}>
							{RECURRENCE_PRESETS.map((preset) => (
								<Pressable
									key={preset.value}
									style={[
										styles.recurrenceChip,
										{
											backgroundColor: recurrenceRule === preset.value ? colors.tint + "15" : colors.surface,
											borderColor: recurrenceRule === preset.value ? colors.tint : colors.border,
										},
									]}
									onPress={() => {
										setRecurrenceRule(preset.value);
										setShowRecurrence(false);
									}}
								>
									<Text
										style={[
											styles.recurrenceChipText,
											{ color: recurrenceRule === preset.value ? colors.tint : colors.text },
										]}
									>
										{preset.label}
									</Text>
								</Pressable>
							))}
						</View>
					)}

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
	dateInput: {
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		paddingHorizontal: 12,
		fontSize: 15,
		marginBottom: 4,
	},
	clearDateText: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 16,
		marginTop: 4,
	},
	recurrenceBtn: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 8,
	},
	recurrenceLabel: {
		fontSize: 14,
		fontWeight: "500",
	},
	recurrenceOptions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginBottom: 20,
	},
	recurrenceChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
	},
	recurrenceChipText: {
		fontSize: 13,
		fontWeight: "500",
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
