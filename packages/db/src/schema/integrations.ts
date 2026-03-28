import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { workspaces } from "./users.js";

// API keys for third-party integrations
export const apiKeys = sqliteTable("api_keys", {
	...baseColumns,
	name: text("name").notNull(),
	keyHash: text("key_hash").notNull(), // hashed API key
	keyPrefix: text("key_prefix").notNull(), // first 8 chars for identification
	scopes: text("scopes").notNull().default("read"), // "read", "write", "admin"
	lastUsedAt: text("last_used_at"),
	expiresAt: text("expires_at"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// Webhook subscriptions
export const webhooks = sqliteTable("webhooks", {
	...baseColumns,
	url: text("url").notNull(),
	events: text("events").notNull(), // JSON array: ["task.created", "note.updated", ...]
	secret: text("secret").notNull(), // for HMAC signature verification
	isActive: integer("is_active").notNull().default(1),
	lastTriggeredAt: text("last_triggered_at"),
	failureCount: integer("failure_count").notNull().default(0),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// Webhook delivery log
export const webhookDeliveries = sqliteTable("webhook_deliveries", {
	...baseColumns,
	webhookId: text("webhook_id")
		.notNull()
		.references(() => webhooks.id),
	event: text("event").notNull(),
	payloadJson: text("payload_json").notNull(),
	responseStatus: integer("response_status"),
	responseBody: text("response_body"),
	success: integer("success").notNull().default(0),
});
