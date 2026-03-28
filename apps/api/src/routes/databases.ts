import { zValidator } from "@hono/zod-validator";
import {
	databaseProperties,
	databaseRows,
	databaseViews,
	databases,
} from "@nexus/db/schema";
import {
	createDatabaseSchema,
	createPropertySchema,
	createRowSchema,
	createViewSchema,
	updateDatabaseSchema,
	updatePropertySchema,
	updateRowSchema,
	updateViewSchema,
} from "@nexus/shared/validators";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const dbRouter = new Hono();
dbRouter.use("*", authMiddleware);

// ─── Databases CRUD ───

dbRouter.get(
	"/",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");
		const result = db
			.select()
			.from(databases)
			.where(and(eq(databases.workspaceId, workspaceId), isNull(databases.deletedAt)))
			.orderBy(desc(databases.updatedAt))
			.all();

		// Count rows per database
		const rowCounts = db
			.select({
				databaseId: databaseRows.databaseId,
				count: sql<number>`count(*)`,
			})
			.from(databaseRows)
			.where(isNull(databaseRows.deletedAt))
			.groupBy(databaseRows.databaseId)
			.all();
		const countMap = new Map(rowCounts.map((r) => [r.databaseId, r.count]));

		const data = result.map((d) => ({
			...d,
			rowCount: countMap.get(d.id) || 0,
		}));

		return c.json({ data });
	},
);

dbRouter.get("/:id", async (c) => {
	const id = c.req.param("id");
	const database = db
		.select()
		.from(databases)
		.where(and(eq(databases.id, id), isNull(databases.deletedAt)))
		.get();

	if (!database) {
		return c.json({ error: { message: "Database not found", code: "NOT_FOUND" } }, 404);
	}

	// Get properties, views, and row count
	const properties = db
		.select()
		.from(databaseProperties)
		.where(and(eq(databaseProperties.databaseId, id), isNull(databaseProperties.deletedAt)))
		.orderBy(asc(databaseProperties.position))
		.all();

	const views = db
		.select()
		.from(databaseViews)
		.where(and(eq(databaseViews.databaseId, id), isNull(databaseViews.deletedAt)))
		.orderBy(asc(databaseViews.position))
		.all();

	const rowCount = db
		.select({ count: sql<number>`count(*)` })
		.from(databaseRows)
		.where(and(eq(databaseRows.databaseId, id), isNull(databaseRows.deletedAt)))
		.get();

	return c.json({
		data: {
			...database,
			properties: properties.map((p) => ({
				...p,
				config: p.configJson ? JSON.parse(p.configJson) : null,
			})),
			views: views.map((v) => ({
				...v,
				config: v.configJson ? JSON.parse(v.configJson) : null,
				filters: v.filtersJson ? JSON.parse(v.filtersJson) : [],
				sorts: v.sortsJson ? JSON.parse(v.sortsJson) : [],
			})),
			rowCount: rowCount?.count || 0,
		},
	});
});

