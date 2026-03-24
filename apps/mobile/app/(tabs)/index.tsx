import { router } from "expo-router";
import { useState } from "react";
import {
	FlatList,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatTime, useCalendarEvents, useCalendarStatus } from "@/lib/calendar";
import { useNotesQuery } from "@/lib/notes";
import { useGlobalSearch } from "@/lib/search";
import { useShoppingListsQuery } from "@/lib/shopping";
import { useTasksQuery } from "@/lib/tasks";
import { useWorkspaceStore } from "@/stores/workspace";

function getGreeting(): string {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
}

export default function HomeScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Data queries
	const { data: activeTasks } = useTasksQuery({
		workspaceId: workspaceId || "",
		status: "in_progress",
		sort: "priority",
		order: "asc",
	});

	const { data: todoTasks } = useTasksQuery({
		workspaceId: workspaceId || "",
		status: "todo",
		sort: "priority",
		order: "asc",
	});

	const { data: shoppingLists } = useShoppingListsQuery(workspaceId || "");
	const { data: pinnedNotes } = useNotesQuery({ workspaceId: workspaceId || "", pinned: true });

	const { data: calStatus } = useCalendarStatus();
	const today = new Date();
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
	const todayEnd = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
		23,
		59,
		59,
	).toISOString();
	const { data: todayEvents } = useCalendarEvents(
		todayStart,
		todayEnd,
		calStatus?.connected ?? false,
	);

	const { data: searchResults } = useGlobalSearch(searchQuery, workspaceId || "");

	const allTasks = [...(activeTasks || []), ...(todoTasks || [])].slice(0, 5);
	const activeShoppingLists = (shoppingLists || [])
		.filter((l) => l.checkedCount < l.itemCount)
		.slice(0, 3);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: colors.background }]}
			showsVerticalScrollIndicator={false}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
				<Text style={[styles.title, { color: colors.text }]}>Command Center</Text>
			</View>

			{/* Search bar */}
			<Pressable
				style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
				onPress={() => setShowSearch(true)}
			>
				<Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
					Search everything...
				</Text>
			</Pressable>

			{/* Today's Agenda */}
			<Animated.View
				entering={FadeInDown.duration(300).delay(0)}
				style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			>
				<Text style={[styles.cardTitle, { color: colors.text }]}>Today's Agenda</Text>
				{(todayEvents || []).length > 0 ? (
					(todayEvents || []).slice(0, 4).map((event) => (
						<View key={event.id} style={[styles.agendaItem, { borderLeftColor: colors.tint }]}>
							<Text style={[styles.agendaTime, { color: colors.textSecondary }]}>
								{event.allDay ? "All day" : formatTime(event.startDateTime)}
							</Text>
							<Text style={[styles.agendaTitle, { color: colors.text }]} numberOfLines={1}>
								{event.title}
							</Text>
						</View>
					))
				) : (
					<Text style={[styles.cardEmpty, { color: colors.textSecondary }]}>No events today</Text>
				)}
			</Animated.View>

			{/* Active Tasks */}
			<Animated.View
				entering={FadeInDown.duration(300).delay(80)}
				style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			>
				<View style={styles.cardHeader}>
					<Text style={[styles.cardTitle, { color: colors.text }]}>Tasks</Text>
					<Pressable onPress={() => router.push("/(tabs)/tasks")}>
						<Text style={[styles.viewAll, { color: colors.tint }]}>View all</Text>
					</Pressable>
				</View>
				{allTasks.length > 0 ? (
					allTasks.map((task) => (
						<Pressable
							key={task.id}
							style={styles.taskRow}
							onPress={() => router.push("/(tabs)/tasks")}
						>
							<Text
								style={[
									styles.taskStatus,
									{ color: task.status === "in_progress" ? colors.tint : colors.textSecondary },
								]}
							>
								{task.status === "in_progress" ? "◐" : "○"}
							</Text>
							<Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
								{task.title}
							</Text>
							<PriorityBadge priority={task.priority} />
						</Pressable>
					))
				) : (
					<Text style={[styles.cardEmpty, { color: colors.textSecondary }]}>No active tasks</Text>
				)}
			</Animated.View>

			{/* Shopping */}
			<Animated.View
				entering={FadeInDown.duration(300).delay(160)}
				style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			>
				<View style={styles.cardHeader}>
					<Text style={[styles.cardTitle, { color: colors.text }]}>Shopping</Text>
					<Pressable onPress={() => router.push("/(tabs)/shopping")}>
						<Text style={[styles.viewAll, { color: colors.tint }]}>View all</Text>
					</Pressable>
				</View>
				{activeShoppingLists.length > 0 ? (
					activeShoppingLists.map((list) => (
						<Pressable
							key={list.id}
							style={styles.shopRow}
							onPress={() => router.push(`/(tabs)/shopping/${list.id}`)}
						>
							<View style={[styles.shopIcon, { backgroundColor: colors.tint + "15" }]}>
								<Text style={[styles.shopIconText, { color: colors.tint }]}>
									{list.storeName.charAt(0)}
								</Text>
							</View>
							<View style={styles.shopInfo}>
								<Text style={[styles.shopStore, { color: colors.text }]}>{list.storeName}</Text>
								<Text style={[styles.shopMeta, { color: colors.textSecondary }]}>
									{list.checkedCount}/{list.itemCount} items · ${list.estimatedTotal.toFixed(2)}
								</Text>
							</View>
						</Pressable>
					))
				) : (
					<Text style={[styles.cardEmpty, { color: colors.textSecondary }]}>
						No active shopping lists
					</Text>
				)}
			</Animated.View>

			{/* Pinned Notes */}
			<Animated.View
				entering={FadeInDown.duration(300).delay(240)}
				style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			>
				<View style={styles.cardHeader}>
					<Text style={[styles.cardTitle, { color: colors.text }]}>Pinned Notes</Text>
					<Pressable onPress={() => router.push("/(tabs)/notes")}>
						<Text style={[styles.viewAll, { color: colors.tint }]}>View all</Text>
					</Pressable>
				</View>
				{(pinnedNotes || []).length > 0 ? (
					(pinnedNotes || []).slice(0, 3).map((note) => (
						<Pressable
							key={note.id}
							style={styles.noteRow}
							onPress={() => router.push(`/(tabs)/notes/${note.id}`)}
						>
							<Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
								📌 {note.title}
							</Text>
						</Pressable>
					))
				) : (
					<Text style={[styles.cardEmpty, { color: colors.textSecondary }]}>
						Pin a note to see it here
					</Text>
				)}
			</Animated.View>

			<View style={{ height: 40 }} />

			{/* Global Search Modal */}
			<Modal
				visible={showSearch}
				animationType="fade"
				transparent
				onRequestClose={() => setShowSearch(false)}
			>
				<Pressable style={styles.searchOverlay} onPress={() => setShowSearch(false)}>
					<View
						style={[
							styles.searchModal,
							{ backgroundColor: colors.surface, borderColor: colors.border },
						]}
						onStartShouldSetResponder={() => true}
					>
						<TextInput
							style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search tasks, notes, shopping..."
							placeholderTextColor={colors.textSecondary}
							autoFocus
						/>
						{(searchResults || []).length > 0 && (
							<FlatList
								data={searchResults}
								keyExtractor={(item) => `${item.type}-${item.id}`}
								renderItem={({ item }) => (
									<Pressable
										style={[styles.searchResult, { borderBottomColor: colors.border }]}
										onPress={() => {
											setShowSearch(false);
											setSearchQuery("");
											if (item.type === "task") router.push("/(tabs)/tasks");
											else if (item.type === "note") router.push(`/(tabs)/notes/${item.id}`);
											else if (item.type === "shopping_list")
												router.push(`/(tabs)/shopping/${item.id}`);
											else router.push("/(tabs)/shopping");
										}}
									>
										<View
											style={[
												styles.resultTypeBadge,
												{ backgroundColor: getTypeColor(item.type, colors) + "15" },
											]}
										>
											<Text
												style={[styles.resultTypeText, { color: getTypeColor(item.type, colors) }]}
											>
												{getTypeLabel(item.type)}
											</Text>
										</View>
										<View style={styles.resultContent}>
											<Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
												{item.title}
											</Text>
											<Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
												{item.subtitle}
											</Text>
										</View>
									</Pressable>
								)}
								style={styles.searchResults}
							/>
						)}
						{searchQuery.length >= 2 && (searchResults || []).length === 0 && (
							<Text style={[styles.noResults, { color: colors.textSecondary }]}>
								No results found
							</Text>
						)}
					</View>
				</Pressable>
			</Modal>
		</ScrollView>
	);
}

