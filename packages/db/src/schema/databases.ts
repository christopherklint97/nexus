import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { workspaces } from "./users.js";

// A "database" is a collection of rows with typed properties — like a Notion database.
export const databases = sqliteTable("databases", {
	...baseColumns,
	name: text("name").notNull(),
	description: text("description"),
	icon: text("icon"), // emoji or icon identifier
	coverUrl: text("cover_url"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// Property definitions — the columns/fields of a database.
export const databaseProperties = sqliteTable("database_properties", {
	...baseColumns,
	databaseId: text("database_id")
		.notNull()
		.references(() => databases.id),
	name: text("name").notNull(),
	type: text("type", {
		enum: [
			"text",
			"number",
			"select",
			"multi_select",
			"date",
			"checkbox",
			"url",
			"email",
			"phone",
			"relation",
			"formula",
			"person",
		],
	}).notNull(),
	// JSON config for type-specific settings:
	// select/multi_select: { options: [{ id, label, color }] }
	// relation: { targetDatabaseId, bidirectional }
	// formula: { expression }
	// number: { format: "number" | "currency" | "percent" }
	configJson: text("config_json"),
	position: integer("position").notNull().default(0),
	isVisible: integer("is_visible").notNull().default(1), // boolean
	width: integer("width"), // column width in table view
});

// Saved views — each view has its own layout, filters, sorts, groups.
export const databaseViews = sqliteTable("database_views", {
	...baseColumns,
	databaseId: text("database_id")
		.notNull()
		.references(() => databases.id),
	name: text("name").notNull(),
	type: text("type", {
		enum: ["table", "board", "calendar", "gallery", "list"],
	}).notNull(),
	// JSON config for view-specific settings:
	// board: { groupByPropertyId }
	// calendar: { datePropertyId }
	// gallery: { coverPropertyId }
	configJson: text("config_json"),
	// Saved filter/sort/group state:
	// { filters: [{ propertyId, operator, value }], sorts: [{ propertyId, direction }], groupBy: propertyId }
	filtersJson: text("filters_json"),
	sortsJson: text("sorts_json"),
	groupByPropertyId: text("group_by_property_id"),
	position: integer("position").notNull().default(0),
});

// Database rows — each row stores property values as JSON.
export const databaseRows = sqliteTable("database_rows", {
	...baseColumns,
	databaseId: text("database_id")
		.notNull()
		.references(() => databases.id),
	// Property values stored as { [propertyId]: value }
	// Value types depend on property type:
	// text: string, number: number, select: string (option id),
	// multi_select: string[] (option ids), date: ISO string,
	// checkbox: boolean, url/email/phone: string,
	// relation: string[] (row ids), person: string[] (user ids)
	valuesJson: text("values_json").notNull().default("{}"),
	position: integer("position").notNull().default(0),
});
