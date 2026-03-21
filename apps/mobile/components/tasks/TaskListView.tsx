import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/tasks";

interface TaskListViewProps {
	tasks: Task[];
	onPressTask: (task: Task) => void;
	onToggleStatus: (task: Task) => void;
}

export function TaskListView({ tasks, onPressTask, onToggleStatus }: TaskListViewProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	// Only show root tasks (no subtasks)
	const rootTasks = tasks.filter((t) => !t.parentTaskId);

	return (
		<FlatList
			data={rootTasks}
			keyExtractor={(item) => item.id}
			renderItem={({ item, index }) => (
				<Animated.View entering={FadeIn.duration(200).delay(index * 30)}>
					<TaskCard task={item} onPress={onPressTask} onToggleStatus={onToggleStatus} />
				</Animated.View>
			)}
			contentContainerStyle={styles.list}
			showsVerticalScrollIndicator={false}
			ListEmptyComponent={
				<View style={styles.empty}>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks yet</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
						Tap + to create your first task
					</Text>
				</View>
			}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		padding: 16,
		paddingBottom: 100,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 120,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "700",
	},
	emptySubtitle: {
		fontSize: 14,
		marginTop: 6,
	},
});
