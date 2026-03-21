import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncLog = sqliteTable("sync_log", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	operation: text("operation", { enum: ["create", "update", "delete"] }).notNull(),
	timestamp: text("timestamp")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	deviceId: text("device_id").notNull(),
});