dbRouter.post("/", zValidator("json", createDatabaseSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(databases)
		.values({
			id,
			name: input.name,
			description: input.description || null,
			icon: input.icon || null,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Create a default "Name" text property
	const titlePropId = crypto.randomUUID();
	db.insert(databaseProperties)
		.values({
			id: titlePropId,
			databaseId: id,
			name: "Name",
			type: "text",
			position: 0,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Create a default table view
	const viewId = crypto.randomUUID();
	db.insert(databaseViews)
		.values({
			id: viewId,
			databaseId: id,
			name: "Table",
			type: "table",
			position: 0,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const created = db.select().from(databases).where(eq(databases.id, id)).get();
	return c.json({ data: created }, 201);
});

dbRouter.patch("/:id", zValidator("json", updateDatabaseSchema), async (c) => {
	const id = c.req.param("id");
	const input = c.req.valid("json");
	const now = new Date().toISOString();

	const existing = db
		.select()
		.from(databases)
		.where(and(eq(databases.id, id), isNull(databases.deletedAt)))
		.get();
	if (!existing) {
		return c.json({ error: { message: "Database not found", code: "NOT_FOUND" } }, 404);
	}

	const updates: Record<string, unknown> = { updatedAt: now };
	if (input.name !== undefined) updates.name = input.name;
	if (input.description !== undefined) updates.description = input.description;
	if (input.icon !== undefined) updates.icon = input.icon;

	db.update(databases).set(updates).where(eq(databases.id, id)).run();
	const updated = db.select().from(databases).where(eq(databases.id, id)).get();
	return c.json({ data: updated });
});

dbRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(databases)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(databases.id, id))
		.run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Properties CRUD ───

dbRouter.get("/:id/properties", async (c) => {
	const databaseId = c.req.param("id");
	const props = db
		.select()
		.from(databaseProperties)
		.where(
			and(eq(databaseProperties.databaseId, databaseId), isNull(databaseProperties.deletedAt)),
		)
		.orderBy(asc(databaseProperties.position))
		.all();

	return c.json({
		data: props.map((p) => ({
			...p,
			config: p.configJson ? JSON.parse(p.configJson) : null,
		})),
	});
});

dbRouter.post(
	"/:id/properties",
	zValidator("json", createPropertySchema.omit({ databaseId: true })),
	async (c) => {
		const databaseId = c.req.param("id");
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		// Get next position
		const maxPos = db
			.select({ max: sql<number>`coalesce(max(position), -1)` })
			.from(databaseProperties)
			.where(eq(databaseProperties.databaseId, databaseId))
			.get();

		db.insert(databaseProperties)
			.values({
				id,
				databaseId,
				name: input.name,
				type: input.type,
				configJson: input.config ? JSON.stringify(input.config) : null,
				position: input.position ?? (maxPos?.max ?? -1) + 1,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const prop = db.select().from(databaseProperties).where(eq(databaseProperties.id, id)).get();
		return c.json(
			{
				data: {
					...prop,
					config: prop?.configJson ? JSON.parse(prop.configJson) : null,
				},
			},
			201,
		);
	},
);

dbRouter.patch(
	"/:id/properties/:propId",
	zValidator("json", updatePropertySchema),
	async (c) => {
		const propId = c.req.param("propId");
		const input = c.req.valid("json");
		const now = new Date().toISOString();

		const updates: Record<string, unknown> = { updatedAt: now };
		if (input.name !== undefined) updates.name = input.name;
		if (input.type !== undefined) updates.type = input.type;
		if (input.config !== undefined) updates.configJson = JSON.stringify(input.config);
		if (input.position !== undefined) updates.position = input.position;
		if (input.isVisible !== undefined) updates.isVisible = input.isVisible ? 1 : 0;
		if (input.width !== undefined) updates.width = input.width;

		db.update(databaseProperties).set(updates).where(eq(databaseProperties.id, propId)).run();
		const prop = db
			.select()
			.from(databaseProperties)
			.where(eq(databaseProperties.id, propId))
			.get();
		return c.json({
			data: { ...prop, config: prop?.configJson ? JSON.parse(prop.configJson) : null },
		});
	},
);

dbRouter.delete("/:id/properties/:propId", async (c) => {
	const propId = c.req.param("propId");
	const now = new Date().toISOString();
	db.update(databaseProperties)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(databaseProperties.id, propId))
		.run();
	return c.json({ data: { id: propId, deleted: true } });
});

// ─── Views CRUD ───

dbRouter.get("/:id/views", async (c) => {
	const databaseId = c.req.param("id");
	const views = db
		.select()
		.from(databaseViews)
		.where(and(eq(databaseViews.databaseId, databaseId), isNull(databaseViews.deletedAt)))
		.orderBy(asc(databaseViews.position))
		.all();

	return c.json({
		data: views.map((v) => ({
			...v,
			config: v.configJson ? JSON.parse(v.configJson) : null,
			filters: v.filtersJson ? JSON.parse(v.filtersJson) : [],
			sorts: v.sortsJson ? JSON.parse(v.sortsJson) : [],
		})),
	});
});

dbRouter.post(
	"/:id/views",
	zValidator("json", createViewSchema.omit({ databaseId: true })),
	async (c) => {
		const databaseId = c.req.param("id");
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const maxPos = db
			.select({ max: sql<number>`coalesce(max(position), -1)` })
			.from(databaseViews)
			.where(eq(databaseViews.databaseId, databaseId))
			.get();

		db.insert(databaseViews)
			.values({
				id,
				databaseId,
				name: input.name,
				type: input.type,
				configJson: input.config ? JSON.stringify(input.config) : null,
				filtersJson: input.filters ? JSON.stringify(input.filters) : null,
				sortsJson: input.sorts ? JSON.stringify(input.sorts) : null,
				groupByPropertyId: input.groupByPropertyId || null,
				position: (maxPos?.max ?? -1) + 1,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const view = db.select().from(databaseViews).where(eq(databaseViews.id, id)).get();
		return c.json(
			{
				data: {
					...view,
					config: view?.configJson ? JSON.parse(view.configJson) : null,
					filters: view?.filtersJson ? JSON.parse(view.filtersJson) : [],
					sorts: view?.sortsJson ? JSON.parse(view.sortsJson) : [],
				},
			},
			201,
		);
	},
);

dbRouter.patch(
	"/:id/views/:viewId",
	zValidator("json", updateViewSchema),
	async (c) => {
		const viewId = c.req.param("viewId");
		const input = c.req.valid("json");
		const now = new Date().toISOString();

		const updates: Record<string, unknown> = { updatedAt: now };
		if (input.name !== undefined) updates.name = input.name;
		if (input.type !== undefined) updates.type = input.type;
		if (input.config !== undefined) updates.configJson = JSON.stringify(input.config);
		if (input.filters !== undefined) updates.filtersJson = JSON.stringify(input.filters);
		if (input.sorts !== undefined) updates.sortsJson = JSON.stringify(input.sorts);
		if (input.groupByPropertyId !== undefined)
			updates.groupByPropertyId = input.groupByPropertyId;

		db.update(databaseViews).set(updates).where(eq(databaseViews.id, viewId)).run();
		const view = db.select().from(databaseViews).where(eq(databaseViews.id, viewId)).get();
		return c.json({
			data: {
				...view,
				config: view?.configJson ? JSON.parse(view.configJson) : null,
				filters: view?.filtersJson ? JSON.parse(view.filtersJson) : [],
				sorts: view?.sortsJson ? JSON.parse(view.sortsJson) : [],
			},
		});
	},
);

dbRouter.delete("/:id/views/:viewId", async (c) => {
	const viewId = c.req.param("viewId");
	const now = new Date().toISOString();
	db.update(databaseViews)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(databaseViews.id, viewId))
		.run();
	return c.json({ data: { id: viewId, deleted: true } });
});

// ─── Rows CRUD ───

const rowQuerySchema = z.object({
	viewId: z.string().uuid().optional(),
});

dbRouter.get("/:id/rows", zValidator("query", rowQuerySchema), async (c) => {
	const databaseId = c.req.param("id");
	const { viewId } = c.req.valid("query");

	// Get all rows
	let rows = db
		.select()
		.from(databaseRows)
		.where(and(eq(databaseRows.databaseId, databaseId), isNull(databaseRows.deletedAt)))
		.orderBy(asc(databaseRows.position))
		.all();

	// Parse values
	let parsedRows = rows.map((r) => ({
		...r,
		values: JSON.parse(r.valuesJson) as Record<string, unknown>,
	}));

	// Apply view filters/sorts if viewId provided
	if (viewId) {
		const view = db.select().from(databaseViews).where(eq(databaseViews.id, viewId)).get();
		if (view) {
			const filters = view.filtersJson ? JSON.parse(view.filtersJson) : [];
			const sorts = view.sortsJson ? JSON.parse(view.sortsJson) : [];

			// Apply filters
			for (const filter of filters) {
				parsedRows = applyFilter(parsedRows, filter);
			}

			// Apply sorts
			if (sorts.length > 0) {
				parsedRows.sort((a, b) => {
					for (const sort of sorts) {
						const aVal = a.values[sort.propertyId];
						const bVal = b.values[sort.propertyId];
						const cmp = compareValues(aVal, bVal);
						if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
					}
					return 0;
				});
			}
		}
	}

	return c.json({ data: parsedRows });
});

dbRouter.post(
	"/:id/rows",
	zValidator("json", createRowSchema.omit({ databaseId: true })),
	async (c) => {
		const databaseId = c.req.param("id");
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		const maxPos = db
			.select({ max: sql<number>`coalesce(max(position), -1)` })
			.from(databaseRows)
			.where(eq(databaseRows.databaseId, databaseId))
			.get();

		db.insert(databaseRows)
			.values({
				id,
				databaseId,
				valuesJson: JSON.stringify(input.values || {}),
				position: input.position ?? (maxPos?.max ?? -1) + 1,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const row = db.select().from(databaseRows).where(eq(databaseRows.id, id)).get();
		return c.json(
			{ data: { ...row, values: JSON.parse(row!.valuesJson) } },
			201,
		);
	},
);

dbRouter.patch(
	"/:id/rows/:rowId",
	zValidator("json", updateRowSchema),
	async (c) => {
		const rowId = c.req.param("rowId");
		const input = c.req.valid("json");
		const now = new Date().toISOString();

		const existing = db.select().from(databaseRows).where(eq(databaseRows.id, rowId)).get();
		if (!existing) {
			return c.json({ error: { message: "Row not found", code: "NOT_FOUND" } }, 404);
		}

		const updates: Record<string, unknown> = { updatedAt: now };

		if (input.values !== undefined) {
			// Merge values — don't replace the entire object
			const current = JSON.parse(existing.valuesJson);
			const merged = { ...current, ...input.values };
			updates.valuesJson = JSON.stringify(merged);
		}

		if (input.position !== undefined) updates.position = input.position;

		db.update(databaseRows).set(updates).where(eq(databaseRows.id, rowId)).run();
		const row = db.select().from(databaseRows).where(eq(databaseRows.id, rowId)).get();
		return c.json({ data: { ...row, values: JSON.parse(row!.valuesJson) } });
	},
);

dbRouter.delete("/:id/rows/:rowId", async (c) => {
	const rowId = c.req.param("rowId");
	const now = new Date().toISOString();
	db.update(databaseRows)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(databaseRows.id, rowId))
		.run();
	return c.json({ data: { id: rowId, deleted: true } });
});

// ─── Filter/Sort Helpers ───

interface FilterDef {
	propertyId: string;
	operator: string;
	value?: unknown;
}

function applyFilter(
	rows: Array<{ values: Record<string, unknown>; [key: string]: unknown }>,
	filter: FilterDef,
) {
	return rows.filter((row) => {
		const val = row.values[filter.propertyId];

		switch (filter.operator) {
			case "equals":
				return val === filter.value;
			case "not_equals":
				return val !== filter.value;
			case "contains":
				return typeof val === "string" && typeof filter.value === "string"
					? val.toLowerCase().includes(filter.value.toLowerCase())
					: false;
			case "not_contains":
				return typeof val === "string" && typeof filter.value === "string"
					? !val.toLowerCase().includes(filter.value.toLowerCase())
					: true;
			case "is_empty":
				return val === null || val === undefined || val === "";
			case "is_not_empty":
				return val !== null && val !== undefined && val !== "";
			case "gt":
				return typeof val === "number" && typeof filter.value === "number"
					? val > filter.value
					: false;
			case "lt":
				return typeof val === "number" && typeof filter.value === "number"
					? val < filter.value
					: false;
			case "gte":
				return typeof val === "number" && typeof filter.value === "number"
					? val >= filter.value
					: false;
			case "lte":
				return typeof val === "number" && typeof filter.value === "number"
					? val <= filter.value
					: false;
			default:
				return true;
		}
	});
}

function compareValues(a: unknown, b: unknown): number {
	if (a === b) return 0;
	if (a === null || a === undefined) return -1;
	if (b === null || b === undefined) return 1;
	if (typeof a === "number" && typeof b === "number") return a - b;
	if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
	if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
	return String(a).localeCompare(String(b));
}

export default dbRouter;
