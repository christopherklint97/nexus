import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
	getCellDisplayValue,
	type DatabaseProperty,
	type DatabaseRow,
	type DatabaseView,
	type SelectOption,
} from "@/lib/databases";

interface Props {
	rows: DatabaseRow[];
	properties: DatabaseProperty[];
	view: DatabaseView;
	onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
	onAddRow: () => void;
}

export function DatabaseBoardView({ rows, properties, view, onUpdateCell, onAddRow }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	// Find the group-by property (should be a select)
	const groupProp = properties.find((p) => p.id === view.groupByPropertyId);
	const titleProp = properties.find((p) => p.position === 0) || properties[0];

	// Get columns from select options or default
	let columns: { id: string; label: string; color: string }[];
	if (groupProp?.type === "select" || groupProp?.type === "multi_select") {
		const options = ((groupProp.config as { options?: SelectOption[] })?.options || []);
		columns = [
			{ id: "__none__", label: "No " + groupProp.name, color: "#94A3B8" },
			...options,
		];
	} else {
		columns = [{ id: "__all__", label: "All", color: colors.tint }];
	}

	// Group rows by column
	const grouped = new Map<string, DatabaseRow[]>();
	for (const col of columns) {
		grouped.set(col.id, []);
	}
	for (const row of rows) {
		const val = groupProp ? String(row.values[groupProp.id] ?? "__none__") : "__all__";
		const bucket = grouped.get(val) || grouped.get("__none__") || [];
		bucket.push(row);
	}

	return (
		<ScrollView horizontal style={styles.container} contentContainerStyle={styles.content}>
			{columns.map((col) => {
				const colRows = grouped.get(col.id) || [];
				return (
					<View
						key={col.id}
						style={[styles.column, { backgroundColor: colors.surface + "80" }]}
					>
						{/* Column Header */}
						<View style={styles.colHeader}>
							<View style={[styles.colDot, { backgroundColor: col.color }]} />
							<Text style={[styles.colTitle, { color: colors.text }]}>{col.label}</Text>
							<Text style={[styles.colCount, { color: colors.textSecondary }]}>
								{colRows.length}
							</Text>
						</View>

						{/* Cards */}
						<ScrollView showsVerticalScrollIndicator={false}>
							{colRows.map((row) => (
								<View
									key={row.id}
									style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
								>
									<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
										{titleProp
											? getCellDisplayValue(row.values[titleProp.id], titleProp) || "Untitled"
											: "Untitled"}
									</Text>
									{/* Show first 2 visible properties */}
									{properties
										.filter((p) => p.isVisible && p.id !== titleProp?.id && p.id !== groupProp?.id)
										.slice(0, 2)
										.map((prop) => {
											const val = row.values[prop.id];
											if (val === null || val === undefined || val === "") return null;
											return (
												<View key={prop.id} style={styles.cardProp}>
													<Text style={[styles.cardPropLabel, { color: colors.textSecondary }]}>
														{prop.name}
													</Text>
													<Text style={[styles.cardPropValue, { color: colors.text }]} numberOfLines={1}>
														{getCellDisplayValue(val, prop)}
													</Text>
												</View>
											);
										})}
								</View>
							))}
							<Pressable style={[styles.addCard, { borderColor: colors.border }]} onPress={onAddRow}>
								<Text style={[styles.addCardText, { color: colors.textSecondary }]}>+ New</Text>
							</Pressable>
						</ScrollView>
					</View>
				);
			})}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { padding: 12, gap: 10 },
	column: {
		width: 260,
		borderRadius: 10,
		padding: 10,
		marginRight: 10,
	},
	colHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 10,
	},
	colDot: { width: 8, height: 8, borderRadius: 4 },
	colTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
	colCount: { fontSize: 12 },
	card: {
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 8,
	},
	cardTitle: { fontSize: 14, fontWeight: "600" },
	cardProp: { marginTop: 6 },
	cardPropLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
	cardPropValue: { fontSize: 13, marginTop: 1 },
	addCard: {
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderStyle: "dashed",
		alignItems: "center",
	},
	addCardText: { fontSize: 13, fontWeight: "500" },
});
