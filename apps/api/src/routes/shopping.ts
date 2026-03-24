import { zValidator } from "@hono/zod-validator";
import { shoppingItems, shoppingLists, shoppingRoutes } from "@nexus/db/schema";
import { createShoppingItemSchema, createShoppingListSchema } from "@nexus/shared/validators";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const shopping = new Hono();
shopping.use("*", authMiddleware);

// ─── Shopping Lists ───

// List all shopping lists (with item counts)
shopping.get(
	"/lists",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");

		const lists = db
			.select()
			.from(shoppingLists)
			.where(and(eq(shoppingLists.workspaceId, workspaceId), isNull(shoppingLists.deletedAt)))
			.orderBy(desc(shoppingLists.updatedAt))
			.all();

		const listIds = lists.map((l) => l.id);
		const itemCounts =
			listIds.length > 0
				? db
						.select({
							listId: shoppingItems.listId,
							total: sql<number>`count(*)`,
							checked: sql<number>`sum(case when ${shoppingItems.isChecked} = 1 then 1 else 0 end)`,
							estimatedTotal: sql<number>`sum(coalesce(${shoppingItems.estimatedPrice}, 0) * ${shoppingItems.quantity})`,
						})
						.from(shoppingItems)
						.where(
							and(
								sql`${shoppingItems.listId} IN (${sql.join(
									listIds.map((id) => sql`${id}`),
									sql`, `,
								)})`,
								isNull(shoppingItems.deletedAt),
							),
						)
						.groupBy(shoppingItems.listId)
						.all()
				: [];

		const countMap = new Map(itemCounts.map((c) => [c.listId, c]));

		const listsWithCounts = lists.map((list) => {
			const counts = countMap.get(list.id);
			return {
				...list,
				itemCount: counts?.total ?? 0,
				checkedCount: counts?.checked ?? 0,
				estimatedTotal: counts?.estimatedTotal ?? 0,
			};
		});

		return c.json({ data: listsWithCounts });
	},
);

// Get single list with items
shopping.get("/lists/:id", async (c) => {
	const id = c.req.param("id");

	const list = db
		.select()
		.from(shoppingLists)
		.where(and(eq(shoppingLists.id, id), isNull(shoppingLists.deletedAt)))
		.get();

	if (!list) {
		return c.json({ error: { message: "List not found", code: "NOT_FOUND" } }, 404);
	}

	const items = db
		.select()
		.from(shoppingItems)
		.where(and(eq(shoppingItems.listId, id), isNull(shoppingItems.deletedAt)))
		.orderBy(asc(shoppingItems.aisle), asc(shoppingItems.name))
		.all();

	return c.json({ data: { ...list, items } });
});

// Create shopping list
shopping.post("/lists", zValidator("json", createShoppingListSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(shoppingLists)
		.values({
			id,
			name: input.name,
			storeName: input.storeName,
			storeAddress: input.storeAddress || null,
			storeLat: input.storeLat || null,
			storeLng: input.storeLng || null,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const list = db.select().from(shoppingLists).where(eq(shoppingLists.id, id)).get();
	return c.json({ data: list }, 201);
});

// Update shopping list
shopping.patch(
	"/lists/:id",
	zValidator(
		"json",
		z.object({
			name: z.string().min(1).max(200).optional(),
			storeName: z.string().min(1).max(200).optional(),
			storeAddress: z.string().max(500).optional(),
			storeLat: z.number().optional(),
			storeLng: z.number().optional(),
		}),
	),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");

		const existing = db
			.select()
			.from(shoppingLists)
			.where(and(eq(shoppingLists.id, id), isNull(shoppingLists.deletedAt)))
			.get();

		if (!existing) {
			return c.json({ error: { message: "List not found", code: "NOT_FOUND" } }, 404);
		}

		const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (input.name !== undefined) updates.name = input.name;
		if (input.storeName !== undefined) updates.storeName = input.storeName;
		if (input.storeAddress !== undefined) updates.storeAddress = input.storeAddress;
		if (input.storeLat !== undefined) updates.storeLat = input.storeLat;
		if (input.storeLng !== undefined) updates.storeLng = input.storeLng;

		db.update(shoppingLists).set(updates).where(eq(shoppingLists.id, id)).run();
		const updated = db.select().from(shoppingLists).where(eq(shoppingLists.id, id)).get();
		return c.json({ data: updated });
	},
);

// Delete shopping list (soft)
shopping.delete("/lists/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();

	db.update(shoppingLists)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(shoppingLists.id, id))
		.run();
	// Also soft-delete all items in the list
	db.update(shoppingItems)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(shoppingItems.listId, id))
		.run();

	return c.json({ data: { id, deleted: true } });
});

