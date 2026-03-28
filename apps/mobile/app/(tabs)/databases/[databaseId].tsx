import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { DatabaseBoardView } from "@/components/databases/BoardView";
import { DatabaseGalleryView } from "@/components/databases/GalleryView";
import { DatabaseListView } from "@/components/databases/ListView";
import { DatabaseTableView } from "@/components/databases/TableView";
import { FilterSortBar } from "@/components/databases/FilterSortBar";
import { PropertyEditor } from "@/components/databases/PropertyEditor";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useNavigationStore } from "@/stores/navigation";
import {
	useDatabaseDetailQuery,
	useDatabaseRowsQuery,
	useCreateRow,
	useUpdateRow,
	useDeleteRow,
	useCreateView,
	useUpdateView,
	type DatabaseView,
	type ViewType,
} from "@/lib/databases";

const VIEW_ICONS: Record<ViewType, string> = {
	table: "\u2637",
	board: "\u2630",
	calendar: "\uD83D\uDCC5",
	gallery: "\uD83D\uDDBC",
	list: "\u2261",
};

export default function DatabaseDetailScreen() {
	const { databaseId } = useLocalSearchParams<{ databaseId: string }>();
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme];

	const { data: database } = useDatabaseDetailQuery(databaseId);
	const { addRecent } = useNavigationStore();
	const [activeViewId, setActiveViewId] = useState<string | null>(null);

	useEffect(() => {
		if (database) {
			addRecent({
				id: database.id,
				title: database.name,
				icon: database.icon || "\uD83D\uDDC3",
				route: `/(tabs)/databases/${database.id}`,
				type: "database",
			});
		}
	}, [database, addRecent]);

	const activeView =
		database?.views.find((v) => v.id === activeViewId) || database?.views[0] || null;

	const { data: rows } = useDatabaseRowsQuery(databaseId, activeView?.id);
	const createRow = useCreateRow();
	const updateRow = useUpdateRow();
	const deleteRow = useDeleteRow();
	const createView = useCreateView();
	const updateView = useUpdateView();

	const [showNewView, setShowNewView] = useState(false);
	const [showPropertyEditor, setShowPropertyEditor] = useState(false);

	const handleAddRow = useCallback(() => {
		createRow.mutate({ databaseId });
	}, [databaseId, createRow]);

	const handleUpdateCell = useCallback(
		(rowId: string, propertyId: string, value: unknown) => {
			updateRow.mutate({
				databaseId,
				rowId,
				values: { [propertyId]: value },
			});
		},
		[databaseId, updateRow],
	);

	const handleDeleteRow = useCallback(
		(rowId: string) => {
			deleteRow.mutate({ databaseId, rowId });
		},
		[databaseId, deleteRow],
	);

	const handleCreateView = (type: ViewType) => {
		const names: Record<ViewType, string> = {
			table: "Table View",
			board: "Board View",
			calendar: "Calendar View",
			gallery: "Gallery View",
			list: "List View",
		};
		createView.mutate({
			databaseId,
			name: names[type],
			type,
		});
		setShowNewView(false);
	};

	if (!database) {
		return (
			<>
				<Stack.Screen options={{ title: "Database" }} />
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: `${database.icon || ""} ${database.name}`.trim(),
					headerRight: () => (
						<View style={{ flexDirection: "row", gap: 10, marginRight: 16 }}>
							<Pressable onPress={() => setShowPropertyEditor(true)}>
								<Text style={{ fontSize: 16, color: colors.tint }}>Properties</Text>
							</Pressable>
						</View>
					),
				}}
			/>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				{/* Breadcrumbs */}
				<Breadcrumbs
					crumbs={[
						{ label: "Databases", route: "/(tabs)/databases", icon: "\uD83D\uDDC3" },
						{ label: database.name, icon: database.icon || undefined },
						...(activeView ? [{ label: activeView.name }] : []),
					]}
				/>

				{/* View Tabs */}
				<View style={[styles.viewBar, { borderBottomColor: colors.border }]}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewTabs}>
						{database.views.map((view) => (
							<Pressable
								key={view.id}
								style={[
									styles.viewTab,
									{
										backgroundColor:
											activeView?.id === view.id ? colors.tint + "15" : "transparent",
										borderColor:
											activeView?.id === view.id ? colors.tint : "transparent",
									},
								]}
								onPress={() => setActiveViewId(view.id)}
							>
								<Text style={[styles.viewTabIcon]}>
									{VIEW_ICONS[view.type]}
								</Text>
								<Text
									style={[
										styles.viewTabText,
										{
											color: activeView?.id === view.id ? colors.tint : colors.textSecondary,
										},
									]}
								>
									{view.name}
								</Text>
							</Pressable>
						))}
						<Pressable
							style={[styles.viewTab, { borderColor: "transparent" }]}
							onPress={() => setShowNewView(true)}
						>
							<Text style={[styles.viewTabText, { color: colors.textSecondary }]}>+</Text>
						</Pressable>
					</ScrollView>
				</View>

				{/* Filter/Sort Bar */}
				{activeView && (
					<FilterSortBar
						view={activeView}
						properties={database.properties}
						databaseId={databaseId}
					/>
				)}

				{/* View Content */}
				{activeView?.type === "table" && (
					<DatabaseTableView
						rows={rows || []}
						properties={database.properties}
						onUpdateCell={handleUpdateCell}
						onAddRow={handleAddRow}
						onDeleteRow={handleDeleteRow}
					/>
				)}
				{activeView?.type === "board" && (
					<DatabaseBoardView
						rows={rows || []}
						properties={database.properties}
						view={activeView}
						onUpdateCell={handleUpdateCell}
						onAddRow={handleAddRow}
					/>
				)}
				{activeView?.type === "gallery" && (
					<DatabaseGalleryView
						rows={rows || []}
						properties={database.properties}
						onAddRow={handleAddRow}
					/>
				)}
				{activeView?.type === "list" && (
					<DatabaseListView
						rows={rows || []}
						properties={database.properties}
						onUpdateCell={handleUpdateCell}
						onAddRow={handleAddRow}
						onDeleteRow={handleDeleteRow}
					/>
				)}
			</View>

			{/* New View Modal */}
			<Modal visible={showNewView} transparent animationType="fade" onRequestClose={() => setShowNewView(false)}>
				<Pressable style={styles.overlay} onPress={() => setShowNewView(false)}>
					<View style={[styles.menuModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<Text style={[styles.menuTitle, { color: colors.text }]}>Add View</Text>
						{(["table", "board", "gallery", "list"] as ViewType[]).map((type) => (
							<Pressable
								key={type}
								style={[styles.menuItem, { borderBottomColor: colors.border }]}
								onPress={() => handleCreateView(type)}
							>
								<Text style={styles.menuItemIcon}>{VIEW_ICONS[type]}</Text>
								<Text style={[styles.menuItemLabel, { color: colors.text }]}>
									{type.charAt(0).toUpperCase() + type.slice(1)}
								</Text>
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>

			{/* Property Editor */}
			<PropertyEditor
				visible={showPropertyEditor}
				onClose={() => setShowPropertyEditor(false)}
				databaseId={databaseId}
				properties={database.properties}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	loadingText: { textAlign: "center", marginTop: 40, fontSize: 15 },
	viewBar: { borderBottomWidth: 1 },
	viewTabs: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
	viewTab: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		borderWidth: 1,
	},
	viewTabIcon: { fontSize: 14 },
	viewTabText: { fontSize: 13, fontWeight: "600" },
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "center",
		alignItems: "center",
	},
	menuModal: {
		width: 250,
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
	},
	menuTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	menuItemIcon: { fontSize: 18, width: 28, textAlign: "center" },
	menuItemLabel: { fontSize: 15, fontWeight: "500" },
});
