import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { create } from "zustand";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// ─── Toast Store ───

export interface ToastMessage {
	id: string;
	type: "success" | "error" | "info";
	message: string;
	duration?: number;
}

interface ToastState {
	toasts: ToastMessage[];
	show: (type: ToastMessage["type"], message: string, duration?: number) => void;
	dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],
	show: (type, message, duration = 3000) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
		setTimeout(() => {
			set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
		}, duration);
	},
	dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Convenience
export const toast = {
	success: (msg: string) => useToastStore.getState().show("success", msg),
	error: (msg: string) => useToastStore.getState().show("error", msg, 5000),
	info: (msg: string) => useToastStore.getState().show("info", msg),
};

// ─── Toast Container (mount in root layout) ───

export function ToastContainer() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const { toasts, dismiss } = useToastStore();

	return (
		<View style={styles.container} pointerEvents="box-none">
			{toasts.map((t) => (
				<ToastItem key={t.id} toast={t} colors={colors} onDismiss={() => dismiss(t.id)} />
			))}
		</View>
	);
}

function ToastItem({
	toast: t,
	colors,
	onDismiss,
}: {
	toast: ToastMessage;
	colors: (typeof Colors)["light"];
	onDismiss: () => void;
}) {
	const translateY = useRef(new Animated.Value(-40)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15 }),
			Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
		]).start();

		// Animate out before removal
		const timer = setTimeout(() => {
			Animated.parallel([
				Animated.timing(translateY, { toValue: -40, duration: 200, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
			]).start();
		}, (t.duration || 3000) - 300);

		return () => clearTimeout(timer);
	}, [translateY, opacity, t.duration]);

	const bgColor =
		t.type === "success"
			? colors.success
			: t.type === "error"
				? colors.danger
				: colors.tint;

	const icon = t.type === "success" ? "\u2713" : t.type === "error" ? "!" : "i";

	return (
		<Animated.View
			style={[styles.toast, { backgroundColor: bgColor, transform: [{ translateY }], opacity }]}
		>
			<View style={styles.iconBadge}>
				<Text style={styles.iconText}>{icon}</Text>
			</View>
			<Text style={styles.toastText} numberOfLines={2}>
				{t.message}
			</Text>
			<Pressable onPress={onDismiss} hitSlop={8}>
				<Text style={styles.dismissText}>{"\u2715"}</Text>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 50,
		left: 16,
		right: 16,
		zIndex: 9999,
		alignItems: "center",
		gap: 8,
	},
	toast: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		width: "100%",
		maxWidth: 400,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 6,
	},
	iconBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.25)",
		alignItems: "center",
		justifyContent: "center",
	},
	iconText: {
		color: "#FFF",
		fontSize: 14,
		fontWeight: "800",
	},
	toastText: {
		flex: 1,
		color: "#FFF",
		fontSize: 14,
		fontWeight: "500",
	},
	dismissText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 14,
		fontWeight: "600",
	},
});
