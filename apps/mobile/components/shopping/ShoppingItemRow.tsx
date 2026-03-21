import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, Layout } from "react-native-reanimated";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import type { ShoppingItem } from "@/lib/shopping";

interface ShoppingItemRowProps {
	item: ShoppingItem;
	onToggle: (item: ShoppingItem) => void;
	onDelete: (item: ShoppingItem) => void;
}

export function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const priceDisplay =
		item.estimatedPrice != null
			? `$${(item.estimatedPrice * item.quantity).toFixed(2)}`
			: null;

	return (
		<Animated.View entering={FadeIn.duration(200)} layout={Layout.springify()}>
			<Pressable
				style={[styles.row, { borderBottomColor: colors.border }]}
				onPress={() => onToggle(item)}
				onLongPress={() => onDelete(item)}
			>
				{/* Checkbox */}
				<View
					style={[
						styles.checkbox,
						{
							borderColor: item.isChecked ? colors.success : colors.border,
							backgroundColor: item.isChecked ? colors.success : "transparent",
						},
					]}
				>
					{item.isChecked && <Text style={styles.checkmark}>✓</Text>}
				</View>

				{/* Item info */}
				<View style={styles.info}>
					<Text
						style={[
							styles.name,
							{ color: colors.text },
							item.isChecked && { textDecorationLine: "line-through", color: colors.textSecondary },
						]}
					>
						{item.name}
					</Text>
					{(item.quantity > 1 || item.unit) && (
						<Text style={[styles.qty, { color: colors.textSecondary }]}>
							{item.quantity}
							{item.unit ? ` ${item.unit}` : ""}
						</Text>
					)}
				</View>

				{/* Price */}
				{priceDisplay && (
					<Text
						style={[
							styles.price,
							{ color: colors.text },
							item.isChecked && { color: colors.textSecondary },
						]}
					>
						{priceDisplay}
					</Text>
				)}
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		gap: 12,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkmark: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "700",
	},
	info: {
		flex: 1,
	},
	name: {
		fontSize: 15,
		fontWeight: "500",
	},
	qty: {
		fontSize: 12,
		marginTop: 2,
	},
	price: {
		fontSize: 14,
		fontWeight: "600",
	},
});
