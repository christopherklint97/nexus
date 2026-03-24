import { useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateTask } from "@/lib/tasks";
import { PriorityBadge } from "./PriorityBadge";

interface QuickAddTaskProps {
	visible: boolean;
	workspaceId: string;
	onClose: () => void;
}

export function QuickAddTask({ visible, workspaceId, onClose }: QuickAddTaskProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const createTask = useCreateTask();

	const [title, setTitle] = useState("");
	const [priority, setPriority] = useState(4);

	const handleCreate = () => {
		if (!title.trim()) return;
		createTask.mutate(
			{
				title: title.trim(),
				priority,
				workspaceId,
			},
			{
				onSuccess: () => {
					setTitle("");
					setPriority(4);
					onClose();
				},
			},
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
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={onClose}>
						<Text style={[styles.headerButton, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>New Task</Text>
					<Pressable onPress={handleCreate}>
						<Text
							style={[
								styles.headerButton,
								{ color: title.trim() ? colors.tint : colors.textSecondary },
							]}
						>
							Create
						</Text>
					</Pressable>
				</View>

				<View style={styles.body}>
					<TextInput
						style={[styles.titleInput, { color: colors.text }]}
						value={title}
						onChangeText={setTitle}
						placeholder="What needs to be done?"
						placeholderTextColor={colors.textSecondary}
						autoFocus
						multiline
						returnKeyType="done"
						blurOnSubmit
						onSubmitEditing={handleCreate}
					/>

					<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Priority</Text>
					<View style={styles.priorityRow}>
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
				</View>
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
		padding: 20,
	},
	titleInput: {
		fontSize: 20,
		fontWeight: "600",
		marginBottom: 24,
		lineHeight: 28,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	priorityRow: {
		flexDirection: "row",
		gap: 8,
	},
	priorityChip: {
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
});
