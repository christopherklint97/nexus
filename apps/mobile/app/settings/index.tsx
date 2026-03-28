import { Stack, router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { toast } from "@/components/ui/Toast";
import { useCalendarStatus } from "@/lib/calendar";
import { useExportNotesMarkdown } from "@/lib/importexport";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";

export default function SettingsScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { user, logout } = useAuthStore();
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { data: calStatus, refetch: refetchCalStatus } = useCalendarStatus();
	const exportMarkdown = useExportNotesMarkdown();

	const handleExportNotes = () => {
		if (!workspaceId) return;
		exportMarkdown.mutate(workspaceId, {
			onSuccess: (files) => {
				toast.success(`${files.length} notes exported to Markdown`);
			},
			onError: () => toast.error("Export failed"),
		});
	};

	const handleExportWorkspace = async () => {
		if (!workspaceId) return;
		try {
			const res = await api.get(`/api/io/export/workspace?workspaceId=${workspaceId}`);
			const json = await res.json();
			toast.success("Workspace backup created");
		} catch {
			toast.error("Export failed");
		}
	};

	const handleCalendarToggle = async () => {
		if (calStatus?.connected) {
			Alert.alert("Disconnect Google Calendar", "Remove Google Calendar connection?", [
				{ text: "Cancel", style: "cancel" },
				{
					text: "Disconnect",
					style: "destructive",
					onPress: async () => {
						await api.delete("/api/calendar/google/disconnect");
						refetchCalStatus();
					},
				},
			]);
		} else {
			const res = await api.get("/api/calendar/google/auth");
			const json = await res.json();
			if (json.data?.url) {
				Linking.openURL(json.data.url);
			}
		}
	};

	const handleLogout = () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign Out",
				style: "destructive",
				onPress: () => {
					logout();
					router.replace("/(auth)/login");
				},
			},
		]);
	};

	return (
		<>
			<Stack.Screen options={{ title: "Settings" }} />
			<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Profile */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Profile</Text>
					<View
						style={[
							styles.profileCard,
							{ backgroundColor: colors.surface, borderColor: colors.border },
						]}
					>
						<View style={[styles.avatar, { backgroundColor: colors.tint }]}>
							<Text style={styles.avatarText}>{(user?.name || "U").charAt(0).toUpperCase()}</Text>
						</View>
						<View style={styles.profileInfo}>
							<Text style={[styles.profileName, { color: colors.text }]}>
								{user?.name || "User"}
							</Text>
							<Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
								{user?.email || ""}
							</Text>
						</View>
					</View>
				</View>

				{/* Connected Accounts */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
						Connected Accounts
					</Text>
					<Pressable
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
						onPress={handleCalendarToggle}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Google Calendar</Text>
						<View
							style={[
								styles.statusBadge,
								{ backgroundColor: calStatus?.connected ? colors.success + "15" : colors.border },
							]}
						>
							<Text
								style={[
									styles.statusText,
									{ color: calStatus?.connected ? colors.success : colors.textSecondary },
								]}
							>
								{calStatus?.connected ? "Connected" : "Tap to connect"}
							</Text>
						</View>
					</Pressable>
				</View>

				{/* Preferences */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
					<View
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
						<Text style={[styles.rowValue, { color: colors.textSecondary }]}>System</Text>
					</View>
					<View
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Default View (Tasks)</Text>
						<Text style={[styles.rowValue, { color: colors.textSecondary }]}>List</Text>
					</View>
				</View>

				{/* Data */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
					<Pressable
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
						onPress={handleExportNotes}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Export Notes (Markdown)</Text>
						<Text style={[styles.rowValue, { color: colors.tint }]}>{"\u2192"}</Text>
					</Pressable>
					<Pressable
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
						onPress={handleExportWorkspace}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Full Backup (JSON)</Text>
						<Text style={[styles.rowValue, { color: colors.tint }]}>{"\u2192"}</Text>
					</Pressable>
				</View>

				{/* Integrations */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
						Integrations
					</Text>
					<View
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>API Keys</Text>
						<Text style={[styles.rowValue, { color: colors.textSecondary }]}>Manage</Text>
					</View>
					<View
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Webhooks</Text>
						<Text style={[styles.rowValue, { color: colors.textSecondary }]}>Manage</Text>
					</View>
				</View>

				{/* About */}
				<View style={[styles.section, { borderBottomColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
					<View
						style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
					>
						<Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
						<Text style={[styles.rowValue, { color: colors.textSecondary }]}>0.0.1</Text>
					</View>
				</View>

				{/* Sign Out */}
				<Pressable
					style={[styles.signOutBtn, { borderColor: colors.danger }]}
					onPress={handleLogout}
				>
					<Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
				</Pressable>

				<View style={{ height: 40 }} />
			</ScrollView>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	section: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 10,
	},
	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
	profileInfo: { flex: 1 },
	profileName: { fontSize: 17, fontWeight: "700" },
	profileEmail: { fontSize: 13, marginTop: 2 },
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 6,
	},
	rowLabel: { fontSize: 15, fontWeight: "500" },
	rowValue: { fontSize: 14 },
	statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
	statusText: { fontSize: 12, fontWeight: "600" },
	signOutBtn: {
		marginHorizontal: 20,
		marginTop: 24,
		paddingVertical: 14,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: "center",
	},
	signOutText: { fontSize: 15, fontWeight: "600" },
});
