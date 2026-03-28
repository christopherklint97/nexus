import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getCellDisplayValue, type DatabaseProperty, type DatabaseRow } from "@/lib/databases";

interface Props {
	rows: DatabaseRow[];
	properties: DatabaseProperty[];
	onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
	onAddRow: () => void;
	onDeleteRow: (rowId: string) => void;
}

export function DatabaseListView({ rows, properties, onUpdateCell, onAddRow, onDeleteRow }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const titleProp = properties.find((p) => p.position === 0) || properties[0];
	const detailProps = properties.filter((p) => p.isVisible && p.id !== titleProp?.id).slice(0, 4);

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			{rows.map((row) => (
				<Pressable
					key={row.id}
					style={[styles.row, { borderBottomColor: colors.border }]}
					onLongPress={() => onDeleteRow(row.id)}
				>
					{/* Checkbox (if any checkbox property exists) */}
					{properties
						.filter((p) => p.type === "checkbox")
						.slice(0, 1)
						.map((prop) => (
							<Pressable
								key={prop.id}
								onPress={() => onUpdateCell(row.id, prop.id, !row.values[prop.id])}
								style={styles.checkWrap}
							>
								<View
									style={[
										styles.checkbox,
										{
											borderColor: row.values[prop.id] ? colors.success : colors.border,
											backgroundColor: row.values[prop.id] ? colors.success : "transparent",
										},
									]}
								>
									{row.values[prop.id] ? (
										<Text style={styles.checkmark}>{"\u2713"}</Text>
									) : null}
								</View>
							</Pressable>
						))}

					<View style={styles.rowContent}>
						<Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
							{titleProp
								? getCellDisplayValue(row.values[titleProp.id], titleProp) || "Untitled"
								: "Untitled"}
						</Text>
						{detailProps.length > 0 && (
							<View style={styles.detailRow}>
								{detailProps.map((prop) => {
									const val = row.values[prop.id];
									if (val === null || val === undefined || val === "") return null;
									return (
										<Text
											key={prop.id}
											style={[styles.detailText, { color: colors.textSecondary }]}
											numberOfLines={1}
										>
											{getCellDisplayValue(val, prop)}
										</Text>
									);
								})}
							</View>
						)}
					</View>
				</Pressable>
			))}

			<Pressable style={[styles.addRow, { borderBottomColor: colors.border }]} onPress={onAddRow}>
				<Text style={[styles.addRowText, { color: colors.textSecondary }]}>+ New row</Text>
			</Pressable>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { paddingBottom: 40 },
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 10,
	},
	checkWrap: { paddingRight: 4 },
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkmark: { color: "#FFF", fontSize: 13, fontWeight: "700" },
	rowContent: { flex: 1 },
	rowTitle: { fontSize: 15, fontWeight: "600" },
	detailRow: { flexDirection: "row", gap: 10, marginTop: 3, flexWrap: "wrap" },
	detailText: { fontSize: 12 },
	addRow: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	addRowText: { fontSize: 13, fontWeight: "500" },
});
