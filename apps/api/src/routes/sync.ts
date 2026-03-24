import { zValidator } from "@hono/zod-validator";
import {
	documents,
	folders,
	labels,
	notes,
	shoppingItems,
	shoppingLists,
	shoppingRoutes,
	syncLog,
	taskLabels,
	tasks,
} from "@nexus/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const sync = new Hono();
sync.use("*", authMiddleware);

// Entity table mapping for generic queries
const ENTITY_TABLES: Record<string, any> = {
	tasks,
	labels,
	task_labels: taskLabels,
	shopping_lists: shoppingLists,
	shopping_items: shoppingItems,
	shopping_routes: shoppingRoutes,
	notes,
	folders,
	documents,
};

const pushChangeSchema = z.object({
	entityType: z.string(),
	entityId: z.string().uuid(),
	operation: z.enum(["create", "update", "delete"]),
	data: z.record(z.unknown()).optional(),
	timestamp: z.string().datetime(),
	deviceId: z.string(),
});

const pushSchema = z.object({
	changes: z.array(pushChangeSchema),
});

// Push local changes to server
sync.post("/push", zValidator("json", pushSchema), async (c) => {
	const userId = c.get("userId");
	const { changes } = c.req.valid("json");
	const results: Array<{
		entityType: string;
		entityId: string;
		status: string;
		serverTimestamp: string;
	}> = [];
	const serverTimestamp = new Date().toISOString();

	for (const change of changes) {
		const table = ENTITY_TABLES[change.entityType];
		if (!table) {
			results.push({
				entityType: change.entityType,
				entityId: change.entityId,
				status: "error",
				serverTimestamp,
			});
			continue;
		}

		try {
			if (change.operation === "create" && change.data) {
				// Check if entity already exists (idempotency)
				const existing = db.select().from(table).where(eq(table.id, change.entityId)).get();
				if (!existing) {
					db.insert(table)
						.values({
							...change.data,
							id: change.entityId,
							createdAt: change.timestamp,
							updatedAt: serverTimestamp,
						})
						.run();
				}
			} else if (change.operation === "update" && change.data) {
				// Last-write-wins: compare timestamps
				const existing = db.select().from(table).where(eq(table.id, change.entityId)).get();
				if (existing) {
					const existingTime = new Date(existing.updatedAt).getTime();
					const changeTime = new Date(change.timestamp).getTime();
					// Only apply if client change is newer
					if (changeTime >= existingTime) {
						db.update(table)
							.set({ ...change.data, updatedAt: serverTimestamp })
							.where(eq(table.id, change.entityId))
							.run();
					}
				}
			} else if (change.operation === "delete") {
				// Soft delete
				const existing = db.select().from(table).where(eq(table.id, change.entityId)).get();
				if (existing && !existing.deletedAt) {
					db.update(table)
						.set({ deletedAt: serverTimestamp, updatedAt: serverTimestamp })
						.where(eq(table.id, change.entityId))
						.run();
				}
			}

			// Record in sync log
			db.insert(syncLog)
				.values({
					entityType: change.entityType,
					entityId: change.entityId,
					operation: change.operation,
					timestamp: serverTimestamp,
					deviceId: change.deviceId,
				})
				.run();

			results.push({
				entityType: change.entityType,
				entityId: change.entityId,
				status: "ok",
				serverTimestamp,
			});
		} catch (err) {
			results.push({
				entityType: change.entityType,
				entityId: change.entityId,
				status: "error",
				serverTimestamp,
			});
		}
	}

	return c.json({ data: { results, serverTimestamp } });
});

// Pull changes since last sync
const pullSchema = z.object({
	since: z.string().datetime(),
	deviceId: z.string(),
	workspaceId: z.string().uuid(),
});

sync.get("/pull", zValidator("query", pullSchema), async (c) => {
	const { since, deviceId, workspaceId } = c.req.valid("query");

	const changes: Record<string, unknown[]> = {};

	// Query each entity table for rows updated since the given timestamp
	for (const [entityType, table] of Object.entries(ENTITY_TABLES)) {
		// Skip tables without workspaceId (task_labels, sync_log)
		if (entityType === "task_labels") {
			const rows = db
				.select()
				.from(table)
				.all()
				.filter((row: any) => {
					// Include task_labels if their parent task was modified
					return true; // simplified — always include
				});
			if (rows.length > 0) changes[entityType] = rows;
			continue;
		}

		try {
			let rows;
			if ("workspaceId" in table) {
				rows = db
					.select()
					.from(table)
					.where(and(gt(table.updatedAt, since), eq(table.workspaceId, workspaceId)))
					.all();
			} else if ("listId" in table) {
				// Shopping items — pull through list
				rows = db.select().from(table).where(gt(table.updatedAt, since)).all();
			} else {
				rows = db.select().from(table).where(gt(table.updatedAt, since)).all();
			}

			if (rows.length > 0) {
				changes[entityType] = rows;
			}
		} catch {
			// Skip tables that don't have updatedAt
		}
	}

	// Get sync log entries to tell client what happened
	const logEntries = db.select().from(syncLog).where(gt(syncLog.timestamp, since)).all();

	return c.json({
		data: {
			changes,
			syncLog: logEntries,
			serverTimestamp: new Date().toISOString(),
		},
	});
});

// Get sync status
sync.get("/status", (c) => {
	const lastEntry = db.select().from(syncLog).orderBy(sql`timestamp DESC`).limit(1).get();

	return c.json({
		data: {
			lastSyncTimestamp: lastEntry?.timestamp || null,
			totalChanges: db.select({ count: sql<number>`count(*)` }).from(syncLog).get()?.count || 0,
		},
	});
});

export default sync;