// ─── Shopping Items ───

// Add item to list
shopping.post("/items", zValidator("json", createShoppingItemSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(shoppingItems)
		.values({
			id,
			name: input.name,
			quantity: input.quantity,
			unit: input.unit || null,
			estimatedPrice: input.estimatedPrice || null,
			aisle: input.aisle || null,
			isChecked: false,
			listId: input.listId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Update parent list's updatedAt
	db.update(shoppingLists).set({ updatedAt: now }).where(eq(shoppingLists.id, input.listId)).run();

	const item = db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).get();
	return c.json({ data: item }, 201);
});

// Update item
shopping.patch(
	"/items/:id",
	zValidator(
		"json",
		z.object({
			name: z.string().min(1).max(200).optional(),
			quantity: z.number().positive().optional(),
			unit: z.string().max(50).optional(),
			estimatedPrice: z.number().nonnegative().optional(),
			aisle: z.string().max(100).optional(),
			isChecked: z.boolean().optional(),
		}),
	),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");

		const existing = db
			.select()
			.from(shoppingItems)
			.where(and(eq(shoppingItems.id, id), isNull(shoppingItems.deletedAt)))
			.get();

		if (!existing) {
			return c.json({ error: { message: "Item not found", code: "NOT_FOUND" } }, 404);
		}

		const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (input.name !== undefined) updates.name = input.name;
		if (input.quantity !== undefined) updates.quantity = input.quantity;
		if (input.unit !== undefined) updates.unit = input.unit;
		if (input.estimatedPrice !== undefined) updates.estimatedPrice = input.estimatedPrice;
		if (input.aisle !== undefined) updates.aisle = input.aisle;
		if (input.isChecked !== undefined) updates.isChecked = input.isChecked;

		db.update(shoppingItems).set(updates).where(eq(shoppingItems.id, id)).run();
		const updated = db.select().from(shoppingItems).where(eq(shoppingItems.id, id)).get();
		return c.json({ data: updated });
	},
);

