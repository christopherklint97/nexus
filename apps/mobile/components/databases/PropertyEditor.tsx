import { useState } from "react";
import {
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
import {
	OPTION_COLORS,
	getPropertyIcon,
	useCreateProperty,
	useUpdateProperty,
	type DatabaseProperty,
	type PropertyType,
} from "@/lib/databases";

interface Props {
	visible: boolean;
	onClose: () => void;
	databaseId: string;
	properties: DatabaseProperty[];
}

const PROPERTY_TYPES: { type: PropertyType; label: string }[] = [
	{ type: "text", label: "Text" },
	{ type: "number", label: "Number" },
	{ type: "select", label: "Select" },
	{ type: "multi_select", label: "Multi-Select" },
	{ type: "date", label: "Date" },
	{ type: "checkbox", label: "Checkbox" },
	{ type: "url", label: "URL" },
	{ type: "email", label: "Email" },
	{ type: "phone", label: "Phone" },
	{ type: "relation", label: "Relation" },
	{ type: "formula", label: "Formula" },
	{ type: "person", label: "Person" },
];

export function PropertyEditor({ visible, onClose, databaseId, properties }: Props) {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];
	const createProp = useCreateProperty();
	const updateProp = useUpdateProperty();
	const [showAddType, setShowAddType] = useState(false);
	const [editingProp, setEditingProp] = useState<DatabaseProperty | null>(null);
	const [editName, setEditName] = useState("");

	const handleAdd = (type: PropertyType) => {
		setShowAddType(false);
		const defaultNames: Partial<Record<PropertyType, string>> = {
			text: "Text",
			number: "Number",
			select: "Status",
			multi_select: "Tags",
			date: "Date",
			checkbox: "Done",
			url: "URL",
			email: "Email",
		};
		createProp.mutate({
			databaseId,
			name: defaultNames[type] || type,
			type,
			config:
				type === "select" || type === "multi_select"
					? {
							options: [
								{ id: crypto.randomUUID(), label: "Option 1", color: OPTION_COLORS[0] },
								{ id: crypto.randomUUID(), label: "Option 2", color: OPTION_COLORS[1] },
							],
						}
					: undefined,
		});
	};

	const handleRename = () => {
		if (!editingProp || !editName.trim()) return;
		updateProp.mutate({
			databaseId,
			propertyId: editingProp.id,
			name: editName.trim(),
		});
		setEditingProp(null);
	};

	const handleToggleVisibility = (prop: DatabaseProperty) => {
		updateProp.mutate({
			databaseId,
			propertyId: prop.id,
			isVisible: !prop.isVisible,
		});
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: colors.border }]}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Properties</Text>
					<Pressable onPress={onClose}>
						<Text style={[styles.doneText, { color: colors.tint }]}>Done</Text>
					</Pressable>
				</View>

				<ScrollView style={styles.body}>
					{properties.map((prop) => (
						<View key={prop.id} style={[styles.propRow, { borderBottomColor: colors.border }]}>
							<Pressable
								style={styles.propMain}
								onPress={() => {
									setEditingProp(prop);
									setEditName(prop.name);
								}}
							>
								<Text style={[styles.propIcon, { color: colors.textSecondary }]}>
									{getPropertyIcon(prop.type)}
								</Text>
								<View style={styles.propInfo}>
									<Text style={[styles.propName, { color: colors.text }]}>{prop.name}</Text>
									<Text style={[styles.propType, { color: colors.textSecondary }]}>
										{prop.type.replace("_", " ")}
									</Text>
								</View>
							</Pressable>
							<Pressable
								style={[
									styles.visToggle,
									{
										backgroundColor: prop.isVisible ? colors.tint + "15" : colors.border + "50",
									},
								]}
								onPress={() => handleToggleVisibility(prop)}
							>
								<Text
									style={[
										styles.visToggleText,
										{ color: prop.isVisible ? colors.tint : colors.textSecondary },
									]}
								>
									{prop.isVisible ? "Visible" : "Hidden"}
								</Text>
							</Pressable>
						</View>
					))}

					{/* Add Property */}
					<Pressable
						style={[styles.addBtn, { borderColor: colors.border }]}
						onPress={() => setShowAddType(true)}
					>
						<Text style={[styles.addBtnText, { color: colors.tint }]}>+ Add Property</Text>
					</Pressable>
				</ScrollView>

				{/* Add Type Picker */}
				<Modal visible={showAddType} transparent animationType="fade" onRequestClose={() => setShowAddType(false)}>
					<Pressable style={styles.overlay} onPress={() => setShowAddType(false)}>
						<View style={[styles.typePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<Text style={[styles.typePickerTitle, { color: colors.text }]}>Property Type</Text>
							{PROPERTY_TYPES.map((pt) => (
								<Pressable
									key={pt.type}
									style={[styles.typeItem, { borderBottomColor: colors.border }]}
									onPress={() => handleAdd(pt.type)}
								>
									<Text style={[styles.typeItemIcon, { color: colors.textSecondary }]}>
										{getPropertyIcon(pt.type)}
									</Text>
									<Text style={[styles.typeItemLabel, { color: colors.text }]}>{pt.label}</Text>
								</Pressable>
							))}
						</View>
					</Pressable>
				</Modal>

				{/* Rename Modal */}
				<Modal visible={!!editingProp} transparent animationType="fade" onRequestClose={() => setEditingProp(null)}>
					<Pressable style={styles.overlay} onPress={() => setEditingProp(null)}>
						<View style={[styles.renameModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<Text style={[styles.renameTitle, { color: colors.text }]}>Rename Property</Text>
							<TextInput
								style={[styles.renameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
								value={editName}
								onChangeText={setEditName}
								autoFocus
								onSubmitEditing={handleRename}
							/>
							<Pressable style={[styles.renameBtn, { backgroundColor: colors.tint }]} onPress={handleRename}>
								<Text style={styles.renameBtnText}>Save</Text>
							</Pressable>
						</View>
					</Pressable>
				</Modal>
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
	headerTitle: { fontSize: 17, fontWeight: "700" },
	doneText: { fontSize: 15, fontWeight: "600" },
	body: { flex: 1, padding: 16 },
	propRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	propMain: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
	propIcon: { fontSize: 16, width: 28, textAlign: "center" },
	propInfo: { flex: 1 },
	propName: { fontSize: 15, fontWeight: "600" },
	propType: { fontSize: 12, textTransform: "capitalize", marginTop: 1 },
	visToggle: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
	visToggleText: { fontSize: 12, fontWeight: "600" },
	addBtn: {
		marginTop: 16,
		padding: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderStyle: "dashed",
		alignItems: "center",
	},
	addBtnText: { fontSize: 14, fontWeight: "600" },
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	typePicker: {
		width: 280,
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
		maxHeight: 450,
	},
	typePickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
	typeItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	typeItemIcon: { fontSize: 14, width: 24, textAlign: "center" },
	typeItemLabel: { fontSize: 14, fontWeight: "500" },
	renameModal: {
		width: 280,
		borderRadius: 12,
		borderWidth: 1,
		padding: 16,
	},
	renameTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
	renameInput: {
		height: 40,
		borderRadius: 8,
		borderWidth: 1,
		paddingHorizontal: 10,
		fontSize: 15,
		marginBottom: 10,
	},
	renameBtn: {
		height: 36,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	renameBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
