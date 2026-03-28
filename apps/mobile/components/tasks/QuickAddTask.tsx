import { useState } from "react";
import {
	ActivityIndicator,
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
import { useParseTask } from "@/lib/ai";
import { useCreateTask } from "@/lib/tasks";
import { toast } from "@/components/ui/Toast";
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
	const parseTask = useParseTask();

	const [title, setTitle] = useState("");
	const [priority, setPriority] = useState(4);
	const [dueDate, setDueDate] = useState<string | null>(null);
	const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
	const [aiParsed, setAiParsed] = useState(false);

	const handleCreate = () => {
		if (!title.trim()) return;
		createTask.mutate(
			{
				title: title.trim(),
				priority,
				dueDate: dueDate || undefined,
				recurrenceRule: recurrenceRule || undefined,
				workspaceId,
			},
			{
				onSuccess: () => {
					setTitle("");
					setPriority(4);
					setDueDate(null);
					setRecurrenceRule(null);
					setAiParsed(false);
					onClose();
				},
			},
		);
	};

	const handleAIParse = () => {
		if (!title.trim()) return;
		parseTask.mutate(title.trim(), {
			onSuccess: (data) => {
				setTitle(data.title);
				if (data.priority) setPriority(data.priority);
				if (data.dueDate) setDueDate(data.dueDate);
				if (data.recurrenceRule) setRecurrenceRule(data.recurrenceRule);
				setAiParsed(true);
				toast.success("Parsed with AI");
			},
			onError: () => {
				toast.info("AI parsing unavailable, using raw input");
			},
		});
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
					{/* Natural language input */}
					<TextInput
						style={[styles.titleInput, { color: colors.text }]}
						value={title}
						onChangeText={(t) => { setTitle(t); setAiParsed(false); }}
						placeholder='Try "Buy groceries tomorrow" or "Weekly standup every Monday"'
						placeholderTextColor={colors.textSecondary}
						autoFocus
						multiline
						returnKeyType="done"
						blurOnSubmit
						onSubmitEditing={handleCreate}
					/>

					{/* AI Parse Button */}
					<Pressable
						style={[styles.aiParseBtn, { backgroundColor: aiParsed ? colors.success + "15" : colors.tint + "10", borderColor: aiParsed ? colors.success : colors.tint }]}
						onPress={handleAIParse}
						disabled={parseTask.isPending || !title.trim()}
					>
						{parseTask.isPending ? (
							<ActivityIndicator size="small" color={colors.tint} />
						) : (
							<>
								<Text style={styles.aiIcon}>{aiParsed ? "\u2713" : "\u2728"}</Text>
								<Text style={[styles.aiParseText, { color: aiParsed ? colors.success : colors.tint }]}>
									{aiParsed ? "Parsed" : "Parse with AI"}
								</Text>
							</>
						)}
					</Pressable>

					{/* Parsed info */}
					{aiParsed && (dueDate || recurrenceRule) && (
						<View style={[styles.parsedInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							{dueDate && (
								<View style={styles.parsedRow}>
									<Text style={[styles.parsedLabel, { color: colors.textSecondary }]}>Due</Text>
									<Text style={[styles.parsedValue, { color: colors.text }]}>
										{new Date(dueDate).toLocaleDateString()}
									</Text>
									<Pressable onPress={() => setDueDate(null)}>
										<Text style={{ color: colors.danger, fontSize: 14 }}>{"\u2715"}</Text>
									</Pressable>
								</View>
							)}
							{recurrenceRule && (
								<View style={styles.parsedRow}>
									<Text style={[styles.parsedLabel, { color: colors.textSecondary }]}>Repeats</Text>
									<Text style={[styles.parsedValue, { color: colors.text }]}>{recurrenceRule}</Text>
									<Pressable onPress={() => setRecurrenceRule(null)}>
										<Text style={{ color: colors.danger, fontSize: 14 }}>{"\u2715"}</Text>
									</Pressable>
								</View>
							)}
						</View>
					)}

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
		marginBottom: 12,
		lineHeight: 28,
	},
	aiParseBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 16,
	},
	aiIcon: { fontSize: 16 },
	aiParseText: { fontSize: 14, fontWeight: "600" },
	parsedInfo: {
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 16,
		gap: 8,
	},
	parsedRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	parsedLabel: { fontSize: 12, fontWeight: "700", width: 60 },
	parsedValue: { fontSize: 14, flex: 1 },
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
