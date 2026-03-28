import { Stack, router } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { CreateListSheet } from "@/components/shopping/CreateListSheet";
import { RoutePlanner } from "@/components/shopping/RoutePlanner";
import { ShoppingListCard } from "@/components/shopping/ShoppingListCard";
import { EmptyShopping } from "@/components/ui/EmptyState";
import { SkeletonScreen } from "@/components/ui/Skeleton";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useShoppingListsQuery } from "@/lib/shopping";
import type { ShoppingList } from "@/lib/shopping";
import { useWorkspaceStore } from "@/stores/workspace";

export default function ShoppingScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

	const { data: lists, isLoading, refetch, isRefetching } = useShoppingListsQuery(workspaceId || "");
	const [showCreateList, setShowCreateList] = useState(false);
	const [showRoutePlanner, setShowRoutePlanner] = useState(false);

	const handlePressList = useCallback((list: ShoppingList) => {
		router.push(`/(tabs)/shopping/${list.id}`);
	}, []);

	if (!workspaceId) {
		return (
			<>
				<Stack.Screen options={{ title: "Shopping" }} />
				<View style={[styles.center, { backgroundColor: colors.background }]}>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>No workspace</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
						Sign in to see your shopping lists
					</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: "Shopping",
					headerRight: () => (
						<Pressable
							style={[styles.routeButton, { borderColor: colors.border }]}
							onPress={() => setShowRoutePlanner(true)}
						>
							<Text style={[styles.routeButtonText, { color: colors.tint }]}>Route</Text>
						</Pressable>
					),
				}}
			/>

			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{isLoading ? (
					<SkeletonScreen rows={5} />
				) : (
					<FlatList
						data={lists}
						keyExtractor={(item) => item.id}
						renderItem={({ item, index }) => (
							<Animated.View entering={FadeIn.duration(200).delay(index * 40)}>
								<ShoppingListCard list={item} onPress={handlePressList} />
							</Animated.View>
						)}
						contentContainerStyle={styles.list}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.tint} />
						}
						ListEmptyComponent={
							<EmptyShopping onAdd={() => setShowCreateList(true)} />
						}
					/>
				)}

				{/* FAB */}
				<Pressable
					style={[styles.fab, { backgroundColor: colors.tint }]}
					onPress={() => setShowCreateList(true)}
				>
					<Text style={styles.fabIcon}>+</Text>
				</Pressable>
			</View>

			<CreateListSheet
				visible={showCreateList}
				workspaceId={workspaceId}
				onClose={() => setShowCreateList(false)}
				onCreated={(listId) => router.push(`/(tabs)/shopping/${listId}`)}
			/>

			<RoutePlanner
				visible={showRoutePlanner}
				lists={lists || []}
				onClose={() => setShowRoutePlanner(false)}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, alignItems: "center", justifyContent: "center" },
	list: { padding: 16, paddingBottom: 100 },
	emptyContainer: { alignItems: "center", paddingTop: 120 },
	emptyTitle: { fontSize: 18, fontWeight: "700" },
	emptySubtitle: { fontSize: 14, marginTop: 6 },
	routeButton: {
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 6,
		borderWidth: 1,
		marginRight: 4,
	},
	routeButtonText: { fontSize: 13, fontWeight: "600" },
	fab: {
		position: "absolute",
		right: 20,
		bottom: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	fabIcon: { color: "#FFFFFF", fontSize: 28, fontWeight: "400", marginTop: -2 },
});
