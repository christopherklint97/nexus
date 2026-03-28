import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
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
import { useAddRecipeToList } from "@/lib/recipes";
import { useShoppingListsQuery } from "@/lib/shopping";
import { useWorkspaceStore } from "@/stores/workspace";

interface Props {
	visible: boolean;
	onClose: () => void;
	recipeId: string;
	recipeTitle: string;
}

export function AddToListSheet({ visible, onClose, recipeId, recipeTitle }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
	const { data: lists } = useShoppingListsQuery(workspaceId || "");
	const addToList = useAddRecipeToList();
	const [selectedListId, setSelectedListId] = useState<string | null>(null);
	const [scale, setScale] = useState("1");

	const handleAdd = () => {
		if (!selectedListId) {
			Alert.alert("Select a list", "Pick a shopping list to add ingredients to.");
			return;
		}

		addToList.mutate(
			{ recipeId, listId: selectedListId, scale: Number(scale) || 1 },
			{
				onSuccess: (data) => {
					Alert.alert(
						"Added!",
						`${data.itemsAdded} ingredients added to ${data.listName}.`,
					);
					onClose();
				},
			},
		);
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={onClose}>
						<Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Add to List</Text>
					<Pressable onPress={handleAdd} disabled={addToList.isPending}>
						{addToList.isPending ? (
							<ActivityIndicator size="small" color={colors.tint} />
						) : (
							<Text style={[styles.saveText, { color: colors.tint }]}>Add</Text>
						)}
					</Pressable>
				</View>

				<ScrollView style={styles.body}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>
						Adding ingredients from "{recipeTitle}"
					</Text>

					{/* Scale */}
					<View style={styles.scaleRow}>
						<Text style={[styles.scaleLabel, { color: colors.text }]}>Scale</Text>
						<View style={styles.scaleButtons}>
							{["0.5", "1", "2", "3"].map((s) => (
								<Pressable
									key={s}
									style={[
										styles.scaleChip,
										{
											backgroundColor: scale === s ? colors.tint : colors.surface,
											borderColor: scale === s ? colors.tint : colors.border,
										},
									]}
									onPress={() => setScale(s)}
								>
									<Text
										style={{
											color: scale === s ? "#FFF" : colors.text,
											fontSize: 14,
											fontWeight: "600",
										}}
									>
										{s}x
									</Text>
								</Pressable>
							))}
							<TextInput
								style={[
									styles.scaleInput,
									{
										backgroundColor: colors.surface,
										borderColor: colors.border,
										color: colors.text,
									},
								]}
								placeholder="Custom"
								placeholderTextColor={colors.textSecondary}
								value={["0.5", "1", "2", "3"].includes(scale) ? "" : scale}
								onChangeText={(v) => setScale(v)}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					{/* Shopping Lists */}
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Select a list</Text>
					{(!lists || lists.length === 0) && (
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							No shopping lists found. Create one first.
						</Text>
					)}
					{lists?.map((list) => (
						<Pressable
							key={list.id}
							style={[
								styles.listRow,
								{
									backgroundColor:
										selectedListId === list.id ? colors.tint + "15" : colors.surface,
									borderColor: selectedListId === list.id ? colors.tint : colors.border,
								},
							]}
							onPress={() => setSelectedListId(list.id)}
						>
							<View>
								<Text style={[styles.listName, { color: colors.text }]}>{list.name}</Text>
								<Text style={[styles.listStore, { color: colors.textSecondary }]}>
									{list.storeName} - {list.itemCount} items
								</Text>
							</View>
							{selectedListId === list.id && (
								<Text style={{ color: colors.tint, fontSize: 18 }}>{"\u2713"}</Text>
							)}
						</Pressable>
					))}
				</ScrollView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
	},
	cancelText: { fontSize: 15 },
	headerTitle: { fontSize: 17, fontWeight: "700" },
	saveText: { fontSize: 15, fontWeight: "600" },
	body: { flex: 1, padding: 20 },
	label: { fontSize: 14, marginBottom: 20 },
	scaleRow: { marginBottom: 24 },
	scaleLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
	scaleButtons: { flexDirection: "row", gap: 8 },
	scaleChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	scaleInput: {
		width: 70,
		height: 36,
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: 8,
		fontSize: 14,
	},
	sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
	emptyText: { fontSize: 14, fontStyle: "italic" },
	listRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 8,
	},
	listName: { fontSize: 15, fontWeight: "600" },
	listStore: { fontSize: 12, marginTop: 2 },
});
