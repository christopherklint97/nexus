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
import { useCreateShoppingList } from "@/lib/shopping";

interface CreateListSheetProps {
	visible: boolean;
	workspaceId: string;
	onClose: () => void;
	onCreated: (listId: string) => void;
}

export function CreateListSheet({
	visible,
	workspaceId,
	onClose,
	onCreated,
}: CreateListSheetProps) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const createList = useCreateShoppingList();

	const [storeName, setStoreName] = useState("");
	const [listName, setListName] = useState("");
	const [storeAddress, setStoreAddress] = useState("");

	const handleCreate = () => {
		if (!storeName.trim()) return;
		createList.mutate(
			{
				name: listName.trim() || `${storeName.trim()} List`,
				storeName: storeName.trim(),
				storeAddress: storeAddress.trim() || undefined,
				workspaceId,
			},
			{
				onSuccess: (data) => {
					setStoreName("");
					setListName("");
					setStoreAddress("");
					onCreated(data.id);
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
					<Text style={[styles.headerTitle, { color: colors.text }]}>New List</Text>
					<Pressable onPress={handleCreate}>
						<Text
							style={[
								styles.headerBtn,
								{ color: storeName.trim() ? colors.tint : colors.textSecondary },
							]}
						>
							Create
						</Text>
					</Pressable>
				</View>

				<View style={styles.body}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Store Name *</Text>
					<TextInput
						style={[styles.input, { color: colors.text, borderColor: colors.border }]}
						value={storeName}
						onChangeText={setStoreName}
						placeholder="e.g. Trader Joe's, Costco"
						placeholderTextColor={colors.textSecondary}
						autoFocus
					/>

					<Text style={[styles.label, { color: colors.textSecondary }]}>List Name</Text>
					<TextInput
						style={[styles.input, { color: colors.text, borderColor: colors.border }]}
						value={listName}
						onChangeText={setListName}
						placeholder="e.g. Weekly Groceries"
						placeholderTextColor={colors.textSecondary}
					/>

					<Text style={[styles.label, { color: colors.textSecondary }]}>Store Address</Text>
					<TextInput
						style={[styles.input, { color: colors.text, borderColor: colors.border }]}
						value={storeAddress}
						onChangeText={setStoreAddress}
						placeholder="e.g. 123 Main St"
						placeholderTextColor={colors.textSecondary}
					/>
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
	label: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		fontSize: 16,
		borderWidth: 1,
		borderRadius: 10,
		padding: 14,
	},
});