// Delete item (soft)
shopping.delete("/items/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(shoppingItems)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(shoppingItems.id, id))
		.run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Route Optimization ───

const optimizeSchema = z.object({
	listIds: z.array(z.string().uuid()).min(1),
	startLat: z.number().optional(),
	startLng: z.number().optional(),
});

// Generate optimized shopping route (nearest-neighbor)
shopping.post("/routes/optimize", zValidator("json", optimizeSchema), async (c) => {
	const { listIds, startLat, startLng } = c.req.valid("json");

	const lists = db
		.select()
		.from(shoppingLists)
		.where(
			and(
				sql`${shoppingLists.id} IN (${sql.join(
					listIds.map((id) => sql`${id}`),
					sql`, `,
				)})`,
				isNull(shoppingLists.deletedAt),
			),
		)
		.all();

	if (lists.length === 0) {
		return c.json({ error: { message: "No valid lists found", code: "NOT_FOUND" } }, 404);
	}

	// Fetch item counts for each list
	const itemCounts = db
		.select({
			listId: shoppingItems.listId,
			total: sql<number>`count(*)`,
			unchecked: sql<number>`sum(case when ${shoppingItems.isChecked} = 0 then 1 else 0 end)`,
			estimatedTotal: sql<number>`sum(coalesce(${shoppingItems.estimatedPrice}, 0) * ${shoppingItems.quantity})`,
		})
		.from(shoppingItems)
		.where(
			and(
				sql`${shoppingItems.listId} IN (${sql.join(
					listIds.map((id) => sql`${id}`),
					sql`, `,
				)})`,
				isNull(shoppingItems.deletedAt),
			),
		)
		.groupBy(shoppingItems.listId)
		.all();

	const countMap = new Map(itemCounts.map((c) => [c.listId, c]));

	// Nearest-neighbor optimization
	const storesWithCoords = lists.filter((l) => l.storeLat != null && l.storeLng != null);
	const storesWithoutCoords = lists.filter((l) => l.storeLat == null || l.storeLng == null);

	let optimizedOrder: typeof lists;

	if (storesWithCoords.length >= 2 && startLat != null && startLng != null) {
		// Nearest-neighbor from starting point
		const remaining = [...storesWithCoords];
		const ordered: typeof lists = [];
		let currentLat = startLat;
		let currentLng = startLng;

		while (remaining.length > 0) {
			let nearestIdx = 0;
			let nearestDist = Number.POSITIVE_INFINITY;

			for (let i = 0; i < remaining.length; i++) {
				const store = remaining[i];
				const dist = haversine(currentLat, currentLng, store.storeLat!, store.storeLng!);
				if (dist < nearestDist) {
					nearestDist = dist;
					nearestIdx = i;
				}
			}

			const nearest = remaining.splice(nearestIdx, 1)[0];
			ordered.push(nearest);
			currentLat = nearest.storeLat!;
			currentLng = nearest.storeLng!;
		}

		optimizedOrder = [...ordered, ...storesWithoutCoords];
	} else {
		// No coordinates, keep original order
		optimizedOrder = lists;
	}

	const stops = optimizedOrder.map((store, index) => {
		const counts = countMap.get(store.id);
		return {
			order: index + 1,
			listId: store.id,
			storeName: store.storeName,
			storeAddress: store.storeAddress,
			storeLat: store.storeLat,
			storeLng: store.storeLng,
			itemCount: counts?.total ?? 0,
			uncheckedCount: counts?.unchecked ?? 0,
			estimatedSpend: counts?.estimatedTotal ?? 0,
		};
	});

	const totalEstimated = stops.reduce((sum, s) => sum + s.estimatedSpend, 0);
	const totalItems = stops.reduce((sum, s) => sum + s.itemCount, 0);

	return c.json({
		data: {
			stops,
			summary: {
				storeCount: stops.length,
				totalItems,
				totalEstimated,
			},
		},
	});
});

// Save a route
shopping.post(
	"/routes",
	zValidator(
		"json",
		z.object({
			name: z.string().min(1).max(200),
			stopsJson: z.string(),
			optimizedOrder: z.string().optional(),
			workspaceId: z.string().uuid(),
		}),
	),
	async (c) => {
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		db.insert(shoppingRoutes)
			.values({
				id,
				name: input.name,
				stopsJson: input.stopsJson,
				optimizedOrder: input.optimizedOrder || null,
				workspaceId: input.workspaceId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const route = db.select().from(shoppingRoutes).where(eq(shoppingRoutes.id, id)).get();
		return c.json({ data: route }, 201);
	},
);

// List saved routes
shopping.get(
	"/routes",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");
		const routes = db
			.select()
			.from(shoppingRoutes)
			.where(and(eq(shoppingRoutes.workspaceId, workspaceId), isNull(shoppingRoutes.deletedAt)))
			.orderBy(desc(shoppingRoutes.updatedAt))
			.all();
		return c.json({ data: routes });
	},
);

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default shopping;
