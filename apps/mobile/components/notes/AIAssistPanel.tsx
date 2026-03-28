import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { AI_ACTIONS, useAIAssist, type AIAction } from "@/lib/ai";

interface Props {
	visible: boolean;
	onClose: () => void;
	content: string; // current block/selection content
	pageContext?: string; // broader page context
	onInsert: (text: string) => void; // insert AI result into editor
	onReplace: (text: string) => void; // replace current content
}

export function AIAssistPanel({ visible, onClose, content, pageContext, onInsert, onReplace }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const aiAssist = useAIAssist();
	const [result, setResult] = useState<string | null>(null);
	const [writePrompt, setWritePrompt] = useState("");
	const [tone, setTone] = useState("");
	const [language, setLanguage] = useState("");
	const [showOptions, setShowOptions] = useState<AIAction | null>(null);

	const handleAction = (action: AIAction) => {
		if (action === "write" && !writePrompt.trim()) {
			setShowOptions("write");
			return;
		}
		if (action === "change_tone" && !tone.trim()) {
			setShowOptions("change_tone");
			return;
		}
		if (action === "translate" && !language.trim()) {
			setShowOptions("translate");
			return;
		}

		setResult(null);
		aiAssist.mutate(
			{
				action,
				content,
				context: pageContext,
				prompt: writePrompt || undefined,
				tone: tone || undefined,
				language: language || undefined,
			},
			{
				onSuccess: (data) => setResult(data.text),
			},
		);
	};

	const handleReset = () => {
		setResult(null);
		setShowOptions(null);
		setWritePrompt("");
		setTone("");
		setLanguage("");
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={handleClose}>
						<Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<View style={styles.headerCenter}>
						<Text style={styles.headerIcon}>{"\u2728"}</Text>
						<Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
					</View>
					<View style={{ width: 50 }} />
				</View>

				{/* Content Preview */}
				{content && !result && (
					<View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Selected text</Text>
						<Text style={[styles.previewText, { color: colors.text }]} numberOfLines={3}>
							{content}
						</Text>
					</View>
				)}

				{/* Loading */}
				{aiAssist.isPending && (
					<View style={styles.loading}>
						<ActivityIndicator size="large" color={colors.tint} />
						<Text style={[styles.loadingText, { color: colors.textSecondary }]}>
							AI is thinking...
						</Text>
					</View>
				)}

				{/* Result */}
				{result && (
					<View style={styles.resultSection}>
						<ScrollView style={[styles.resultBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<Text style={[styles.resultText, { color: colors.text }]}>{result}</Text>
						</ScrollView>
						<View style={styles.resultActions}>
							<Pressable
								style={[styles.resultBtn, { backgroundColor: colors.tint }]}
								onPress={() => { onReplace(result); handleClose(); }}
							>
								<Text style={styles.resultBtnText}>Replace</Text>
							</Pressable>
							<Pressable
								style={[styles.resultBtn, { backgroundColor: colors.success }]}
								onPress={() => { onInsert(result); handleClose(); }}
							>
								<Text style={styles.resultBtnText}>Insert Below</Text>
							</Pressable>
							<Pressable
								style={[styles.resultBtnOutline, { borderColor: colors.border }]}
								onPress={handleReset}
							>
								<Text style={[styles.resultBtnOutlineText, { color: colors.text }]}>Try Again</Text>
							</Pressable>
						</View>
					</View>
				)}

				{/* Options for write/tone/translate */}
				{showOptions === "write" && !aiAssist.isPending && !result && (
					<View style={styles.optionSection}>
						<Text style={[styles.optionLabel, { color: colors.text }]}>What should I write?</Text>
						<TextInput
							style={[styles.optionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
							placeholder="E.g., A summary of our Q4 goals..."
							placeholderTextColor={colors.textSecondary}
							value={writePrompt}
							onChangeText={setWritePrompt}
							multiline
							autoFocus
						/>
						<Pressable
							style={[styles.optionBtn, { backgroundColor: colors.tint }]}
							onPress={() => handleAction("write")}
						>
							<Text style={styles.optionBtnText}>Generate</Text>
						</Pressable>
					</View>
				)}

				{showOptions === "change_tone" && !aiAssist.isPending && !result && (
					<View style={styles.optionSection}>
						<Text style={[styles.optionLabel, { color: colors.text }]}>Choose a tone</Text>
						<View style={styles.toneRow}>
							{["Professional", "Casual", "Friendly", "Formal", "Concise", "Enthusiastic"].map((t) => (
								<Pressable
									key={t}
									style={[
										styles.toneChip,
										{
											backgroundColor: tone === t.toLowerCase() ? colors.tint + "15" : colors.surface,
											borderColor: tone === t.toLowerCase() ? colors.tint : colors.border,
										},
									]}
									onPress={() => { setTone(t.toLowerCase()); handleAction("change_tone"); }}
								>
									<Text style={[styles.toneChipText, { color: tone === t.toLowerCase() ? colors.tint : colors.text }]}>
										{t}
									</Text>
								</Pressable>
							))}
						</View>
					</View>
				)}

				{showOptions === "translate" && !aiAssist.isPending && !result && (
					<View style={styles.optionSection}>
						<Text style={[styles.optionLabel, { color: colors.text }]}>Translate to</Text>
						<View style={styles.toneRow}>
							{["Spanish", "French", "German", "Japanese", "Chinese", "Korean", "Portuguese", "Italian"].map((l) => (
								<Pressable
									key={l}
									style={[styles.toneChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
									onPress={() => { setLanguage(l); handleAction("translate"); }}
								>
									<Text style={[styles.toneChipText, { color: colors.text }]}>{l}</Text>
								</Pressable>
							))}
						</View>
					</View>
				)}

				{/* Action Grid */}
				{!aiAssist.isPending && !result && !showOptions && (
					<ScrollView style={styles.actionList} contentContainerStyle={styles.actionGrid}>
						{AI_ACTIONS.map((a) => (
							<Pressable
								key={a.action}
								style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
								onPress={() => handleAction(a.action)}
							>
								<Text style={styles.actionIcon}>{a.icon}</Text>
								<Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
								<Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{a.description}</Text>
							</Pressable>
						))}
					</ScrollView>
				)}

				{/* Error */}
				{aiAssist.isError && (
					<View style={styles.error}>
						<Text style={[styles.errorText, { color: colors.danger }]}>
							{aiAssist.error?.message || "AI request failed"}
						</Text>
						<Pressable onPress={handleReset}>
							<Text style={[styles.retryText, { color: colors.tint }]}>Try again</Text>
						</Pressable>
					</View>
				)}
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
	cancelText: { fontSize: 15 },
	headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
	headerIcon: { fontSize: 18 },
	headerTitle: { fontSize: 17, fontWeight: "700" },
	preview: {
		margin: 16,
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
	},
	previewLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
	previewText: { fontSize: 14, lineHeight: 20 },
	loading: { alignItems: "center", paddingTop: 60, gap: 12 },
	loadingText: { fontSize: 14 },
	resultSection: { flex: 1, padding: 16 },
	resultBox: {
		flex: 1,
		padding: 16,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 12,
	},
	resultText: { fontSize: 15, lineHeight: 22 },
	resultActions: { flexDirection: "row", gap: 8 },
	resultBtn: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
	},
	resultBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
	resultBtnOutline: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: "center",
	},
	resultBtnOutlineText: { fontSize: 14, fontWeight: "600" },
	optionSection: { padding: 20 },
	optionLabel: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
	optionInput: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		fontSize: 15,
		minHeight: 80,
		textAlignVertical: "top",
		marginBottom: 12,
	},
	optionBtn: {
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
	},
	optionBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
	toneRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	toneChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	toneChipText: { fontSize: 14, fontWeight: "500" },
	actionList: { flex: 1 },
	actionGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		padding: 12,
		gap: 10,
	},
	actionCard: {
		width: "47%",
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
	},
	actionIcon: { fontSize: 24, marginBottom: 6 },
	actionLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
	actionDesc: { fontSize: 12, lineHeight: 16 },
	error: { alignItems: "center", paddingTop: 40, gap: 8 },
	errorText: { fontSize: 14 },
	retryText: { fontSize: 14, fontWeight: "600" },
});
