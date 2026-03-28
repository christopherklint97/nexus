import { Platform } from "react-native";
import { create } from "zustand";

export interface AppNotification {
	id: string;
	type: "reminder" | "due_date" | "overdue" | "system" | "mention";
	title: string;
	body: string;
	icon: string;
	route?: string; // deep link route
	read: boolean;
	createdAt: string;
	entityId?: string;
	entityType?: string;
}

interface NotificationState {
	notifications: AppNotification[];
	unreadCount: number;
	add: (notification: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
	markRead: (id: string) => void;
	markAllRead: () => void;
	dismiss: (id: string) => void;
	clearAll: () => void;
	hydrate: () => void;
}

const STORAGE_KEY = "nexus_notifications";

function persist(notifications: AppNotification[]) {
	try {
		if (Platform.OS === "web" && typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)));
		}
	} catch {}
}

function load(): AppNotification[] {
	try {
		if (Platform.OS === "web" && typeof localStorage !== "undefined") {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw);
		}
	} catch {}
	return [];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
	notifications: [],
	unreadCount: 0,

	add: (notification) => {
		const entry: AppNotification = {
			...notification,
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			read: false,
			createdAt: new Date().toISOString(),
		};
		const next = [entry, ...get().notifications].slice(0, 100);
		set({ notifications: next, unreadCount: next.filter((n) => !n.read).length });
		persist(next);
	},

	markRead: (id) => {
		const next = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
		set({ notifications: next, unreadCount: next.filter((n) => !n.read).length });
		persist(next);
	},

	markAllRead: () => {
		const next = get().notifications.map((n) => ({ ...n, read: true }));
		set({ notifications: next, unreadCount: 0 });
		persist(next);
	},

	dismiss: (id) => {
		const next = get().notifications.filter((n) => n.id !== id);
		set({ notifications: next, unreadCount: next.filter((n) => !n.read).length });
		persist(next);
	},

	clearAll: () => {
		set({ notifications: [], unreadCount: 0 });
		persist([]);
	},

	hydrate: () => {
		const notifications = load();
		set({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
	},
}));
