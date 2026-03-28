import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { AddToListSheet } from "@/components/recipes/AddToListSheet";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	formatTime,
	parseIngredients,
	parseInstructions,
	parseTags,
	useDeleteRecipe,
	useRecipeDetailQuery,
	useUpdateRecipe,
} from "@/lib/recipes";

export default function RecipeDetailScreen() {
	const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { data: recipe, isLoading } = useRecipeDetailQuery(recipeId);
	const updateRecipe = useUpdateRecipe();
	const deleteRecipe = useDeleteRecipe();
	const [showAddToList, setShowAddToList] = useState(false);

	if (isLoading || !recipe) {
		return (
			<>
				<Stack.Screen options={{ title: "Recipe" }} />
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
				</View>
			</>
		);
	}

	const ingredients = parseIngredients(recipe.ingredientsJson);
	const instructions = parseInstructions(recipe.instructionsJson);
	const tags = parseTags(recipe.tagsJson);
	const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

	const handleToggleFavorite = () => {
		updateRecipe.mutate({ id: recipe.id, isFavorite: !recipe.isFavorite });
	};

	const handleDelete = () => {
		Alert.alert("Delete Recipe", `Delete "${recipe.title}"?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					deleteRecipe.mutate(recipe.id, { onSuccess: () => router.back() });
				},
			},
		]);
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: recipe.title,
					headerRight: () => (
						<View style={{ flexDirection: "row", gap: 12, marginRight: 16 }}>
							<Pressable onPress={handleToggleFavorite}>
								<Text style={{ fontSize: 20 }}>{recipe.isFavorite ? "\u2605" : "\u2606"}</Text>
							</Pressable>
							<Pressable onPress={handleDelete}>
								<Text style={{ fontSize: 18, color: colors.danger }}>
									{"\uD83D\uDDD1"}
								</Text>
							</Pressable>
						</View>
					),
				}}
			/>
			<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Meta Row */}
				<View style={styles.metaRow}>
					{recipe.difficulty && (
						<View
							style={[
								styles.badge,
								{
									backgroundColor:
										recipe.difficulty === "easy"
											? colors.success + "20"
											: recipe.difficulty === "medium"
												? colors.warning + "20"
												: colors.danger + "20",
								},
							]}
						>
							<Text
								style={[
									styles.badgeText,
									{
										color:
											recipe.difficulty === "easy"
												? colors.success
												: recipe.difficulty === "medium"
													? colors.warning
													: colors.danger,
									},
								]}
							>
								{recipe.difficulty}
							</Text>
						</View>
					)}
					{recipe.cuisine && (
						<View style={[styles.badge, { backgroundColor: colors.tint + "20" }]}>
							<Text style={[styles.badgeText, { color: colors.tint }]}>{recipe.cuisine}</Text>
						</View>
					)}
					{recipe.servings && (
						<Text style={[styles.metaText, { color: colors.textSecondary }]}>
							{recipe.servings} servings
						</Text>
					)}
				</View>

				{/* Time Info */}
				{totalTime > 0 && (
					<View
						style={[styles.timeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						{recipe.prepTime ? (
							<View style={styles.timeItem}>
								<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Prep</Text>
								<Text style={[styles.timeValue, { color: colors.text }]}>
									{formatTime(recipe.prepTime)}
								</Text>
							</View>
						) : null}
						{recipe.cookTime ? (
							<View style={styles.timeItem}>
								<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Cook</Text>
								<Text style={[styles.timeValue, { color: colors.text }]}>
									{formatTime(recipe.cookTime)}
								</Text>
							</View>
						) : null}
						{recipe.prepTime && recipe.cookTime ? (
							<View style={styles.timeItem}>
								<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Total</Text>
								<Text style={[styles.timeValue, { color: colors.tint }]}>
									{formatTime(totalTime)}
								</Text>
							</View>
						) : null}
					</View>
				)}

				{/* Description */}
				{recipe.description ? (
					<Text style={[styles.description, { color: colors.textSecondary }]}>
						{recipe.description}
					</Text>
				) : null}

				{/* Tags */}
				{tags.length > 0 && (
					<View style={styles.tagRow}>
						{tags.map((tag) => (
							<View
								key={tag}
								style={[styles.tag, { backgroundColor: colors.border }]}
							>
								<Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
							</View>
						))}
					</View>
				)}

				{/* Ingredients */}
				{ingredients.length > 0 && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
							<Pressable
								style={[styles.addToListBtn, { backgroundColor: colors.tint }]}
								onPress={() => setShowAddToList(true)}
							>
								<Text style={styles.addToListText}>Add to list</Text>
							</Pressable>
						</View>
						{ingredients.map((ing, i) => (
							<View
								key={`${ing.item}-${i}`}
								style={[
									styles.ingredientRow,
									{ borderBottomColor: colors.border },
								]}
							>
								<Text style={[styles.ingredientQty, { color: colors.tint }]}>
									{ing.quantity} {ing.unit}
								</Text>
								<Text style={[styles.ingredientItem, { color: colors.text }]}>{ing.item}</Text>
							</View>
						))}
					</View>
				)}

				{/* Instructions */}
				{instructions.length > 0 && (
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
						{instructions.map((step, i) => (
							<View key={`step-${i}`} style={styles.stepRow}>
								<View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
									<Text style={styles.stepNumberText}>{i + 1}</Text>
								</View>
								<Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
							</View>
						))}
					</View>
				)}

				{/* Source URL */}
				{recipe.sourceUrl ? (
					<Text style={[styles.sourceUrl, { color: colors.tint }]}>
						Source: {recipe.sourceUrl}
					</Text>
				) : null}

				<View style={{ height: 40 }} />
			</ScrollView>

			<AddToListSheet
				visible={showAddToList}
				onClose={() => setShowAddToList(false)}
				recipeId={recipe.id}
				recipeTitle={recipe.title}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	loadingText: { textAlign: "center", marginTop: 40, fontSize: 15 },
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 20,
		paddingTop: 16,
		flexWrap: "wrap",
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: "600",
		textTransform: "capitalize",
	},
	metaText: {
		fontSize: 13,
	},
	timeRow: {
		flexDirection: "row",
		marginHorizontal: 20,
		marginTop: 16,
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		gap: 24,
	},
	timeItem: { alignItems: "center" },
	timeLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
	timeValue: { fontSize: 16, fontWeight: "700" },
	description: {
		paddingHorizontal: 20,
		paddingTop: 16,
		fontSize: 15,
		lineHeight: 22,
	},
	tagRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		paddingHorizontal: 20,
		paddingTop: 12,
	},
	tag: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
	},
	tagText: {
		fontSize: 12,
		fontWeight: "500",
	},
	section: {
		paddingHorizontal: 20,
		paddingTop: 24,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 12,
	},
	addToListBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		marginBottom: 12,
	},
	addToListText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "600",
	},
	ingredientRow: {
		flexDirection: "row",
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12,
	},
	ingredientQty: {
		fontSize: 14,
		fontWeight: "600",
		width: 80,
	},
	ingredientItem: {
		fontSize: 15,
		flex: 1,
	},
	stepRow: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 16,
	},
	stepNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 2,
	},
	stepNumberText: {
		color: "#FFFFFF",
		fontSize: 13,
		fontWeight: "700",
	},
	stepText: {
		flex: 1,
		fontSize: 15,
		lineHeight: 22,
	},
	sourceUrl: {
		paddingHorizontal: 20,
		paddingTop: 20,
		fontSize: 13,
	},
});
