import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface CalendarEvent {
	id: string;
	title: string;
	description: string | null;
	startDateTime: string;
	endDateTime: string;
	allDay: boolean;
	colorId: string | null;
	status: string;
	link: string;
}

export const EVENT_COLORS: Record<string, string> = {
	"1": "#7986CB",
	"2": "#33B679",
	"3": "#8E24AA",
	"4": "#E67C73",
	"5": "#F6BF26",
	"6": "#F4511E",
	"7": "#039BE5",
	"8": "#616161",
	"9": "#3F51B5",
	"10": "#0B8043",
	"11": "#D50000",
};

export function useCalendarStatus() {
	return useQuery({
		queryKey: ["calendar-status"],
		queryFn: async () => {
			const res = await api.get("/api/calendar/status");
			return ((await res.json()).data as { connected: boolean });
		},
	});
}

export function useCalendarEvents(timeMin: string, timeMax: string, enabled = true) {
	return useQuery({
		queryKey: ["calendar-events", timeMin, timeMax],
		queryFn: async () => {
			const params = new URLSearchParams({ timeMin, timeMax });
			const res = await api.get(`/api/calendar/events?${params}`);
			const json = await res.json();
			if (json.error) return [];
			return (json.data || []) as CalendarEvent[];
		},
		enabled,
		staleTime: 5 * 60 * 1000,
	});
}

export function useCreateEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			summary: string;
			description?: string;
			startDateTime: string;
			endDateTime: string;
			colorId?: string;
		}) => {
			const res = await api.post("/api/calendar/events", input);
			return (await res.json()).data as CalendarEvent;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
	});
}

export function useUpdateEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: {
			id: string;
			summary?: string;
			description?: string;
			startDateTime?: string;
			endDateTime?: string;
			colorId?: string;
		}) => {
			const res = await api.patch(`/api/calendar/events/${id}`, input);
			return (await res.json()).data as CalendarEvent;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
	});
}

export function useDeleteEvent() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await api.delete(`/api/calendar/events/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
	});
}

// Date helpers
export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

export function startOfWeek(date: Date): Date {
	const d = new Date(date);
	d.setDate(d.getDate() - d.getDay());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function endOfWeek(date: Date): Date {
	const d = startOfWeek(date);
	d.setDate(d.getDate() + 6);
	d.setHours(23, 59, 59, 999);
	return d;
}

export function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function getDaysInMonth(year: number, month: number): Date[] {
	const days: Date[] = [];
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);

	// Pad start to align with week
	const startPad = firstDay.getDay();
	for (let i = startPad - 1; i >= 0; i--) {
		const d = new Date(year, month, -i);
		days.push(d);
	}

	// Days of month
	for (let i = 1; i <= lastDay.getDate(); i++) {
		days.push(new Date(year, month, i));
	}

	// Pad end to complete week
	const endPad = 7 - (days.length % 7);
	if (endPad < 7) {
		for (let i = 1; i <= endPad; i++) {
			days.push(new Date(year, month + 1, i));
		}
	}

	return days;
}
