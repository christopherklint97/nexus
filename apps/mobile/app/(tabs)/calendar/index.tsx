import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AgendaView } from "@/components/calendar/AgendaView";
import { CreateEventSheet } from "@/components/calendar/CreateEventSheet";
import { MonthView } from "@/components/calendar/MonthView";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { api } from "@/lib/api";
import { endOfMonth, startOfMonth, useCalendarEvents, useCalendarStatus } from "@/lib/calendar";
import { useTasksQuery } from "@/lib/tasks";
import { useWorkspaceStore } from "@/stores/workspace";

type ViewMode = "month" | "agenda";

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export default function CalendarScreen() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

	const [viewMode, setViewMode] = useState<ViewMode>("month");
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [showCreateEvent, setShowCreateEvent] = useState(false);

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const timeMin = startOfMonth(currentDate).toISOString();
	const timeMax = endOfMonth(currentDate).toISOString();

	const { data: calendarStatus } = useCalendarStatus();
	const isConnected = calendarStatus?.connected ?? false;

	const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(
		timeMin,
		timeMax,
		isConnected,
	);

	const { data: tasks = [] } = useTasksQuery({
		workspaceId: workspaceId || "",
		sort: "due_date",
		order: "asc",
	});

	// Task due dates for month view dots
	const taskDueDates = useMemo(
		() => tasks.filter((t) => t.dueDate).map((t) => new Date(t.dueDate!)),
		[tasks],
	);

	const navigateMonth = (delta: number) => {
		const next = new Date(year, month + delta, 1);
		setCurrentDate(next);
	};

	const handleConnectGoogle = async () => {
		try {
			const res = await api.get("/api/calendar/google/auth");
			const json = await res.json();
			if (json.data?.url) {
				Linking.openURL(json.data.url);
			}
		} catch {
			// handle error
		}
	};

	if (!workspaceId) {
		return (
			<>
				<Stack.Screen options={{ title: "Calendar" }} />
				<View style={[styles.center, { backgroundColor: colors.background }]}>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>No workspace</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: "Calendar",
					headerRight: () => (
						<View style={styles.headerActions}>
							<Pressable
								style={[styles.headerChip, { borderColor: colors.border }]}
								onPress={() => setViewMode(viewMode === "month" ? "agenda" : "month")}
							>
								<Text style={[styles.headerChipText, { color: colors.textSecondary }]}>
									{viewMode === "month" ? "Agenda" : "Month"}
								</Text>
							</Pressable>
						</View>
					),
				}}
			/>

			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Connect prompt */}
				{!isConnected && (
					<Animated.View
						entering={FadeIn.duration(300)}
						style={[
							styles.connectBanner,
							{ backgroundColor: colors.tint + "10", borderColor: colors.tint + "30" },
						]}
					>
						<Text style={[styles.connectText, { color: colors.text }]}>
							Connect Google Calendar to see your events
						</Text>
						<Pressable
							style={[styles.connectBtn, { backgroundColor: colors.tint }]}
							onPress={handleConnectGoogle}
						>
							<Text style={styles.connectBtnText}>Connect</Text>
						</Pressable>
					</Animated.View>
				)}

				{/* Month navigation */}
				<View style={[styles.monthNav, { borderBottomColor: colors.border }]}>
					<Pressable onPress={() => navigateMonth(-1)} style={styles.navBtn}>
						<Text style={[styles.navArrow, { color: colors.textSecondary }]}>‹</Text>
					</Pressable>
					<Pressable onPress={() => setCurrentDate(new Date())} style={styles.monthLabel}>
						<Text style={[styles.monthText, { color: colors.text }]}>
							{MONTH_NAMES[month]} {year}
						</Text>
					</Pressable>
					<Pressable onPress={() => navigateMonth(1)} style={styles.navBtn}>
						<Text style={[styles.navArrow, { color: colors.textSecondary }]}>›</Text>
					</Pressable>
				</View>

				{eventsLoading && isConnected ? (
					<View style={styles.center}>
						<ActivityIndicator color={colors.tint} />
					</View>
				) : viewMode === "month" ? (
					<View style={styles.monthContent}>
						<MonthView
							year={year}
							month={month}
							events={events}
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
							taskDueDates={taskDueDates}
						/>
						<View style={[styles.agendaDivider, { borderTopColor: colors.border }]}>
							<AgendaView date={selectedDate} events={events} tasks={tasks} />
						</View>
					</View>
				) : (
					<AgendaView date={selectedDate} events={events} tasks={tasks} />
				)}

				{/* FAB */}
				<Pressable
					style={[styles.fab, { backgroundColor: colors.tint }]}
					onPress={() => setShowCreateEvent(true)}
				>
					<Text style={styles.fabIcon}>+</Text>
				</Pressable>
			</View>

			<CreateEventSheet
				visible={showCreateEvent}
				initialDate={selectedDate}
				onClose={() => setShowCreateEvent(false)}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	center: { flex: 1, alignItems: "center", justifyContent: "center" },
	emptyTitle: { fontSize: 18, fontWeight: "700" },
	headerActions: { flexDirection: "row", gap: 6, marginRight: 4 },
	headerChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
	headerChipText: { fontSize: 13, fontWeight: "600" },
	connectBanner: {
		margin: 16,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	connectText: { fontSize: 14, fontWeight: "500", flex: 1 },
	connectBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
	connectBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
	monthNav: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	navBtn: { padding: 8 },
	navArrow: { fontSize: 24, fontWeight: "300" },
	monthLabel: { alignItems: "center" },
	monthText: { fontSize: 17, fontWeight: "700" },
	monthContent: { flex: 1 },
	agendaDivider: { flex: 1, borderTopWidth: 1, marginTop: 8 },
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
