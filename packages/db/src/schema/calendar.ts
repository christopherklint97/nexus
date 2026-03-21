import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { users } from "./users.js";

export const calendarConnections = sqliteTable("calendar_connections", {
	...baseColumns,
	provider: text("provider").notNull().default("google"),
	accessTokenEncrypted: text("access_token_encrypted").notNull(),
	refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
});
