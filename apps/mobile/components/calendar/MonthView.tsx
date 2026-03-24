import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { EVENT_COLORS, getDaysInMonth, isSameDay } from "@/lib/calendar";
import type { CalendarEvent } from "@/lib/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthViewProps {
	year: number;
	month: number;
	events: CalendarEvent[];
	selectedDate: Date;
	onSelectDate: (date: Date) => void;
	taskDueDates?: Date[];
}

export function MonthView({
	year,
	month,
	events,
	selectedDate,
	onSelectDate,
	taskDueDates = [],
}: MonthViewProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const today = new Date();
	const days = getDaysInMonth(year, month);

	const eventsByDate = new Map<string, CalendarEvent[]>();
	for (const event of events) {
		const key = new Date(event.startDateTime).toDateString();
		const existing = eventsByDate.get(key) || [];
		existing.push(event);
		eventsByDate.set(key, existing);
	}

	const taskDateSet = new Set(taskDueDates.map((d) => d.toDateString()));

	return (
		<View style={styles.container}>
			{/* Weekday headers */}
			<View style={styles.weekRow}>
				{WEEKDAYS.map((day) => (
					<View key={day} style={styles.weekCell}>
						<Text style={[styles.weekText, { color: colors.textSecondary }]}>{day}</Text>
					</View>
				))}
			</View>

			{/* Day grid */}
			<View style={styles.daysGrid}>
				{days.map((day, idx) => {
					const isCurrentMonth = day.getMonth() === month;
					const isToday = isSameDay(day, today);
					const isSelected = isSameDay(day, selectedDate);
					const dateKey = day.toDateString();
					const dayEvents = eventsByDate.get(dateKey) || [];
					const hasTask = taskDateSet.has(dateKey);

					return (
						<Pressable
							key={idx}
							style={[styles.dayCell, isSelected && { backgroundColor: colors.tint + "15" }]}
							onPress={() => onSelectDate(day)}
						>
							<View style={[styles.dayNumber, isToday && { backgroundColor: colors.tint }]}>
								<Text
									style={[
										styles.dayText,
										{ color: isCurrentMonth ? colors.text : colors.textSecondary },
										isToday && { color: "#FFFFFF", fontWeight: "800" },
									]}
								>
									{day.getDate()}
								</Text>
							</View>

							{/* Event dots */}
							<View style={styles.dots}>
								{dayEvents.slice(0, 3).map((ev, i) => (
									<View
										key={i}
										style={[
											styles.dot,
											{
												backgroundColor: ev.colorId
													? EVENT_COLORS[ev.colorId] || colors.tint
													: colors.tint,
											},
										]}
									/>
								))}
								{hasTask && <View style={[styles.dot, { backgroundColor: colors.warning }]} />}
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { paddingHorizontal: 8 },
	weekRow: { flexDirection: "row", marginBottom: 4 },
	weekCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
	weekText: { fontSize: 12, fontWeight: "600" },
	daysGrid: { flexDirection: "row", flexWrap: "wrap" },
	dayCell: {
		width: `${100 / 7}%`,
		alignItems: "center",
		paddingVertical: 4,
		minHeight: 48,
		borderRadius: 8,
	},
	dayNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	dayText: { fontSize: 14, fontWeight: "500" },
	dots: { flexDirection: "row", gap: 2, marginTop: 2, height: 6 },
	dot: { width: 5, height: 5, borderRadius: 2.5 },
});
