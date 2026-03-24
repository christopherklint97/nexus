import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	SectionList,
	StyleSheet,
	Text,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AddItemSheet } from "@/components/shopping/AddItemSheet";
import { ShoppingItemRow } from "@/components/shopping/ShoppingItemRow";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	useDeleteShoppingItem,
	useDeleteShoppingList,
	useShoppingListDetailQuery,
	useUpdateShoppingItem,
} from "@/lib/shopping";
import type { ShoppingItem } from "@/lib/shopping";

export default function ShoppingListDetailScreen() {
	const { listId } = useLocalSearchParams<{ listId: string }>();
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const { data: list, isLoading } = useShoppingListDetailQuery(listId);
	const updateItem = useUpdateShoppingItem();
	const deleteItem = useDeleteShoppingItem();
	const deleteList = useDeleteShoppingList();
	const [showAddItem, setShowAddItem] = useState(false);

	// Group items by aisle
	const sections = useMemo(() => {
		if (!list?.items) return [];

		const groups = new Map<string, ShoppingItem[]>();
		for (const item of list.items) {
			const aisle = item.aisle || "Uncategorized";
			const existing = groups.get(aisle) || [];
			existing.push(item);
			groups.set(aisle, existing);
		}

		return [...groups.entries()]
			.sort(([a], [b]) => {
				if (a === "Uncategorized") return 1;
				if (b === "Uncategorized") return -1;
				return a.localeCompare(b);
			})
			.map(([title, data]) => ({ title, data }));
	}, [list?.items]);

	// Running total
	const totals = useMemo(() => {
		if (!list?.items) return { checked: 0, total: 0, spent: 0, estimated: 0 };
		let checked = 0;
		let spent = 0;
		let estimated = 0;
		for (const item of list.items) {
			if (item.isChecked) {
				checked++;
				if (item.estimatedPrice) spent += item.estimatedPrice * item.quantity;
			}
			if (item.estimatedPrice) estimated += item.estimatedPrice * item.quantity;
		}
		return { checked, total: list.items.length, spent, estimated };
	}, [list?.items]);

	const handleToggle = (item: ShoppingItem) => {
		updateItem.mutate({ id: item.id, listId: item.listId, isChecked: !item.isChecked });
	};

	const handleDeleteItem = (item: ShoppingItem) => {
		Alert.alert("Delete Item", `Remove "${item.name}" from this list?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteItem.mutate({ id: item.id, listId: item.listId }),
			},
		]);
	};

	const handleDeleteList = () => {
		Alert.alert("Delete List", "This will delete the list and all its items.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteList.mutate(listId, { onSuccess: () => router.back() }),
			},
		]);
	};

	if (isLoading || !list) {
		return (
			<>
				<Stack.Screen options={{ title: "Loading..." }} />
				<View style={[styles.center, { backgroundColor: colors.background }]}>
					<ActivityIndicator color={colors.tint} />
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: list.storeName,
					headerRight: () => (
						<View style={styles.headerActions}>
							<Pressable onPress={handleDeleteList}>
								<Text style={[styles.headerBtn, { color: colors.danger }]}>Delete</Text>
							</Pressable>
						</View>
					),
				}}
			/>

			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Summary bar */}
				<Animated.View
					entering={FadeIn.duration(300)}
					style={[
						styles.summaryBar,
						{ backgroundColor: colors.surface, borderBottomColor: colors.border },
					]}
				>
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: colors.text }]}>
							{totals.checked}/{totals.total}
						</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>items</Text>
					</View>
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: colors.success }]}>
							${totals.spent.toFixed(2)}
						</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>spent</Text>
					</View>
					<View style={styles.summaryItem}>
						<Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
							${totals.estimated.toFixed(2)}
						</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>budget</Text>
					</View>
				</Animated.View>

				{/* Items grouped by aisle */}
				<SectionList
					sections={sections}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<ShoppingItemRow item={item} onToggle={handleToggle} onDelete={handleDeleteItem} />
					)}
					renderSectionHeader={({ section: { title } }) => (
						<View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
						</View>
					)}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>No items yet</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
								Tap + to add items to this list
							</Text>
						</View>
					}
				/>

				{/* FAB */}
				<Pressable
					style={[styles.fab, { backgroundColor: colors.tint }]}
					onPress={() => setShowAddItem(true)}
				>
					<Text style={styles.fabIcon}>+</Text>
				</Pressable>
			</View>

			<AddItemSheet visible={showAddItem} listId={listId} onClose={() => setShowAddItem(false)} />
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, alignItems: "center", justifyContent: "center" },
	summaryBar: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	summaryItem: { alignItems: "center" },
	summaryValue: { fontSize: 18, fontWeight: "800" },
	summaryLabel: { fontSize: 11, marginTop: 2 },
	sectionHeader: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 6,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	listContent: { paddingBottom: 100 },
	emptyContainer: { alignItems: "center", paddingTop: 80 },
	emptyTitle: { fontSize: 18, fontWeight: "700" },
	emptySubtitle: { fontSize: 14, marginTop: 6 },
	headerActions: { flexDirection: "row", marginRight: 4 },
	headerBtn: { fontSize: 14, fontWeight: "600" },
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
