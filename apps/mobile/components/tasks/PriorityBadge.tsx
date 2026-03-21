import { StyleSheet, Text, View } from "react-native";

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
	1: { label: "P1", color: "#FFFFFF", bg: "#EF4444" },
	2: { label: "P2", color: "#FFFFFF", bg: "#F59E0B" },
	3: { label: "P3", color: "#FFFFFF", bg: "#3B82F6" },
	4: { label: "P4", color: "#64748B", bg: "#E2E8F0" },
};

export function PriorityBadge({ priority }: { priority: number }) {
	const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[4];

	return (
		<View style={[styles.badge, { backgroundColor: config.bg }]}>
			<Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		alignSelf: "flex-start",
	},
	text: {
		fontSize: 11,
		fontWeight: "700",
	},
});
