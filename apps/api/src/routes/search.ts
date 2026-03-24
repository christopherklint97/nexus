import { zValidator } from "@hono/zod-validator";
import { notes, recipes, shoppingItems, shoppingLists, tasks } from "@nexus/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const search = new Hono();
search.use("*", authMiddleware);

const searchSchema = z.object({
	q: z.string().min(1).max(200),
	workspaceId: z.string().uuid(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Global search across all modules
search.get("/", zValidator("query", searchSchema), async (c) => {
	const { q, workspaceId, limit } = c.req.valid("query");
	const query = q.toLowerCase();
	const perType = Math.ceil(limit / 5);

	// Search tasks
	const taskResults = db
		.select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
		.from(tasks)
		.where(
			and(
				eq(tasks.workspaceId, workspaceId),
				isNull(tasks.deletedAt),
				sql`lower(${tasks.title}) LIKE ${"%" + query + "%"}`,
			),
		)
		.limit(perType)
		.all();

	// Search shopping lists
	const listResults = db
		.select({ id: shoppingLists.id, name: shoppingLists.name, storeName: shoppingLists.storeName })
		.from(shoppingLists)
		.where(
			and(
				eq(shoppingLists.workspaceId, workspaceId),
				isNull(shoppingLists.deletedAt),
				sql`(lower(${shoppingLists.name}) LIKE ${"%" + query + "%"} OR lower(${shoppingLists.storeName}) LIKE ${"%" + query + "%"})`,
			),
		)
		.limit(perType)
		.all();

	// Search shopping items
	const itemResults = db
		.select({ id: shoppingItems.id, name: shoppingItems.name, listId: shoppingItems.listId })
		.from(shoppingItems)
		.where(
			and(
				isNull(shoppingItems.deletedAt),
				sql`lower(${shoppingItems.name}) LIKE ${"%" + query + "%"}`,
			),
		)
		.limit(perType)
		.all();

	// Search notes
	const noteResults = db
		.select({ id: notes.id, title: notes.title, isPinned: notes.isPinned })
		.from(notes)
		.where(
			and(
				eq(notes.workspaceId, workspaceId),
				isNull(notes.deletedAt),
				sql`(lower(${notes.title}) LIKE ${"%" + query + "%"} OR lower(${notes.contentBlocksJson}) LIKE ${"%" + query + "%"})`,
			),
		)
		.limit(perType)
		.all();

	// Search recipes
	const recipeResults = db
		.select({
			id: recipes.id,
			title: recipes.title,
			cuisine: recipes.cuisine,
			difficulty: recipes.difficulty,
		})
		.from(recipes)
		.where(
			and(
				eq(recipes.workspaceId, workspaceId),
				isNull(recipes.deletedAt),
				sql`(lower(${recipes.title}) LIKE ${"%" + query + "%"} OR lower(${recipes.description}) LIKE ${"%" + query + "%"})`,
			),
		)
		.limit(perType)
		.all();

	const results = [
		...taskResults.map((t) => ({
			type: "task" as const,
			id: t.id,
			title: t.title,
			subtitle: `${t.status} · P${t.priority}`,
		})),
		...listResults.map((l) => ({
			type: "shopping_list" as const,
			id: l.id,
			title: l.name,
			subtitle: l.storeName,
		})),
		...itemResults.map((i) => ({
			type: "shopping_item" as const,
			id: i.id,
			title: i.name,
			subtitle: `In list`,
		})),
		...noteResults.map((n) => ({
			type: "note" as const,
			id: n.id,
			title: n.title,
			subtitle: n.isPinned ? "Pinned" : "Note",
		})),
		...recipeResults.map((r) => ({
			type: "recipe" as const,
			id: r.id,
			title: r.title,
			subtitle: [r.cuisine, r.difficulty].filter(Boolean).join(" · ") || "Recipe",
		})),
	];

	return c.json({ data: results });
});

export default search;
