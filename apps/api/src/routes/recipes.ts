import { zValidator } from "@hono/zod-validator";
import { recipes } from "@nexus/db/schema";
import { shoppingItems, shoppingLists } from "@nexus/db/schema";
import { addRecipeToListSchema, createRecipeSchema } from "@nexus/shared/validators";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

interface RecipeIngredient {
	quantity: number;
	unit: string;
	item: string;
}

const recipesRouter = new Hono();
recipesRouter.use("*", authMiddleware);

// ─── List Recipes ───

const recipeQuerySchema = z.object({
	workspaceId: z.string().uuid(),
	cuisine: z.string().optional(),
	difficulty: z.enum(["easy", "medium", "hard"]).optional(),
	tag: z.string().optional(),
	favorite: z.coerce.boolean().optional(),
	search: z.string().optional(),
});

recipesRouter.get("/", zValidator("query", recipeQuerySchema), async (c) => {
	const { workspaceId, cuisine, difficulty, tag, favorite, search } = c.req.valid("query");

	const conditions = [eq(recipes.workspaceId, workspaceId), isNull(recipes.deletedAt)];

	if (cuisine) conditions.push(eq(recipes.cuisine, cuisine));
	if (difficulty) conditions.push(eq(recipes.difficulty, difficulty));
	if (favorite !== undefined) conditions.push(eq(recipes.isFavorite, favorite));

	let result = db
		.select()
		.from(recipes)
		.where(and(...conditions))
		.orderBy(desc(recipes.updatedAt))
		.all();

	// Filter by tag (stored in JSON array)
	if (tag) {
		result = result.filter((r) => {
			if (!r.tagsJson) return false;
			try {
				const tags = JSON.parse(r.tagsJson) as string[];
				return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
			} catch {
				return false;
			}
		});
	}

	// Filter by search term in title/description
	if (search?.trim()) {
		const searchLower = search.trim().toLowerCase();
		result = result.filter((r) => {
			if (r.title.toLowerCase().includes(searchLower)) return true;
			if (r.description?.toLowerCase().includes(searchLower)) return true;
			return false;
		});
	}

	return c.json({ data: result });
});

// ─── Get Single Recipe ───

recipesRouter.get("/:id", async (c) => {
	const id = c.req.param("id");
	const recipe = db
		.select()
		.from(recipes)
		.where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
		.get();

	if (!recipe) {
		return c.json({ error: { message: "Recipe not found", code: "NOT_FOUND" } }, 404);
	}

	return c.json({ data: recipe });
});

// ─── Create Recipe ───

