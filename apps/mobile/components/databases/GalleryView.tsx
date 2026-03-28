import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { getCellDisplayValue, type DatabaseProperty, type DatabaseRow } from "@/lib/databases";

interface Props {
	rows: DatabaseRow[];
	properties: DatabaseProperty[];
	onAddRow: () => void;
}

export function DatabaseGalleryView({ rows, properties, onAddRow }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const titleProp = properties.find((p) => p.position === 0) || properties[0];
	const previewProps = properties.filter((p) => p.isVisible && p.id !== titleProp?.id).slice(0, 3);

	return (
		<FlatList
			data={rows}
			keyExtractor={(item) => item.id}
			numColumns={2}
			columnWrapperStyle={styles.row}
			contentContainerStyle={styles.list}
			renderItem={({ item }) => (
				<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					{/* Color strip based on first property value */}
					<View style={[styles.cover, { backgroundColor: colors.tint + "15" }]}>
						<Text style={[styles.coverText, { color: colors.tint }]}>
							{titleProp
								? (getCellDisplayValue(item.values[titleProp.id], titleProp) || "U").charAt(0).toUpperCase()
								: "?"}
						</Text>
					</View>
					<View style={styles.cardBody}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
							{titleProp
								? getCellDisplayValue(item.values[titleProp.id], titleProp) || "Untitled"
								: "Untitled"}
						</Text>
						{previewProps.map((prop) => {
							const val = item.values[prop.id];
							if (val === null || val === undefined || val === "") return null;
							return (
								<Text
									key={prop.id}
									style={[styles.cardMeta, { color: colors.textSecondary }]}
									numberOfLines={1}
								>
									{prop.name}: {getCellDisplayValue(val, prop)}
								</Text>
							);
						})}
					</View>
				</View>
			)}
			ListFooterComponent={
				<Pressable style={[styles.addCard, { borderColor: colors.border }]} onPress={onAddRow}>
					<Text style={[styles.addCardText, { color: colors.textSecondary }]}>+ New row</Text>
				</Pressable>
			}
		/>
	);
}

const styles = StyleSheet.create({
	list: { padding: 12 },
	row: { gap: 10, marginBottom: 10 },
	card: {
		flex: 1,
		borderRadius: 10,
		borderWidth: 1,
		overflow: "hidden",
	},
	cover: {
		height: 70,
		alignItems: "center",
		justifyContent: "center",
	},
	coverText: { fontSize: 28, fontWeight: "800" },
	cardBody: { padding: 10 },
	cardTitle: { fontSize: 14, fontWeight: "700" },
	cardMeta: { fontSize: 11, marginTop: 3 },
	addCard: {
		margin: 5,
		padding: 20,
		borderRadius: 10,
		borderWidth: 1,
		borderStyle: "dashed",
		alignItems: "center",
	},
	addCardText: { fontSize: 13, fontWeight: "500" },
});
