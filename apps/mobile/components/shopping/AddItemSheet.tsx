import { useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateShoppingItem } from "@/lib/shopping";

interface AddItemSheetProps {
	visible: boolean;
	listId: string;
	onClose: () => void;
}

export function AddItemSheet({ visible, listId, onClose }: AddItemSheetProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const createItem = useCreateShoppingItem();

	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unit, setUnit] = useState("");
	const [price, setPrice] = useState("");
	const [aisle, setAisle] = useState("");

	const handleCreate = () => {
		if (!name.trim()) return;
		createItem.mutate(
			{
				name: name.trim(),
				quantity: Number(quantity) || 1,
				unit: unit.trim() || undefined,
				estimatedPrice: Number(price) || undefined,
				aisle: aisle.trim() || undefined,
				listId,
			},
			{
				onSuccess: () => {
					setName("");
					setQuantity("1");
					setUnit("");
					setPrice("");
					setAisle("");
					onClose();
				},
			},
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={[styles.container, { backgroundColor: colors.background }]}
			>
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Pressable onPress={onClose}>
						<Text style={[styles.headerBtn, { color: colors.textSecondary }]}>Cancel</Text>
					</Pressable>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Add Item</Text>
					<Pressable onPress={handleCreate}>
						<Text
							style={[
								styles.headerBtn,
								{ color: name.trim() ? colors.tint : colors.textSecondary },
							]}
						>
							Add
						</Text>
					</Pressable>
				</View>

				<View style={styles.body}>
					<TextInput
						style={[styles.mainInput, { color: colors.text, borderColor: colors.border }]}
						value={name}
						onChangeText={setName}
						placeholder="Item name"
						placeholderTextColor={colors.textSecondary}
						autoFocus
					/>

					<View style={styles.row}>
						<View style={styles.halfField}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>Qty</Text>
							<TextInput
								style={[styles.input, { color: colors.text, borderColor: colors.border }]}
								value={quantity}
								onChangeText={setQuantity}
								keyboardType="numeric"
								placeholder="1"
								placeholderTextColor={colors.textSecondary}
							/>
						</View>
						<View style={styles.halfField}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>Unit</Text>
							<TextInput
								style={[styles.input, { color: colors.text, borderColor: colors.border }]}
								value={unit}
								onChangeText={setUnit}
								placeholder="e.g. lbs, gal"
								placeholderTextColor={colors.textSecondary}
							/>
						</View>
					</View>

					<View style={styles.row}>
						<View style={styles.halfField}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>Price ($)</Text>
							<TextInput
								style={[styles.input, { color: colors.text, borderColor: colors.border }]}
								value={price}
								onChangeText={setPrice}
								keyboardType="decimal-pad"
								placeholder="0.00"
								placeholderTextColor={colors.textSecondary}
							/>
						</View>
						<View style={styles.halfField}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>Aisle</Text>
							<TextInput
								style={[styles.input, { color: colors.text, borderColor: colors.border }]}
								value={aisle}
								onChangeText={setAisle}
								placeholder="e.g. Dairy"
								placeholderTextColor={colors.textSecondary}
							/>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
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
	mainInput: {
		fontSize: 18,
		fontWeight: "600",
		borderWidth: 1,
		borderRadius: 10,
		padding: 14,
		marginBottom: 16,
	},
	row: { flexDirection: "row", gap: 12, marginBottom: 12 },
	halfField: { flex: 1 },
	label: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 6,
	},
	input: {
		fontSize: 15,
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
	},
});
