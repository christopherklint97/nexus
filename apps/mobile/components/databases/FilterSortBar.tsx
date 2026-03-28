import { useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	getPropertyIcon,
	useUpdateView,
	type DatabaseProperty,
	type DatabaseView,
	type ViewFilter,
	type ViewSort,
} from "@/lib/databases";

interface Props {
	view: DatabaseView;
	properties: DatabaseProperty[];
	databaseId: string;
}

const OPERATORS = [
	{ value: "equals", label: "=" },
	{ value: "not_equals", label: "\u2260" },
	{ value: "contains", label: "\u2283" },
	{ value: "is_empty", label: "\u2205" },
	{ value: "is_not_empty", label: "\u2260\u2205" },
	{ value: "gt", label: ">" },
	{ value: "lt", label: "<" },
];

export function FilterSortBar({ view, properties, databaseId }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const updateView = useUpdateView();
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [showSortModal, setShowSortModal] = useState(false);

	const filterCount = view.filters?.length || 0;
	const sortCount = view.sorts?.length || 0;

	const addFilter = (propertyId: string) => {
		const newFilters: ViewFilter[] = [
			...(view.filters || []),
			{ propertyId, operator: "is_not_empty" },
		];
		updateView.mutate({ databaseId, viewId: view.id, filters: newFilters });
	};

	const removeFilter = (index: number) => {
		const newFilters = (view.filters || []).filter((_, i) => i !== index);
		updateView.mutate({ databaseId, viewId: view.id, filters: newFilters });
	};

	const addSort = (propertyId: string, direction: "asc" | "desc") => {
		const newSorts: ViewSort[] = [
			...(view.sorts || []),
			{ propertyId, direction },
		];
		updateView.mutate({ databaseId, viewId: view.id, sorts: newSorts });
	};

	const removeSort = (index: number) => {
		const newSorts = (view.sorts || []).filter((_, i) => i !== index);
		updateView.mutate({ databaseId, viewId: view.id, sorts: newSorts });
	};

	return (
		<>
			<View style={[styles.bar, { borderBottomColor: colors.border }]}>
				<Pressable
					style={[
						styles.barBtn,
						{
							backgroundColor: filterCount > 0 ? colors.tint + "15" : "transparent",
							borderColor: filterCount > 0 ? colors.tint : colors.border,
						},
					]}
					onPress={() => setShowFilterModal(true)}
				>
					<Text style={[styles.barBtnText, { color: filterCount > 0 ? colors.tint : colors.textSecondary }]}>
						Filter{filterCount > 0 ? ` (${filterCount})` : ""}
					</Text>
				</Pressable>

				<Pressable
					style={[
						styles.barBtn,
						{
							backgroundColor: sortCount > 0 ? colors.tint + "15" : "transparent",
							borderColor: sortCount > 0 ? colors.tint : colors.border,
						},
					]}
					onPress={() => setShowSortModal(true)}
				>
					<Text style={[styles.barBtnText, { color: sortCount > 0 ? colors.tint : colors.textSecondary }]}>
						Sort{sortCount > 0 ? ` (${sortCount})` : ""}
					</Text>
				</Pressable>

				{/* Active filters/sorts chips */}
				{filterCount > 0 && (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
						{(view.filters || []).map((f, i) => {
							const prop = properties.find((p) => p.id === f.propertyId);
							return (
								<Pressable
									key={`f-${i}`}
									style={[styles.chip, { backgroundColor: colors.tint + "10", borderColor: colors.tint + "30" }]}
									onPress={() => removeFilter(i)}
								>
									<Text style={[styles.chipText, { color: colors.tint }]}>
										{prop?.name || "?"} {OPERATORS.find((o) => o.value === f.operator)?.label || f.operator}
										{f.value != null ? ` ${f.value}` : ""}
										{" \u00D7"}
									</Text>
								</Pressable>
							);
						})}
					</ScrollView>
				)}
			</View>

			{/* Filter Modal */}
			<Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
				<Pressable style={styles.overlay} onPress={() => setShowFilterModal(false)}>
					<View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>Add Filter</Text>
						{properties.filter((p) => p.isVisible).map((prop) => (
							<Pressable
								key={prop.id}
								style={[styles.modalItem, { borderBottomColor: colors.border }]}
								onPress={() => { addFilter(prop.id); setShowFilterModal(false); }}
							>
								<Text style={[styles.modalItemIcon, { color: colors.textSecondary }]}>
									{getPropertyIcon(prop.type)}
								</Text>
								<Text style={[styles.modalItemLabel, { color: colors.text }]}>{prop.name}</Text>
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>

			{/* Sort Modal */}
			<Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
				<Pressable style={styles.overlay} onPress={() => setShowSortModal(false)}>
					<View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
						{properties.filter((p) => p.isVisible).map((prop) => (
							<View key={prop.id} style={[styles.sortRow, { borderBottomColor: colors.border }]}>
								<Text style={[styles.sortPropName, { color: colors.text }]}>
									{getPropertyIcon(prop.type)} {prop.name}
								</Text>
								<View style={styles.sortBtns}>
									<Pressable
										style={[styles.sortBtn, { backgroundColor: colors.background }]}
										onPress={() => { addSort(prop.id, "asc"); setShowSortModal(false); }}
									>
										<Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
											{"\u2191"} Asc
										</Text>
									</Pressable>
									<Pressable
										style={[styles.sortBtn, { backgroundColor: colors.background }]}
										onPress={() => { addSort(prop.id, "desc"); setShowSortModal(false); }}
									>
										<Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>
											{"\u2193"} Desc
										</Text>
									</Pressable>
								</View>
							</View>
						))}
					</View>
				</Pressable>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
	},
	barBtn: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 6,
		borderWidth: 1,
	},
	barBtnText: { fontSize: 12, fontWeight: "600" },
	chipScroll: { flex: 1, marginLeft: 4 },
	chip: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
		borderWidth: 1,
		marginRight: 4,
	},
	chipText: { fontSize: 11, fontWeight: "500" },
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	modal: {
		width: 280,
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
		maxHeight: 400,
	},
	modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
	modalItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	modalItemIcon: { fontSize: 14, width: 24, textAlign: "center" },
	modalItemLabel: { fontSize: 14, fontWeight: "500" },
	sortRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	sortPropName: { fontSize: 14, fontWeight: "500" },
	sortBtns: { flexDirection: "row", gap: 4 },
	sortBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
	sortBtnText: { fontSize: 12, fontWeight: "500" },
});
