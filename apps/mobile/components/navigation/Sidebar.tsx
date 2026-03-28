import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useDatabasesQuery } from "@/lib/databases";
import { useFoldersQuery, useNotesQuery } from "@/lib/notes";
import { useAuthStore } from "@/stores/auth";
import { useNavigationStore } from "@/stores/navigation";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
	onClose: () => void;
	onOpenQuickSwitcher: () => void;
}

export function Sidebar({ onClose, onOpenQuickSwitcher }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { user } = useAuthStore();
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { favorites, recents } = useNavigationStore();

	const { data: notes } = useNotesQuery({ workspaceId: workspaceId || "" });
	const { data: folders } = useFoldersQuery(workspaceId || "");
	const { data: databases } = useDatabasesQuery(workspaceId || "");

	const navigate = (route: string) => {
		onClose();
		router.push(route as any);
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.surface }]}>
			{/* User Header */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<View style={[styles.avatar, { backgroundColor: colors.tint }]}>
					<Text style={styles.avatarText}>
						{(user?.name || "U").charAt(0).toUpperCase()}
					</Text>
				</View>
				<View style={styles.headerInfo}>
					<Text style={[styles.userName, { color: colors.text }]}>
						{user?.name || "User"}
					</Text>
					<Text style={[styles.workspaceLabel, { color: colors.textSecondary }]}>
						Personal Workspace
					</Text>
				</View>
			</View>

			{/* Quick Switcher */}
			<Pressable
				style={[styles.quickSwitcher, { backgroundColor: colors.background, borderColor: colors.border }]}
				onPress={() => { onClose(); onOpenQuickSwitcher(); }}
			>
				<Text style={[styles.quickSwitcherText, { color: colors.textSecondary }]}>
					{"\uD83D\uDD0D"} Quick search...
				</Text>
				<Text style={[styles.shortcutHint, { color: colors.textSecondary }]}>{"\u2318"}K</Text>
			</Pressable>

			<ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
				{/* Module Links */}
				<View style={styles.section}>
					{[
						{ icon: "\uD83C\uDFE0", label: "Home", route: "/(tabs)" },
						{ icon: "\u2611", label: "Tasks", route: "/(tabs)/tasks" },
						{ icon: "\uD83D\uDED2", label: "Shopping", route: "/(tabs)/shopping" },
						{ icon: "\uD83D\uDCC5", label: "Calendar", route: "/(tabs)/calendar" },
						{ icon: "\uD83C\uDF73", label: "Recipes", route: "/(tabs)/recipes" },
					].map((item) => (
						<Pressable
							key={item.route}
							style={styles.navItem}
							onPress={() => navigate(item.route)}
						>
							<Text style={styles.navIcon}>{item.icon}</Text>
							<Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
						</Pressable>
					))}
				</View>

				{/* Favorites */}
				{favorites.length > 0 && (
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
							Favorites
						</Text>
						{favorites.map((fav) => (
							<Pressable
								key={fav.id}
								style={styles.navItem}
								onPress={() => navigate(fav.route)}
							>
								<Text style={styles.navIcon}>{fav.icon}</Text>
								<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
									{fav.title}
								</Text>
							</Pressable>
						))}
					</View>
				)}

				{/* Databases */}
				{databases && databases.length > 0 && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
								Databases
							</Text>
							<Pressable onPress={() => navigate("/(tabs)/databases")}>
								<Text style={[styles.seeAll, { color: colors.tint }]}>All</Text>
							</Pressable>
						</View>
						{databases.slice(0, 8).map((db) => (
							<Pressable
								key={db.id}
								style={styles.navItem}
								onPress={() => navigate(`/(tabs)/databases/${db.id}`)}
							>
								<Text style={styles.navIcon}>{db.icon || "\uD83D\uDDC3"}</Text>
								<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
									{db.name}
								</Text>
								<Text style={[styles.navCount, { color: colors.textSecondary }]}>
									{db.rowCount}
								</Text>
							</Pressable>
						))}
					</View>
				)}

				{/* Notes / Pages */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
							Pages
						</Text>
						<Pressable onPress={() => navigate("/(tabs)/notes")}>
							<Text style={[styles.seeAll, { color: colors.tint }]}>All</Text>
						</Pressable>
					</View>

					{/* Folders */}
					{folders?.map((folder) => (
						<Pressable
							key={folder.id}
							style={styles.navItem}
							onPress={() => navigate("/(tabs)/notes")}
						>
							<Text style={styles.navIcon}>{"\uD83D\uDCC1"}</Text>
							<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
								{folder.name}
							</Text>
						</Pressable>
					))}

					{/* Notes (ungrouped, limit to 10) */}
					{notes
						?.filter((n) => n.isPinned)
						.slice(0, 5)
						.map((note) => (
							<Pressable
								key={note.id}
								style={styles.navItem}
								onPress={() => navigate(`/(tabs)/notes/${note.id}`)}
							>
								<Text style={styles.navIcon}>{"\uD83D\uDCCC"}</Text>
								<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
									{note.title}
								</Text>
							</Pressable>
						))}

					{notes
						?.filter((n) => !n.isPinned)
						.slice(0, 5)
						.map((note) => (
							<Pressable
								key={note.id}
								style={styles.navItem}
								onPress={() => navigate(`/(tabs)/notes/${note.id}`)}
							>
								<Text style={styles.navIcon}>{"\uD83D\uDCC4"}</Text>
								<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
									{note.title}
								</Text>
							</Pressable>
						))}
				</View>

				{/* Recents */}
				{recents.length > 0 && (
					<View style={styles.section}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
							Recent
						</Text>
						{recents.slice(0, 8).map((r) => (
							<Pressable
								key={`${r.id}-${r.timestamp}`}
								style={styles.navItem}
								onPress={() => navigate(r.route)}
							>
								<Text style={styles.navIcon}>{r.icon}</Text>
								<Text style={[styles.navLabel, { color: colors.text }]} numberOfLines={1}>
									{r.title}
								</Text>
							</Pressable>
						))}
					</View>
				)}

				{/* Settings */}
				<View style={[styles.section, { marginBottom: 40 }]}>
					<Pressable style={styles.navItem} onPress={() => navigate("/settings")}>
						<Text style={styles.navIcon}>{"\u2699"}</Text>
						<Text style={[styles.navLabel, { color: colors.text }]}>Settings</Text>
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 16,
		paddingTop: 60,
		paddingBottom: 16,
		borderBottomWidth: 1,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
	headerInfo: { flex: 1 },
	userName: { fontSize: 15, fontWeight: "700" },
	workspaceLabel: { fontSize: 12, marginTop: 1 },
	quickSwitcher: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginHorizontal: 12,
		marginTop: 12,
		marginBottom: 4,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	quickSwitcherText: { fontSize: 13 },
	shortcutHint: { fontSize: 11 },
	body: { flex: 1 },
	section: { paddingHorizontal: 8, paddingTop: 12 },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 8,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 4,
		paddingHorizontal: 8,
	},
	seeAll: { fontSize: 12, fontWeight: "500" },
	navItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 8,
		paddingHorizontal: 8,
		borderRadius: 6,
	},
	navIcon: { fontSize: 16, width: 24, textAlign: "center" },
	navLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
	navCount: { fontSize: 12 },
});
