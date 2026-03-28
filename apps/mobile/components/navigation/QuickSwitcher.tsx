import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
	FlatList,
	Keyboard,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useDatabasesQuery } from "@/lib/databases";
import { useNotesQuery } from "@/lib/notes";
import { useRecipesQuery } from "@/lib/recipes";
import { useTasksQuery } from "@/lib/tasks";
import { useNavigationStore } from "@/stores/navigation";
import { useWorkspaceStore } from "@/stores/workspace";

interface SearchResult {
	id: string;
	title: string;
	icon: string;
	type: string;
	route: string;
}

interface Props {
	visible: boolean;
	onClose: () => void;
}

export function QuickSwitcher({ visible, onClose }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { recents, addRecent } = useNavigationStore();
	const [query, setQuery] = useState("");

	const { data: notes } = useNotesQuery({ workspaceId: workspaceId || "" });
	const { data: databases } = useDatabasesQuery(workspaceId || "");
	const { data: tasks } = useTasksQuery({ workspaceId: workspaceId || "" });
	const { data: recipes } = useRecipesQuery(workspaceId || "");

	// Reset on open
	useEffect(() => {
		if (visible) setQuery("");
	}, [visible]);

	// Build search index
	const allItems = useMemo((): SearchResult[] => {
		const items: SearchResult[] = [];

		// Static pages
		items.push(
			{ id: "__home", title: "Home", icon: "\uD83C\uDFE0", type: "page", route: "/(tabs)" },
			{ id: "__tasks", title: "Tasks", icon: "\u2611", type: "page", route: "/(tabs)/tasks" },
			{ id: "__shopping", title: "Shopping", icon: "\uD83D\uDED2", type: "page", route: "/(tabs)/shopping" },
			{ id: "__calendar", title: "Calendar", icon: "\uD83D\uDCC5", type: "page", route: "/(tabs)/calendar" },
			{ id: "__recipes", title: "Recipes", icon: "\uD83C\uDF73", type: "page", route: "/(tabs)/recipes" },
			{ id: "__databases", title: "Databases", icon: "\uD83D\uDDC3", type: "page", route: "/(tabs)/databases" },
			{ id: "__settings", title: "Settings", icon: "\u2699", type: "page", route: "/settings" },
		);

		// Notes
		notes?.forEach((n) => {
			items.push({
				id: n.id,
				title: n.title,
				icon: n.isPinned ? "\uD83D\uDCCC" : "\uD83D\uDCC4",
				type: "note",
				route: `/(tabs)/notes/${n.id}`,
			});
		});

		// Databases
		databases?.forEach((d) => {
			items.push({
				id: d.id,
				title: d.name,
				icon: d.icon || "\uD83D\uDDC3",
				type: "database",
				route: `/(tabs)/databases/${d.id}`,
			});
		});

		// Tasks (top-level only)
		tasks?.slice(0, 50).forEach((t) => {
			items.push({
				id: t.id,
				title: t.title,
				icon: t.status === "done" ? "\u2705" : "\u25CB",
				type: "task",
				route: "/(tabs)/tasks",
			});
		});

		// Recipes
		recipes?.slice(0, 30).forEach((r) => {
			items.push({
				id: r.id,
				title: r.title,
				icon: "\uD83C\uDF73",
				type: "recipe",
				route: `/(tabs)/recipes/${r.id}`,
			});
		});

		return items;
	}, [notes, databases, tasks, recipes]);

	// Filter results
	const results = useMemo(() => {
		if (!query.trim()) {
			// Show recents when no query
			const recentResults = recents.slice(0, 8).map((r) => ({
				id: r.id,
				title: r.title,
				icon: r.icon,
				type: r.type,
				route: r.route,
			}));
			return recentResults.length > 0 ? recentResults : allItems.slice(0, 7);
		}

		const q = query.toLowerCase();
		return allItems
			.filter((item) => item.title.toLowerCase().includes(q))
			.slice(0, 15);
	}, [query, allItems, recents]);

	const handleSelect = (item: SearchResult) => {
		addRecent({
			id: item.id,
			title: item.title,
			icon: item.icon,
			route: item.route,
			type: item.type as any,
		});
		onClose();
		router.push(item.route as any);
	};

	// Keyboard shortcut (web)
	useEffect(() => {
		if (Platform.OS !== "web") return;
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (visible) onClose();
				// Parent handles opening
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [visible, onClose]);

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Animated.View
					entering={FadeIn.duration(150)}
					style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
				>
					{/* Search Input */}
					<View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
						<Text style={styles.searchIcon}>{"\uD83D\uDD0D"}</Text>
						<TextInput
							style={[styles.searchInput, { color: colors.text }]}
							placeholder="Search pages, notes, databases..."
							placeholderTextColor={colors.textSecondary}
							value={query}
							onChangeText={setQuery}
							autoFocus
							returnKeyType="go"
							onSubmitEditing={() => {
								if (results.length > 0) handleSelect(results[0]);
							}}
						/>
						{query.length > 0 && (
							<Pressable onPress={() => setQuery("")}>
								<Text style={[styles.clearBtn, { color: colors.textSecondary }]}>{"\u2715"}</Text>
							</Pressable>
						)}
					</View>

					{/* Section Label */}
					<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
						{query.trim() ? "Results" : recents.length > 0 ? "Recent" : "Quick Links"}
					</Text>

					{/* Results */}
					<FlatList
						data={results}
						keyExtractor={(item) => item.id}
						keyboardShouldPersistTaps="handled"
						style={styles.resultList}
						renderItem={({ item }) => (
							<Pressable style={styles.resultItem} onPress={() => handleSelect(item)}>
								<Text style={styles.resultIcon}>{item.icon}</Text>
								<View style={styles.resultInfo}>
									<Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
										{item.title}
									</Text>
									<Text style={[styles.resultType, { color: colors.textSecondary }]}>
										{item.type}
									</Text>
								</View>
							</Pressable>
						)}
						ListEmptyComponent={
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
								No results found
							</Text>
						}
					/>
				</Animated.View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-start",
		alignItems: "center",
		paddingTop: 100,
	},
	panel: {
		width: "90%",
		maxWidth: 500,
		maxHeight: 450,
		borderRadius: 14,
		borderWidth: 1,
		overflow: "hidden",
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		borderBottomWidth: 1,
		height: 48,
		gap: 8,
	},
	searchIcon: { fontSize: 16 },
	searchInput: { flex: 1, fontSize: 16, height: 48, padding: 0 },
	clearBtn: { fontSize: 16, padding: 4 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 4,
	},
	resultList: { maxHeight: 350 },
	resultItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	resultIcon: { fontSize: 18, width: 28, textAlign: "center" },
	resultInfo: { flex: 1 },
	resultTitle: { fontSize: 14, fontWeight: "600" },
	resultType: { fontSize: 11, textTransform: "capitalize", marginTop: 1 },
	emptyText: { textAlign: "center", padding: 20, fontSize: 13 },
});
