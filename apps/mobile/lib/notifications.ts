import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { useNotificationStore } from "@/stores/notifications";

// ─── Push Notification Setup ───

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

export async function registerForPushNotifications(): Promise<string | null> {
	if (!Device.isDevice) {
		console.log("Push notifications require a physical device");
		return null;
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		return null;
	}

	if (Platform.OS === "android") {
		Notifications.setNotificationChannelAsync("default", {
			name: "Default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
		});
	}

	const token = await Notifications.getExpoPushTokenAsync();
	return token.data;
}

// ─── Local Notification Scheduling ───

export async function scheduleDueDateReminder(
	taskId: string,
	taskTitle: string,
	dueDate: string,
	minutesBefore = 30,
): Promise<string | null> {
	const triggerDate = new Date(dueDate);
	triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);

	// Don't schedule if already past
	if (triggerDate.getTime() <= Date.now()) return null;

	const id = await Notifications.scheduleNotificationAsync({
		content: {
			title: "Task Due Soon",
			body: `"${taskTitle}" is due in ${minutesBefore} minutes`,
			data: { type: "due_date", taskId },
			sound: true,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: triggerDate,
		},
	});

	return id;
}

export async function scheduleCalendarEventReminder(
	eventId: string,
	eventTitle: string,
	startDateTime: string,
	minutesBefore = 15,
): Promise<string | null> {
	const triggerDate = new Date(startDateTime);
	triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);

	if (triggerDate.getTime() <= Date.now()) return null;

	const id = await Notifications.scheduleNotificationAsync({
		content: {
			title: "Event Starting Soon",
			body: `"${eventTitle}" starts in ${minutesBefore} minutes`,
			data: { type: "calendar_event", eventId },
			sound: true,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: triggerDate,
		},
	});

	return id;
}

export async function cancelNotification(notifId: string) {
	await Notifications.cancelScheduledNotificationAsync(notifId);
}

export async function cancelAllNotifications() {
	await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Due Date Checker ───
// Call this on app foreground to check for overdue tasks and generate in-app notifications

export function checkOverdueTasks(
	tasks: Array<{ id: string; title: string; dueDate: string | null; status: string }>,
) {
	const { add, notifications } = useNotificationStore.getState();
	const now = new Date();
	const existingIds = new Set(notifications.map((n) => n.entityId));

	for (const task of tasks) {
		if (!task.dueDate || task.status === "done") continue;
		const due = new Date(task.dueDate);
		if (due < now && !existingIds.has(task.id)) {
			add({
				type: "overdue",
				title: "Task Overdue",
				body: `"${task.title}" was due ${formatOverdue(due, now)}`,
				icon: "\u23F0",
				route: "/(tabs)/tasks",
				entityId: task.id,
				entityType: "task",
			});
		}
	}
}

export function checkUpcomingTasks(
	tasks: Array<{ id: string; title: string; dueDate: string | null; status: string }>,
) {
	const { add, notifications } = useNotificationStore.getState();
	const now = new Date();
	const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
	const existingIds = new Set(notifications.map((n) => `upcoming-${n.entityId}`));

	for (const task of tasks) {
		if (!task.dueDate || task.status === "done") continue;
		const due = new Date(task.dueDate);
		if (due > now && due <= in1Hour && !existingIds.has(`upcoming-${task.id}`)) {
			add({
				type: "due_date",
				title: "Due Soon",
				body: `"${task.title}" is due within the hour`,
				icon: "\u26A1",
				route: "/(tabs)/tasks",
				entityId: task.id,
				entityType: "task",
			});
		}
	}
}

function formatOverdue(due: Date, now: Date): string {
	const diffMs = now.getTime() - due.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

// ─── Notification Response Handler ───

export function setupNotificationResponseHandler() {
	const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
		const data = response.notification.request.content.data;
		if (data?.type === "due_date" || data?.type === "overdue") {
			// Deep link to tasks — handled by router
		}
	});
	return subscription;
}