recipesRouter.post("/", zValidator("json", createRecipeSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(recipes)
		.values({
			id,
			title: input.title,
			description: input.description || null,
			ingredientsJson: input.ingredients ? JSON.stringify(input.ingredients) : null,
			instructionsJson: input.instructions ? JSON.stringify(input.instructions) : null,
			prepTime: input.prepTime ?? null,
			cookTime: input.cookTime ?? null,
			servings: input.servings ?? null,
			cuisine: input.cuisine || null,
			difficulty: input.difficulty || null,
			sourceUrl: input.sourceUrl || null,
			imageUrl: input.imageUrl || null,
			tagsJson: input.tags ? JSON.stringify(input.tags) : null,
			isFavorite: input.isFavorite,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const recipe = db.select().from(recipes).where(eq(recipes.id, id)).get();
	return c.json({ data: recipe }, 201);
});

// ─── Update Recipe ───

recipesRouter.patch(
	"/:id",
	zValidator(
		"json",
		z.object({
			title: z.string().min(1).max(500).optional(),
			description: z.string().max(5000).optional(),
			ingredients: z
				.array(
					z.object({
						quantity: z.number().nonnegative(),
						unit: z.string().max(50),
						item: z.string().min(1).max(200),
					}),
				)
				.optional(),
			instructions: z.array(z.string().max(2000)).optional(),
			prepTime: z.number().int().nonnegative().nullable().optional(),
			cookTime: z.number().int().nonnegative().nullable().optional(),
			servings: z.number().int().positive().nullable().optional(),
			cuisine: z.string().max(100).nullable().optional(),
			difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional(),
			sourceUrl: z.string().url().max(2000).nullable().optional(),
			imageUrl: z.string().url().max(2000).nullable().optional(),
			tags: z.array(z.string().max(50)).max(20).optional(),
			isFavorite: z.boolean().optional(),
		}),
	),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");

		const existing = db
			.select()
			.from(recipes)
			.where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
			.get();

		if (!existing) {
			return c.json({ error: { message: "Recipe not found", code: "NOT_FOUND" } }, 404);
		}

		const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (input.title !== undefined) updates.title = input.title;
		if (input.description !== undefined) updates.description = input.description;
		if (input.ingredients !== undefined)
			updates.ingredientsJson = JSON.stringify(input.ingredients);
		if (input.instructions !== undefined)
			updates.instructionsJson = JSON.stringify(input.instructions);
		if (input.prepTime !== undefined) updates.prepTime = input.prepTime;
		if (input.cookTime !== undefined) updates.cookTime = input.cookTime;
		if (input.servings !== undefined) updates.servings = input.servings;
		if (input.cuisine !== undefined) updates.cuisine = input.cuisine;
		if (input.difficulty !== undefined) updates.difficulty = input.difficulty;
		if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl;
		if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
		if (input.tags !== undefined) updates.tagsJson = JSON.stringify(input.tags);
		if (input.isFavorite !== undefined) updates.isFavorite = input.isFavorite;

		db.update(recipes).set(updates).where(eq(recipes.id, id)).run();
		const updated = db.select().from(recipes).where(eq(recipes.id, id)).get();
		return c.json({ data: updated });
	},
);

// ─── Delete Recipe (soft) ───

recipesRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(recipes).set({ deletedAt: now, updatedAt: now }).where(eq(recipes.id, id)).run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Add Recipe Ingredients to Shopping List ───

recipesRouter.post("/:id/add-to-list", zValidator("json", addRecipeToListSchema), async (c) => {
	const id = c.req.param("id");
	const { listId, scale } = c.req.valid("json");

	const recipe = db
		.select()
		.from(recipes)
		.where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
		.get();

	if (!recipe) {
		return c.json({ error: { message: "Recipe not found", code: "NOT_FOUND" } }, 404);
	}

	const list = db
		.select()
		.from(shoppingLists)
		.where(and(eq(shoppingLists.id, listId), isNull(shoppingLists.deletedAt)))
		.get();

	if (!list) {
		return c.json({ error: { message: "Shopping list not found", code: "NOT_FOUND" } }, 404);
	}

	if (!recipe.ingredientsJson) {
		return c.json(
			{ error: { message: "Recipe has no ingredients", code: "VALIDATION_ERROR" } },
			400,
		);
	}

	let ingredients: RecipeIngredient[];
	try {
		ingredients = JSON.parse(recipe.ingredientsJson);
	} catch {
		return c.json({ error: { message: "Invalid ingredients data", code: "INTERNAL_ERROR" } }, 500);
	}

	const now = new Date().toISOString();
	let itemsAdded = 0;

	for (const ingredient of ingredients) {
		const itemId = crypto.randomUUID();
		const scaledQuantity = Math.round(ingredient.quantity * scale * 100) / 100;

		db.insert(shoppingItems)
			.values({
				id: itemId,
				name: ingredient.item,
				quantity: scaledQuantity,
				unit: ingredient.unit || null,
				isChecked: false,
				listId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		itemsAdded++;
	}

	// Update the shopping list's updatedAt
	db.update(shoppingLists).set({ updatedAt: now }).where(eq(shoppingLists.id, listId)).run();

	return c.json({
		data: {
			recipeId: id,
			recipeTitle: recipe.title,
			listId,
			listName: list.name,
			itemsAdded,
			scale,
		},
	});
});

export default recipesRouter;
