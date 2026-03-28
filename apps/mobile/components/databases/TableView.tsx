import { useCallback, useState } from "react";
import {
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
	getCellDisplayValue,
	getPropertyIcon,
	type DatabaseProperty,
	type DatabaseRow,
} from "@/lib/databases";

interface Props {
	rows: DatabaseRow[];
	properties: DatabaseProperty[];
	onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
	onAddRow: () => void;
	onDeleteRow: (rowId: string) => void;
}

export function DatabaseTableView({ rows, properties, onUpdateCell, onAddRow, onDeleteRow }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const visibleProps = properties.filter((p) => p.isVisible);
	const [editingCell, setEditingCell] = useState<{ rowId: string; propId: string } | null>(null);
	const [editValue, setEditValue] = useState("");

	const startEditing = useCallback(
		(rowId: string, propId: string, currentValue: unknown) => {
			setEditingCell({ rowId, propId });
			setEditValue(currentValue != null ? String(currentValue) : "");
		},
		[],
	);

	const commitEdit = useCallback(() => {
		if (!editingCell) return;
		const prop = properties.find((p) => p.id === editingCell.propId);
		let value: unknown = editValue;
		if (prop?.type === "number") value = editValue === "" ? null : Number(editValue);
		else if (prop?.type === "checkbox") value = editValue === "true";
		onUpdateCell(editingCell.rowId, editingCell.propId, value);
		setEditingCell(null);
	}, [editingCell, editValue, properties, onUpdateCell]);

	return (
		<ScrollView horizontal style={styles.container} contentContainerStyle={{ minWidth: "100%" }}>
			<View>
				{/* Header Row */}
				<View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
					<View style={[styles.rowNumCell, { borderRightColor: colors.border }]}>
						<Text style={[styles.headerText, { color: colors.textSecondary }]}>#</Text>
					</View>
					{visibleProps.map((prop) => (
						<View
							key={prop.id}
							style={[styles.headerCell, { borderRightColor: colors.border, width: prop.width || 150 }]}
						>
							<Text style={[styles.propIcon, { color: colors.textSecondary }]}>
								{getPropertyIcon(prop.type)}
							</Text>
							<Text style={[styles.headerText, { color: colors.textSecondary }]} numberOfLines={1}>
								{prop.name}
							</Text>
						</View>
					))}
				</View>

				{/* Data Rows */}
				<ScrollView>
					{rows.map((row, idx) => (
						<View key={row.id} style={[styles.dataRow, { borderBottomColor: colors.border }]}>
							<View style={[styles.rowNumCell, { borderRightColor: colors.border }]}>
								<Text style={[styles.rowNum, { color: colors.textSecondary }]}>{idx + 1}</Text>
							</View>
							{visibleProps.map((prop) => {
								const isEditing =
									editingCell?.rowId === row.id && editingCell?.propId === prop.id;
								const rawValue = row.values[prop.id];

								if (prop.type === "checkbox") {
									return (
										<Pressable
											key={prop.id}
											style={[styles.dataCell, { width: prop.width || 150, borderRightColor: colors.border }]}
											onPress={() => onUpdateCell(row.id, prop.id, !rawValue)}
										>
											<View
												style={[
													styles.checkbox,
													{
														borderColor: rawValue ? colors.success : colors.border,
														backgroundColor: rawValue ? colors.success : "transparent",
													},
												]}
											>
												{rawValue ? (
													<Text style={styles.checkmark}>{"\u2713"}</Text>
												) : null}
											</View>
										</Pressable>
									);
								}

								return (
									<Pressable
										key={prop.id}
										style={[styles.dataCell, { width: prop.width || 150, borderRightColor: colors.border }]}
										onPress={() => startEditing(row.id, prop.id, rawValue)}
									>
										{isEditing ? (
											<TextInput
												style={[styles.cellInput, { color: colors.text }]}
												value={editValue}
												onChangeText={setEditValue}
												onBlur={commitEdit}
												onSubmitEditing={commitEdit}
												autoFocus
												keyboardType={prop.type === "number" ? "decimal-pad" : "default"}
											/>
										) : (
											<Text
												style={[styles.cellText, { color: colors.text }]}
												numberOfLines={1}
											>
												{getCellDisplayValue(rawValue, prop)}
											</Text>
										)}
									</Pressable>
								);
							})}
						</View>
					))}

					{/* Add Row Button */}
					<Pressable style={[styles.addRow, { borderBottomColor: colors.border }]} onPress={onAddRow}>
						<Text style={[styles.addRowText, { color: colors.textSecondary }]}>+ New row</Text>
					</Pressable>
				</ScrollView>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	headerRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		minHeight: 36,
	},
	rowNumCell: {
		width: 40,
		alignItems: "center",
		justifyContent: "center",
		borderRightWidth: 1,
	},
	headerCell: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 8,
		borderRightWidth: 1,
		height: 36,
	},
	propIcon: { fontSize: 12 },
	headerText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
	dataRow: {
		flexDirection: "row",
		borderBottomWidth: StyleSheet.hairlineWidth,
		minHeight: 36,
	},
	rowNum: { fontSize: 12 },
	dataCell: {
		paddingHorizontal: 8,
		justifyContent: "center",
		borderRightWidth: StyleSheet.hairlineWidth,
		minHeight: 36,
	},
	cellText: { fontSize: 14 },
	cellInput: { fontSize: 14, flex: 1, padding: 0 },
	checkbox: {
		width: 18,
		height: 18,
		borderRadius: 3,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
	checkmark: { color: "#FFF", fontSize: 12, fontWeight: "700" },
	addRow: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	addRowText: { fontSize: 13, fontWeight: "500" },
});
