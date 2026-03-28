import { useState } from "react";
import {
	Alert,
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
import { useCreateRecipe, type RecipeIngredient } from "@/lib/recipes";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
	visible: boolean;
	onClose: () => void;
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function CreateRecipeSheet({ visible, onClose }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const createRecipe = useCreateRecipe();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">("");
	const [cuisine, setCuisine] = useState("");
	const [servings, setServings] = useState("");
	const [prepTime, setPrepTime] = useState("");
	const [cookTime, setCookTime] = useState("");
	const [tags, setTags] = useState("");
	const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
	const [instructions, setInstructions] = useState<string[]>([]);

	// Ingredient input
	const [ingQty, setIngQty] = useState("");
	const [ingUnit, setIngUnit] = useState("");
	const [ingItem, setIngItem] = useState("");

	// Instruction input
	const [newStep, setNewStep] = useState("");

	const reset = () => {
		setTitle("");
		setDescription("");
		setDifficulty("");
		setCuisine("");
		setServings("");
		setPrepTime("");
		setCookTime("");
		setTags("");
		setIngredients([]);
		setInstructions([]);
		setIngQty("");
		setIngUnit("");
		setIngItem("");
		setNewStep("");
	};

	const addIngredient = () => {
		if (!ingItem.trim()) return;
		setIngredients([
			...ingredients,
			{ quantity: Number(ingQty) || 0, unit: ingUnit.trim(), item: ingItem.trim() },
		]);
		setIngQty("");
		setIngUnit("");
		setIngItem("");
	};

	const addStep = () => {
		if (!newStep.trim()) return;
		setInstructions([...instructions, newStep.trim()]);
		setNewStep("");
	};

	const handleSave = () => {
		if (!title.trim()) {
			Alert.alert("Required", "Please enter a recipe title.");
			return;
		}
		if (!workspaceId) return;

		createRecipe.mutate(
			{
				title: title.trim(),
				description: description.trim() || undefined,
				difficulty: difficulty || undefined,
				cuisine: cuisine.trim() || undefined,
				servings: Number(servings) || undefined,
				prepTime: Number(prepTime) || undefined,
				cookTime: Number(cookTime) || undefined,
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				ingredients: ingredients.length > 0 ? ingredients : undefined,
				instructions: instructions.length > 0 ? instructions : undefined,
				workspaceId,
			},
			{
				onSuccess: () => {
					reset();
					onClose();
				},
			},
		);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={() => { reset(); onClose(); }}>
						<Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>New Recipe</Text>
					<Pressable onPress={handleSave}>
						<Text style={[styles.saveText, { color: colors.tint }]}>Save</Text>
					</Pressable>
				</View>

				<ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
					{/* Basic Info */}
					<TextInput
						style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
						placeholder="Recipe title *"
						placeholderTextColor={colors.textSecondary}
						value={title}
						onChangeText={setTitle}
					/>
					<TextInput
						style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
						placeholder="Description"
						placeholderTextColor={colors.textSecondary}
						value={description}
						onChangeText={setDescription}
						multiline
					/>

					{/* Meta Row */}
					<View style={styles.row}>
						<TextInput
							style={[styles.input, styles.flex1, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Cuisine"
							placeholderTextColor={colors.textSecondary}
							value={cuisine}
							onChangeText={setCuisine}
						/>
						<TextInput
							style={[styles.input, styles.small, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Servings"
							placeholderTextColor={colors.textSecondary}
							value={servings}
							onChangeText={setServings}
							keyboardType="number-pad"
						/>
					</View>

					{/* Difficulty */}
					<View style={styles.row}>
						{DIFFICULTIES.map((d) => (
							<Pressable
								key={d}
								style={[
									styles.diffChip,
									{
										backgroundColor: difficulty === d ? colors.tint : colors.surface,
										borderColor: difficulty === d ? colors.tint : colors.border,
									},
								]}
								onPress={() => setDifficulty(difficulty === d ? "" : d)}
							>
								<Text style={{ color: difficulty === d ? "#FFF" : colors.text, fontSize: 13, fontWeight: "500" }}>
									{d.charAt(0).toUpperCase() + d.slice(1)}
								</Text>
							</Pressable>
						))}
					</View>

					{/* Time */}
					<View style={styles.row}>
						<TextInput
							style={[styles.input, styles.flex1, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Prep (min)"
							placeholderTextColor={colors.textSecondary}
							value={prepTime}
							onChangeText={setPrepTime}
							keyboardType="number-pad"
						/>
						<TextInput
							style={[styles.input, styles.flex1, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Cook (min)"
							placeholderTextColor={colors.textSecondary}
							value={cookTime}
							onChangeText={setCookTime}
							keyboardType="number-pad"
						/>
					</View>

					{/* Tags */}
					<TextInput
						style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
						placeholder="Tags (comma separated)"
						placeholderTextColor={colors.textSecondary}
						value={tags}
						onChangeText={setTags}
					/>

					{/* Ingredients */}
					<Text style={[styles.sectionLabel, { color: colors.text }]}>Ingredients</Text>
					{ingredients.map((ing, i) => (
						<View key={`ing-${i}`} style={[styles.listItem, { borderBottomColor: colors.border }]}>
							<Text style={[styles.listText, { color: colors.text }]}>
								{ing.quantity} {ing.unit} {ing.item}
							</Text>
							<Pressable
								onPress={() => setIngredients(ingredients.filter((_, j) => j !== i))}
							>
								<Text style={{ color: colors.danger, fontSize: 16 }}>x</Text>
							</Pressable>
						</View>
					))}
					<View style={styles.addRow}>
						<TextInput
							style={[styles.input, { width: 50, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Qty"
							placeholderTextColor={colors.textSecondary}
							value={ingQty}
							onChangeText={setIngQty}
							keyboardType="decimal-pad"
						/>
						<TextInput
							style={[styles.input, { width: 60, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Unit"
							placeholderTextColor={colors.textSecondary}
							value={ingUnit}
							onChangeText={setIngUnit}
						/>
						<TextInput
							style={[styles.input, styles.flex1, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Ingredient"
							placeholderTextColor={colors.textSecondary}
							value={ingItem}
							onChangeText={setIngItem}
							onSubmitEditing={addIngredient}
						/>
						<Pressable style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addIngredient}>
							<Text style={{ color: "#FFF", fontWeight: "600" }}>+</Text>
						</Pressable>
					</View>

					{/* Instructions */}
					<Text style={[styles.sectionLabel, { color: colors.text }]}>Instructions</Text>
					{instructions.map((step, i) => (
						<View key={`step-${i}`} style={[styles.listItem, { borderBottomColor: colors.border }]}>
							<Text style={[styles.listText, { color: colors.text }]}>
								{i + 1}. {step}
							</Text>
							<Pressable
								onPress={() => setInstructions(instructions.filter((_, j) => j !== i))}
							>
								<Text style={{ color: colors.danger, fontSize: 16 }}>x</Text>
							</Pressable>
						</View>
					))}
					<View style={styles.addRow}>
						<TextInput
							style={[styles.input, styles.flex1, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
							placeholder="Add a step..."
							placeholderTextColor={colors.textSecondary}
							value={newStep}
							onChangeText={setNewStep}
							onSubmitEditing={addStep}
						/>
						<Pressable style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addStep}>
							<Text style={{ color: "#FFF", fontWeight: "600" }}>+</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
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
	headerTitle: { fontSize: 17, fontWeight: "700" },
	saveText: { fontSize: 15, fontWeight: "600" },
	body: { flex: 1, padding: 20 },
	input: {
		height: 44,
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: 12,
		fontSize: 15,
		marginBottom: 10,
	},
	multiline: {
		height: 80,
		paddingTop: 10,
		textAlignVertical: "top",
	},
	row: {
		flexDirection: "row",
		gap: 8,
	},
	flex1: { flex: 1 },
	small: { width: 90 },
	diffChip: {
		flex: 1,
		height: 36,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	sectionLabel: {
		fontSize: 16,
		fontWeight: "700",
		marginTop: 16,
		marginBottom: 8,
	},
	listItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	listText: { flex: 1, fontSize: 14 },
	addRow: {
		flexDirection: "row",
		gap: 6,
		alignItems: "flex-start",
	},
	addBtn: {
		width: 44,
		height: 44,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
});
