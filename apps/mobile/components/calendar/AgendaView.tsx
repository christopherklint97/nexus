import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { formatTime, isSameDay, EVENT_COLORS } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/tasks";

interface AgendaItem {
	type: "event" | "task";
	id: string;
	title: string;
	startTime: string;
	endTime?: string;
	color: string;
	allDay?: boolean;
	status?: string;
}

interface AgendaViewProps {
	date: Date;
	events: CalendarEvent[];
	tasks?: Task[];
	onPressEvent?: (event: CalendarEvent) => void;
	onPressTask?: (task: Task) => void;
}

export function AgendaView({ date, events, tasks = [], onPressEvent, onPressTask }: AgendaViewProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	// Filter events for this date
	const dayEvents = events.filter((e) => isSameDay(new Date(e.startDateTime), date));

	// Filter tasks due this date
	const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));

	// Combine into agenda items
	const items: AgendaItem[] = [
		...dayEvents.map((e) => ({
			type: "event" as const,
			id: e.id,
			title: e.title,
			startTime: e.startDateTime,
			endTime: e.endDateTime,
			color: e.colorId ? (EVENT_COLORS[e.colorId] || colors.tint) : colors.tint,
			allDay: e.allDay,
		})),
		...dayTasks.map((t) => ({
			type: "task" as const,
			id: t.id,
			title: t.title,
			startTime: t.dueDate!,
			color: colors.warning,
			status: t.status,
		})),
	].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

	const dateLabel = date.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<View style={styles.container}>
			<Text style={[styles.dateLabel, { color: colors.text }]}>{dateLabel}</Text>

			{items.length === 0 ? (
				<View style={styles.empty}>
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing scheduled</Text>
				</View>
			) : (
				<FlatList
					data={items}
					keyExtractor={(item) => `${item.type}-${item.id}`}
					renderItem={({ item }) => (
						<Pressable
							style={[styles.agendaItem, { borderLeftColor: item.color }]}
							onPress={() => {
								if (item.type === "event") {
									const event = dayEvents.find((e) => e.id === item.id);
									if (event && onPressEvent) onPressEvent(event);
								} else {
									const task = dayTasks.find((t) => t.id === item.id);
									if (task && onPressTask) onPressTask(task);
								}
							}}
						>
							<View style={styles.itemContent}>
								<Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
								<View style={styles.itemMeta}>
									{item.allDay ? (
										<Text style={[styles.itemTime, { color: colors.textSecondary }]}>All day</Text>
									) : (
										<Text style={[styles.itemTime, { color: colors.textSecondary }]}>
											{formatTime(item.startTime)}
											{item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
										</Text>
									)}
									{item.type === "task" && (
										<View style={[styles.typeBadge, { backgroundColor: colors.warning + "20" }]}>
											<Text style={[styles.typeText, { color: colors.warning }]}>Task</Text>
										</View>
									)}
								</View>
							</View>
						</Pressable>
					)}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, paddingHorizontal: 16 },
	dateLabel: { fontSize: 16, fontWeight: "700", paddingVertical: 12 },
	empty: { paddingVertical: 40, alignItems: "center" },
	emptyText: { fontSize: 14 },
	agendaItem: {
		borderLeftWidth: 3,
		paddingLeft: 12,
		paddingVertical: 10,
		marginBottom: 8,
	},
	itemContent: {},
	itemTitle: { fontSize: 15, fontWeight: "600" },
	itemMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
	itemTime: { fontSize: 13 },
	typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
	typeText: { fontSize: 11, fontWeight: "700" },
});
