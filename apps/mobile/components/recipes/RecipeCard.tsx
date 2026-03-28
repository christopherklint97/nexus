import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatTime, parseIngredients, parseTags, type Recipe } from "@/lib/recipes";

interface Props {
	recipe: Recipe;
	onPress: () => void;
}

export function RecipeCard({ recipe, onPress }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const tags = parseTags(recipe.tagsJson);
	const ingredientCount = parseIngredients(recipe.ingredientsJson).length;
	const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

	return (
		<Pressable
			style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			onPress={onPress}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
					{recipe.title}
				</Text>
				{recipe.isFavorite && <Text style={styles.favIcon}>{"\u2605"}</Text>}
			</View>

			{recipe.description ? (
				<Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
					{recipe.description}
				</Text>
			) : null}

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
					<View style={[styles.badge, { backgroundColor: colors.tint + "15" }]}>
						<Text style={[styles.badgeText, { color: colors.tint }]}>{recipe.cuisine}</Text>
					</View>
				)}
				{totalTime > 0 && (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						{formatTime(totalTime)}
					</Text>
				)}
				{ingredientCount > 0 && (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						{ingredientCount} ingredients
					</Text>
				)}
			</View>

			{tags.length > 0 && (
				<View style={styles.tagRow}>
					{tags.slice(0, 4).map((tag) => (
						<Text key={tag} style={[styles.tag, { color: colors.textSecondary }]}>
							#{tag}
						</Text>
					))}
					{tags.length > 4 && (
						<Text style={[styles.tag, { color: colors.textSecondary }]}>
							+{tags.length - 4}
						</Text>
					)}
				</View>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	title: {
		fontSize: 17,
		fontWeight: "700",
		flex: 1,
	},
	favIcon: {
		fontSize: 16,
		color: "#F59E0B",
		marginLeft: 8,
	},
	description: {
		fontSize: 13,
		lineHeight: 18,
		marginTop: 6,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 10,
		flexWrap: "wrap",
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
	},
	badgeText: {
		fontSize: 11,
		fontWeight: "600",
		textTransform: "capitalize",
	},
	meta: {
		fontSize: 12,
	},
	tagRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 8,
	},
	tag: {
		fontSize: 11,
	},
});
