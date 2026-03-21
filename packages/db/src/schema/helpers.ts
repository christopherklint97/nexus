import { integer, text } from "drizzle-orm/sqlite-core";
import type { SQLiteColumnBuilderBase } from "drizzle-orm/sqlite-core";

export const baseColumns = {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text("updated_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	deletedAt: text("deleted_at"),
	syncVersion: integer("sync_version").notNull().default(0),
};
