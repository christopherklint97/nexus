import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";

export const users = sqliteTable("users", {
	...baseColumns,
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	passwordHash: text("password_hash").notNull(),
	avatarUrl: text("avatar_url"),
	googleTokenEncrypted: text("google_token_encrypted"),
});

export const workspaces = sqliteTable("workspaces", {
	...baseColumns,
	name: text("name").notNull(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id),
	settingsJson: text("settings_json"),
});
