import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { workspaces } from "./users.js";

export const recipes = sqliteTable("recipes", {
	...baseColumns,
	title: text("title").notNull(),
	description: text("description"),
	ingredientsJson: text("ingredients_json"),
	instructionsJson: text("instructions_json"),
	prepTime: integer("prep_time"),
	cookTime: integer("cook_time"),
	servings: integer("servings"),
	cuisine: text("cuisine"),
	difficulty: text("difficulty"),
	sourceUrl: text("source_url"),
	imageUrl: text("image_url"),
	tagsJson: text("tags_json"),
	isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});
