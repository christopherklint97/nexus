import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

interface EmptyStateProps {
	icon: string;
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	return (
		<View style={styles.container}>
			<Text style={styles.icon}>{icon}</Text>
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			<Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
			{actionLabel && onAction && (
				<Pressable style={[styles.button, { backgroundColor: colors.tint }]} onPress={onAction}>
					<Text style={styles.buttonText}>{actionLabel}</Text>
				</Pressable>
			)}
		</View>
	);
}

// Pre-built empty states per module

export function EmptyTasks({ onAdd }: { onAdd?: () => void }) {
	return (
		<EmptyState
			icon={"\u2611\uFE0F"}
			title="No tasks yet"
			description="Stay on top of everything. Add your first task to get started."
			actionLabel="Add Task"
			onAction={onAdd}
		/>
	);
}

export function EmptyNotes({ onAdd }: { onAdd?: () => void }) {
	return (
		<EmptyState
			icon={"\uD83D\uDCDD"}
			title="No notes yet"
			description="Capture ideas, meeting notes, or anything on your mind."
			actionLabel="New Note"
			onAction={onAdd}
		/>
	);
}

export function EmptyShopping({ onAdd }: { onAdd?: () => void }) {
	return (
		<EmptyState
			icon={"\uD83D\uDED2"}
			title="No shopping lists"
			description="Create a list for your next grocery run."
			actionLabel="New List"
			onAction={onAdd}
		/>
	);
}

export function EmptyRecipes({ onAdd }: { onAdd?: () => void }) {
	return (
		<EmptyState
			icon={"\uD83C\uDF73"}
			title="No recipes yet"
			description="Save your favorite recipes and easily add ingredients to your shopping list."
			actionLabel="Add Recipe"
			onAction={onAdd}
		/>
	);
}

export function EmptyDatabases({ onAdd }: { onAdd?: () => void }) {
	return (
		<EmptyState
			icon={"\uD83D\uDDC3\uFE0F"}
			title="No databases yet"
			description="Databases let you organize anything with custom properties and views."
			actionLabel="New Database"
			onAction={onAdd}
		/>
	);
}

export function EmptyCalendar() {
	return (
		<EmptyState
			icon={"\uD83D\uDCC5"}
			title="No events"
			description="Connect Google Calendar or create events to see them here."
		/>
	);
}

export function EmptySearch() {
	return (
		<EmptyState
			icon={"\uD83D\uDD0D"}
			title="No results"
			description="Try a different search term."
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		paddingTop: 60,
		paddingHorizontal: 40,
	},
	icon: {
		fontSize: 48,
		marginBottom: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 8,
	},
	description: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: "center",
		marginBottom: 20,
	},
	button: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 10,
	},
	buttonText: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "600",
	},
});