function getTypeColor(type: string, colors: (typeof Colors)["light"]): string {
	switch (type) {
		case "task":
			return colors.tint;
		case "note":
			return colors.success;
		case "shopping_list":
			return colors.warning;
		case "shopping_item":
			return colors.warning;
		default:
			return colors.textSecondary;
	}
}

function getTypeLabel(type: string): string {
	switch (type) {
		case "task":
			return "Task";
		case "note":
			return "Note";
		case "shopping_list":
			return "List";
		case "shopping_item":
			return "Item";
		default:
			return type;
	}
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
	greeting: { fontSize: 14, fontWeight: "500" },
	title: { fontSize: 28, fontWeight: "800", marginTop: 2 },
	searchBar: {
		marginHorizontal: 20,
		marginTop: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
	},
	searchPlaceholder: { fontSize: 15 },
	card: { marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	cardTitle: { fontSize: 16, fontWeight: "700" },
	cardEmpty: { fontSize: 14, paddingVertical: 4 },
	viewAll: { fontSize: 13, fontWeight: "600" },
	// Agenda
	agendaItem: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, marginTop: 4 },
	agendaTime: { fontSize: 12, fontWeight: "600" },
	agendaTitle: { fontSize: 14, fontWeight: "500", marginTop: 1 },
	// Tasks
	taskRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
	taskStatus: { fontSize: 16 },
	taskTitle: { flex: 1, fontSize: 14, fontWeight: "500" },
	// Shopping
	shopRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
	shopIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	shopIconText: { fontSize: 14, fontWeight: "700" },
	shopInfo: { flex: 1 },
	shopStore: { fontSize: 14, fontWeight: "600" },
	shopMeta: { fontSize: 12, marginTop: 1 },
	// Notes
	noteRow: { paddingVertical: 6 },
	noteTitle: { fontSize: 14, fontWeight: "500" },
	// Search modal
	searchOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-start",
		paddingTop: 80,
	},
	searchModal: {
		marginHorizontal: 20,
		borderRadius: 12,
		borderWidth: 1,
		padding: 16,
		maxHeight: 500,
	},
	searchInput: {
		fontSize: 16,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginBottom: 8,
	},
	searchResults: { maxHeight: 350 },
	searchResult: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: 0.5,
	},
	resultTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
	resultTypeText: { fontSize: 11, fontWeight: "700" },
	resultContent: { flex: 1 },
	resultTitle: { fontSize: 14, fontWeight: "600" },
	resultSubtitle: { fontSize: 12, marginTop: 1 },
	noResults: { textAlign: "center", paddingVertical: 20, fontSize: 14 },
});
