import { useState } from "react";
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
import { EVENT_COLORS, useCreateEvent } from "@/lib/calendar";

interface CreateEventSheetProps {
	visible: boolean;
	initialDate?: Date;
	onClose: () => void;
}

export function CreateEventSheet({ visible, initialDate, onClose }: CreateEventSheetProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const createEvent = useCreateEvent();

	const defaultStart = initialDate || new Date();
	const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState(formatDateInput(defaultStart));
	const [startTime, setStartTime] = useState(formatTimeInput(defaultStart));
	const [endDate, setEndDate] = useState(formatDateInput(defaultEnd));
	const [endTime, setEndTime] = useState(formatTimeInput(defaultEnd));
	const [selectedColor, setSelectedColor] = useState<string | undefined>();

	const handleCreate = () => {
		if (!title.trim()) return;

		const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
		const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString();

		createEvent.mutate(
			{
				summary: title.trim(),
				description: description.trim() || undefined,
				startDateTime,
				endDateTime,
				colorId: selectedColor,
			},
			{
				onSuccess: () => {
					setTitle("");
					setDescription("");
					setSelectedColor(undefined);
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
						<Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>New Event</Text>
					<Pressable onPress={handleCreate}>
						<Text
							style={[
								styles.headerBtn,
								{ color: title.trim() ? colors.tint : colors.textSecondary },
							]}
						>
							Create
						</Text>
					</Pressable>
				</View>

				<ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
					<TextInput
						style={[styles.titleInput, { color: colors.text }]}
						value={title}
						onChangeText={setTitle}
						placeholder="Event title"
						placeholderTextColor={colors.textSecondary}
						autoFocus
					/>

					<TextInput
						style={[styles.descInput, { color: colors.text, borderColor: colors.border }]}
						value={description}
						onChangeText={setDescription}
						placeholder="Add description..."
						placeholderTextColor={colors.textSecondary}
						multiline
					/>

					{/* Start */}
					<Text style={[styles.label, { color: colors.textSecondary }]}>Start</Text>
					<View style={styles.dateRow}>
						<TextInput
							style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
							value={startDate}
							onChangeText={setStartDate}
							placeholder="YYYY-MM-DD"
							placeholderTextColor={colors.textSecondary}
						/>
						<TextInput
							style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
							value={startTime}
							onChangeText={setStartTime}
							placeholder="HH:MM"
							placeholderTextColor={colors.textSecondary}
						/>
					</View>

					{/* End */}
					<Text style={[styles.label, { color: colors.textSecondary }]}>End</Text>
					<View style={styles.dateRow}>
						<TextInput
							style={[styles.dateInput, { color: colors.text, borderColor: colors.border }]}
							value={endDate}
							onChangeText={setEndDate}
							placeholder="YYYY-MM-DD"
							placeholderTextColor={colors.textSecondary}
						/>
						<TextInput
							style={[styles.timeInput, { color: colors.text, borderColor: colors.border }]}
							value={endTime}
							onChangeText={setEndTime}
							placeholder="HH:MM"
							placeholderTextColor={colors.textSecondary}
						/>
					</View>

					{/* Color */}
					<Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
					<View style={styles.colorRow}>
						{Object.entries(EVENT_COLORS).map(([id, color]) => (
							<Pressable
								key={id}
								style={[
									styles.colorDot,
									{ backgroundColor: color },
									selectedColor === id && styles.colorDotSelected,
								]}
								onPress={() => setSelectedColor(selectedColor === id ? undefined : id)}
							/>
						))}
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	);
}

function formatDateInput(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTimeInput(d: Date): string {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerBtn: { fontSize: 16, fontWeight: "500" },
	headerTitle: { fontSize: 16, fontWeight: "700" },
	body: { padding: 20 },
	titleInput: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
	descInput: {
		fontSize: 15,
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginBottom: 20,
		minHeight: 60,
		textAlignVertical: "top",
	},
	label: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 6,
		marginTop: 4,
	},
	dateRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
	dateInput: { flex: 2, fontSize: 15, borderWidth: 1, borderRadius: 10, padding: 12 },
	timeInput: { flex: 1, fontSize: 15, borderWidth: 1, borderRadius: 10, padding: 12 },
	colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
	colorDot: { width: 28, height: 28, borderRadius: 14 },
	colorDotSelected: {
		borderWidth: 3,
		borderColor: "#FFFFFF",
		shadowColor: "#000",
		shadowOpacity: 0.3,
		shadowRadius: 3,
		elevation: 3,
	},
});
