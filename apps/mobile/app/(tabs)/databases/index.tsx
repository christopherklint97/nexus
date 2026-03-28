import { Stack, router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	useCreateDatabase,
	useDeleteDatabase,
	useDatabasesQuery,
	type Database,
} from "@/lib/databases";
import { useWorkspaceStore } from "@/stores/workspace";

export default function DatabasesScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { data: databases, isLoading } = useDatabasesQuery(workspaceId || "");
	const createDb = useCreateDatabase();
	const deleteDb = useDeleteDatabase();

	const handleCreate = () => {
		Alert.prompt?.(
			"New Database",
			"Enter a name for your database",
			(name) => {
				if (name?.trim() && workspaceId) {
					createDb.mutate({ name: name.trim(), workspaceId });
				}
			},
		) ??
			// Fallback for Android
			(() => {
				if (workspaceId) {
					createDb.mutate({ name: "Untitled Database", icon: "\uD83D\uDDC3", workspaceId });
				}
			})();
	};

	const handleDelete = (db: Database) => {
		Alert.alert("Delete Database", `Delete "${db.name}" and all its data?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteDb.mutate(db.id),
			},
		]);
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: "Databases",
					headerRight: () => (
						<Pressable style={{ marginRight: 16 }} onPress={handleCreate}>
							<Text style={{ fontSize: 28, color: colors.tint, fontWeight: "300" }}>+</Text>
						</Pressable>
					),
				}}
			/>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<FlatList
					data={databases || []}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.list}
					renderItem={({ item, index }) => (
						<Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
							<Pressable
								style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
								onPress={() => router.push(`/(tabs)/databases/${item.id}`)}
								onLongPress={() => handleDelete(item)}
							>
								<Text style={styles.icon}>{item.icon || "\uD83D\uDDC3"}</Text>
								<View style={styles.cardContent}>
									<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
										{item.name}
									</Text>
									{item.description ? (
										<Text
											style={[styles.cardDesc, { color: colors.textSecondary }]}
											numberOfLines={1}
										>
											{item.description}
										</Text>
									) : null}
									<Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
										{item.rowCount} {item.rowCount === 1 ? "row" : "rows"}
									</Text>
								</View>
							</Pressable>
						</Animated.View>
					)}
					ListEmptyComponent={
						!isLoading ? (
							<View style={styles.empty}>
								<Text style={styles.emptyIcon}>{"\uD83D\uDDC3"}</Text>
								<Text style={[styles.emptyTitle, { color: colors.text }]}>No databases yet</Text>
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
									Tap + to create your first database
								</Text>
							</View>
						) : null
					}
				/>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	list: { padding: 16, gap: 10 },
	card: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12,
	},
	icon: { fontSize: 28 },
	cardContent: { flex: 1 },
	cardTitle: { fontSize: 16, fontWeight: "700" },
	cardDesc: { fontSize: 13, marginTop: 2 },
	cardMeta: { fontSize: 12, marginTop: 4 },
	empty: { alignItems: "center", paddingTop: 80 },
	emptyIcon: { fontSize: 48, marginBottom: 12 },
	emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
	emptyText: { fontSize: 14 },
});
