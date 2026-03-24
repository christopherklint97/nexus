import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useOptimizeRoute } from "@/lib/shopping";
import type { OptimizedRoute, ShoppingList } from "@/lib/shopping";

interface RoutePlannerProps {
	visible: boolean;
	lists: ShoppingList[];
	onClose: () => void;
}

export function RoutePlanner({ visible, lists, onClose }: RoutePlannerProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const optimizeRoute = useOptimizeRoute();

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [route, setRoute] = useState<OptimizedRoute | null>(null);

	const toggleList = (id: string) => {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		setSelectedIds(next);
		setRoute(null);
	};

	const handleOptimize = () => {
		if (selectedIds.size === 0) return;
		optimizeRoute.mutate({ listIds: [...selectedIds] }, { onSuccess: (data) => setRoute(data) });
	};

	const handleClose = () => {
		setSelectedIds(new Set());
		setRoute(null);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={handleClose}>
						<Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Close</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Route Planner</Text>
					<View style={{ width: 50 }} />
				</View>

				<ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
					{/* Store selection */}
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select Stores</Text>
					{lists.map((list) => (
						<Pressable
							key={list.id}
							style={[
								styles.storeRow,
								{
									backgroundColor: selectedIds.has(list.id) ? colors.tint + "10" : colors.surface,
									borderColor: selectedIds.has(list.id) ? colors.tint : colors.border,
								},
							]}
							onPress={() => toggleList(list.id)}
						>
							<View
								style={[
									styles.storeCheck,
									{
										borderColor: selectedIds.has(list.id) ? colors.tint : colors.border,
										backgroundColor: selectedIds.has(list.id) ? colors.tint : "transparent",
									},
								]}
							>
								{selectedIds.has(list.id) && <Text style={styles.checkmark}>✓</Text>}
							</View>
							<View style={styles.storeInfo}>
								<Text style={[styles.storeRowName, { color: colors.text }]}>{list.storeName}</Text>
								<Text style={[styles.storeRowItems, { color: colors.textSecondary }]}>
									{list.itemCount} items · ${list.estimatedTotal.toFixed(2)}
								</Text>
							</View>
						</Pressable>
					))}

					{/* Optimize button */}
					<Pressable
						style={[
							styles.optimizeButton,
							{
								backgroundColor: selectedIds.size >= 1 ? colors.tint : colors.border,
							},
						]}
						onPress={handleOptimize}
						disabled={selectedIds.size === 0 || optimizeRoute.isPending}
					>
						{optimizeRoute.isPending ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<Text style={styles.optimizeText}>
								Optimize Route ({selectedIds.size} store{selectedIds.size !== 1 ? "s" : ""})
							</Text>
						)}
					</Pressable>

					{/* Route results */}
					{route && (
						<View style={styles.routeResults}>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
								Optimized Route
							</Text>

							{/* Summary */}
							<View
								style={[
									styles.summaryCard,
									{ backgroundColor: colors.surface, borderColor: colors.border },
								]}
							>
								<View style={styles.summaryRow}>
									<Text style={[styles.summaryValue, { color: colors.text }]}>
										{route.summary.storeCount}
									</Text>
									<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>stores</Text>
								</View>
								<View style={styles.summaryRow}>
									<Text style={[styles.summaryValue, { color: colors.text }]}>
										{route.summary.totalItems}
									</Text>
									<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>items</Text>
								</View>
								<View style={styles.summaryRow}>
									<Text style={[styles.summaryValue, { color: colors.text }]}>
										${route.summary.totalEstimated.toFixed(2)}
									</Text>
									<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>total</Text>
								</View>
							</View>

							{/* Stops */}
							{route.stops.map((stop, idx) => (
								<View key={stop.listId} style={styles.stopRow}>
									<View style={[styles.stopNumber, { backgroundColor: colors.tint }]}>
										<Text style={styles.stopNumberText}>{stop.order}</Text>
									</View>
									<View
										style={[
											styles.stopLine,
											idx === route.stops.length - 1 && { backgroundColor: "transparent" },
											{ backgroundColor: colors.border },
										]}
									/>
									<View style={styles.stopInfo}>
										<Text style={[styles.stopName, { color: colors.text }]}>{stop.storeName}</Text>
										{stop.storeAddress && (
											<Text style={[styles.stopAddress, { color: colors.textSecondary }]}>
												{stop.storeAddress}
											</Text>
										)}
										<Text style={[styles.stopMeta, { color: colors.textSecondary }]}>
											{stop.uncheckedCount} items remaining · ${stop.estimatedSpend.toFixed(2)}
										</Text>
									</View>
								</View>
							))}
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	headerBtn: { fontSize: 16, fontWeight: "500" },
	headerTitle: { fontSize: 16, fontWeight: "700" },
	body: { padding: 20 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 10,
		marginTop: 4,
	},
	storeRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 8,
		gap: 12,
	},
	storeCheck: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
	storeInfo: { flex: 1 },
	storeRowName: { fontSize: 15, fontWeight: "600" },
	storeRowItems: { fontSize: 12, marginTop: 2 },
	optimizeButton: {
		height: 48,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 16,
		marginBottom: 8,
	},
	optimizeText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
	routeResults: { marginTop: 16 },
	summaryCard: {
		flexDirection: "row",
		justifyContent: "space-around",
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 20,
	},
	summaryRow: { alignItems: "center" },
	summaryValue: { fontSize: 20, fontWeight: "800" },
	summaryLabel: { fontSize: 12, marginTop: 2 },
	stopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 4,
	},
	stopNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1,
	},
	stopNumberText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
	stopLine: {
		position: "absolute",
		left: 13,
		top: 28,
		bottom: -4,
		width: 2,
	},
	stopInfo: {
		flex: 1,
		marginLeft: 12,
		paddingBottom: 20,
	},
	stopName: { fontSize: 15, fontWeight: "600" },
	stopAddress: { fontSize: 13, marginTop: 2 },
	stopMeta: { fontSize: 12, marginTop: 4 },
});
