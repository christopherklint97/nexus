import { Stack, router } from "expo-router";
import { useState } from "react";
import {
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { RecipeCard } from "@/components/recipes/RecipeCard";
import { CreateRecipeSheet } from "@/components/recipes/CreateRecipeSheet";
import { EmptyRecipes } from "@/components/ui/EmptyState";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useRecipesQuery, type Recipe } from "@/lib/recipes";
import { useWorkspaceStore } from "@/stores/workspace";

const DIFFICULTY_OPTIONS = ["all", "easy", "medium", "hard"] as const;

export default function RecipesScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const [search, setSearch] = useState("");
	const [difficulty, setDifficulty] = useState<string>("all");
	const [showCreate, setShowCreate] = useState(false);
	const [showFavorites, setShowFavorites] = useState(false);

	const { data: recipes, isLoading, refetch, isRefetching } = useRecipesQuery(workspaceId || "", {
		search: search || undefined,
		difficulty: difficulty !== "all" ? difficulty : undefined,
		favorite: showFavorites || undefined,
	});

	return (
		<>
			<Stack.Screen
				options={{
					title: "Recipes",
					headerRight: () => (
						<Pressable style={{ marginRight: 16 }} onPress={() => setShowCreate(true)}>
							<Text style={{ fontSize: 28, color: colors.tint, fontWeight: "300" }}>+</Text>
						</Pressable>
					),
				}}
			/>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Search */}
				<View style={styles.searchRow}>
					<TextInput
						style={[
							styles.searchInput,
							{
								backgroundColor: colors.surface,
								borderColor: colors.border,
								color: colors.text,
							},
						]}
						placeholder="Search recipes..."
						placeholderTextColor={colors.textSecondary}
						value={search}
						onChangeText={setSearch}
					/>
					<Pressable
						style={[
							styles.favBtn,
							{
								backgroundColor: showFavorites ? colors.warning + "20" : colors.surface,
								borderColor: showFavorites ? colors.warning : colors.border,
							},
						]}
						onPress={() => setShowFavorites(!showFavorites)}
					>
						<Text style={{ fontSize: 18 }}>{showFavorites ? "\u2605" : "\u2606"}</Text>
					</Pressable>
				</View>

				{/* Difficulty Filter */}
				<View style={styles.filterRow}>
					{DIFFICULTY_OPTIONS.map((d) => (
						<Pressable
							key={d}
							style={[
								styles.filterChip,
								{
									backgroundColor: difficulty === d ? colors.tint : colors.surface,
									borderColor: difficulty === d ? colors.tint : colors.border,
								},
							]}
							onPress={() => setDifficulty(d)}
						>
							<Text
								style={[
									styles.filterText,
									{ color: difficulty === d ? "#FFFFFF" : colors.text },
								]}
							>
								{d.charAt(0).toUpperCase() + d.slice(1)}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Recipe List */}
				{isLoading ? (
					<SkeletonScreen rows={5} />
				) : (
					<FlatList
						data={recipes || []}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.list}
						refreshControl={
							<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.tint} />
						}
						renderItem={({ item, index }) => (
							<Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
								<RecipeCard
									recipe={item}
									onPress={() => router.push(`/(tabs)/recipes/${item.id}`)}
								/>
							</Animated.View>
						)}
						ListEmptyComponent={
							<EmptyRecipes onAdd={() => setShowCreate(true)} />
						}
					/>
				)}
			</View>

			<CreateRecipeSheet
				visible={showCreate}
				onClose={() => setShowCreate(false)}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	searchRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 8,
	},
	searchInput: {
		flex: 1,
		height: 40,
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: 12,
		fontSize: 15,
	},
	favBtn: {
		width: 40,
		height: 40,
		borderRadius: 8,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	filterRow: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 4,
		gap: 8,
	},
	filterChip: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
	},
	filterText: {
		fontSize: 13,
		fontWeight: "500",
	},
	list: {
		padding: 16,
		gap: 12,
	},
	empty: {
		alignItems: "center",
		paddingTop: 80,
	},
	emptyIcon: {
		fontSize: 48,
		marginBottom: 12,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 4,
	},
	emptyText: {
		fontSize: 14,
	},
});
