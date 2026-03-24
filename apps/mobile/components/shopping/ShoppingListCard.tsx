import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { ShoppingList } from "@/lib/shopping";

interface ShoppingListCardProps {
	list: ShoppingList;
	onPress: (list: ShoppingList) => void;
}

export function ShoppingListCard({ list, onPress }: ShoppingListCardProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const progress = list.itemCount > 0 ? (list.checkedCount / list.itemCount) * 100 : 0;
	const isComplete = list.itemCount > 0 && list.checkedCount === list.itemCount;

	return (
		<Pressable
			style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
			onPress={() => onPress(list)}
		>
			<View style={styles.header}>
				<View style={[styles.storeIcon, { backgroundColor: colors.tint + "15" }]}>
					<Text style={[styles.storeIconText, { color: colors.tint }]}>
						{list.storeName.charAt(0).toUpperCase()}
					</Text>
				</View>
				<View style={styles.headerText}>
					<Text style={[styles.storeName, { color: colors.text }]}>{list.storeName}</Text>
					<Text style={[styles.listName, { color: colors.textSecondary }]}>{list.name}</Text>
				</View>
				{isComplete && (
					<View style={[styles.completeBadge, { backgroundColor: colors.success + "15" }]}>
						<Text style={[styles.completeText, { color: colors.success }]}>Done</Text>
					</View>
				)}
			</View>

			<View style={styles.stats}>
				<View style={styles.stat}>
					<Text style={[styles.statValue, { color: colors.text }]}>
						{list.checkedCount}/{list.itemCount}
					</Text>
					<Text style={[styles.statLabel, { color: colors.textSecondary }]}>items</Text>
				</View>
				{list.estimatedTotal > 0 && (
					<View style={styles.stat}>
						<Text style={[styles.statValue, { color: colors.text }]}>
							${list.estimatedTotal.toFixed(2)}
						</Text>
						<Text style={[styles.statLabel, { color: colors.textSecondary }]}>est.</Text>
					</View>
				)}
			</View>

			{list.itemCount > 0 && (
				<View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
					<View
						style={[
							styles.progressFill,
							{
								backgroundColor: isComplete ? colors.success : colors.tint,
								width: `${progress}%`,
							},
						]}
					/>
				</View>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		borderWidth: 1,
		padding: 16,
		marginBottom: 10,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	storeIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	storeIconText: {
		fontSize: 18,
		fontWeight: "700",
	},
	headerText: {
		flex: 1,
	},
	storeName: {
		fontSize: 16,
		fontWeight: "700",
	},
	listName: {
		fontSize: 13,
		marginTop: 1,
	},
	completeBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	completeText: {
		fontSize: 12,
		fontWeight: "700",
	},
	stats: {
		flexDirection: "row",
		gap: 20,
		marginTop: 12,
	},
	stat: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 4,
	},
	statValue: {
		fontSize: 15,
		fontWeight: "700",
	},
	statLabel: {
		fontSize: 12,
	},
	progressTrack: {
		height: 4,
		borderRadius: 2,
		marginTop: 12,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 2,
	},
});
