import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { workspaces } from "./users.js";

export const shoppingLists = sqliteTable("shopping_lists", {
	...baseColumns,
	name: text("name").notNull(),
	storeName: text("store_name").notNull(),
	storeAddress: text("store_address"),
	storeLat: real("store_lat"),
	storeLng: real("store_lng"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

export const shoppingItems = sqliteTable("shopping_items", {
	...baseColumns,
	name: text("name").notNull(),
	quantity: real("quantity").notNull().default(1),
	unit: text("unit"),
	estimatedPrice: real("estimated_price"),
	aisle: text("aisle"),
	isChecked: integer("is_checked", { mode: "boolean" }).notNull().default(false),
	listId: text("list_id")
		.notNull()
		.references(() => shoppingLists.id),
});

export const shoppingRoutes = sqliteTable("shopping_routes", {
	...baseColumns,
	name: text("name").notNull(),
	stopsJson: text("stops_json"),
	optimizedOrder: text("optimized_order"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});
