import { z } from "zod";

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const createTaskSchema = z.object({
	title: z.string().min(1).max(500),
	description: z.string().max(5000).optional(),
	status: z.enum(["todo", "in_progress", "done"]).default("todo"),
	priority: z.number().int().min(1).max(4).default(4),
	dueDate: z.string().datetime().optional(),
	recurrenceRule: z.string().max(200).optional(),
	parentTaskId: z.string().uuid().optional(),
	workspaceId: z.string().uuid(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ workspaceId: true });

export const createShoppingListSchema = z.object({
	name: z.string().min(1).max(200),
	storeName: z.string().min(1).max(200),
	storeAddress: z.string().max(500).optional(),
	storeLat: z.number().optional(),
	storeLng: z.number().optional(),
	workspaceId: z.string().uuid(),
});

export const createShoppingItemSchema = z.object({
	name: z.string().min(1).max(200),
	quantity: z.number().positive().default(1),
	unit: z.string().max(50).optional(),
	estimatedPrice: z.number().nonnegative().optional(),
	aisle: z.string().max(100).optional(),
	listId: z.string().uuid(),
});

export const createNoteSchema = z.object({
	title: z.string().min(1).max(500),
	contentBlocks: z.any().optional(),
	folderId: z.string().uuid().optional(),
	isPinned: z.boolean().default(false),
	workspaceId: z.string().uuid(),
});

export const recipeIngredientSchema = z.object({
	quantity: z.number().nonnegative(),
	unit: z.string().max(50),
	item: z.string().min(1).max(200),
});

export const createRecipeSchema = z.object({
	title: z.string().min(1).max(500),
	description: z.string().max(5000).optional(),
	ingredients: z.array(recipeIngredientSchema).optional(),
	instructions: z.array(z.string().max(2000)).optional(),
	prepTime: z.number().int().nonnegative().optional(),
	cookTime: z.number().int().nonnegative().optional(),
	servings: z.number().int().positive().optional(),
	cuisine: z.string().max(100).optional(),
	difficulty: z.enum(["easy", "medium", "hard"]).optional(),
	sourceUrl: z.string().url().max(2000).optional(),
	imageUrl: z.string().url().max(2000).optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
	isFavorite: z.boolean().default(false),
	workspaceId: z.string().uuid(),
});

export const updateRecipeSchema = createRecipeSchema.partial().omit({ workspaceId: true });

export const addRecipeToListSchema = z.object({
	listId: z.string().uuid(),
	scale: z.number().positive().default(1),
});

// ─── Database validators ───

export const propertyTypeEnum = z.enum([
	"text",
	"number",
	"select",
	"multi_select",
	"date",
	"checkbox",
	"url",
	"email",
	"phone",
	"relation",
	"formula",
	"person",
]);

export const viewTypeEnum = z.enum(["table", "board", "calendar", "gallery", "list"]);

export const selectOptionSchema = z.object({
	id: z.string(),
	label: z.string().min(1).max(100),
	color: z.string().max(50),
});

export const createDatabaseSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	icon: z.string().max(10).optional(),
	workspaceId: z.string().uuid(),
});

export const updateDatabaseSchema = createDatabaseSchema.partial().omit({ workspaceId: true });

export const createPropertySchema = z.object({
	databaseId: z.string().uuid(),
	name: z.string().min(1).max(200),
	type: propertyTypeEnum,
	config: z.record(z.unknown()).optional(),
	position: z.number().int().nonnegative().optional(),
});

export const updatePropertySchema = z.object({
	name: z.string().min(1).max(200).optional(),
	type: propertyTypeEnum.optional(),
	config: z.record(z.unknown()).optional(),
	position: z.number().int().nonnegative().optional(),
	isVisible: z.boolean().optional(),
	width: z.number().int().positive().optional(),
});

export const createViewSchema = z.object({
	databaseId: z.string().uuid(),
	name: z.string().min(1).max(200),
	type: viewTypeEnum,
	config: z.record(z.unknown()).optional(),
	filters: z
		.array(
			z.object({
				propertyId: z.string().uuid(),
				operator: z.enum([
					"equals",
					"not_equals",
					"contains",
					"not_contains",
					"is_empty",
					"is_not_empty",
					"gt",
					"lt",
					"gte",
					"lte",
				]),
				value: z.unknown().optional(),
			}),
		)
		.optional(),
	sorts: z
		.array(
			z.object({
				propertyId: z.string().uuid(),
				direction: z.enum(["asc", "desc"]),
			}),
		)
		.optional(),
	groupByPropertyId: z.string().uuid().optional(),
});

export const updateViewSchema = createViewSchema
	.partial()
	.omit({ databaseId: true });

export const createRowSchema = z.object({
	databaseId: z.string().uuid(),
	values: z.record(z.unknown()).default({}),
	position: z.number().int().nonnegative().optional(),
});

export const updateRowSchema = z.object({
	values: z.record(z.unknown()).optional(),
	position: z.number().int().nonnegative().optional(),
});

export type PropertyType = z.infer<typeof propertyTypeEnum>;
export type ViewType = z.infer<typeof viewTypeEnum>;
export type SelectOption = z.infer<typeof selectOptionSchema>;
export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;
export type UpdateDatabaseInput = z.infer<typeof updateDatabaseSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateViewInput = z.infer<typeof createViewSchema>;
export type UpdateViewInput = z.infer<typeof updateViewSchema>;
export type CreateRowInput = z.infer<typeof createRowSchema>;
export type UpdateRowInput = z.infer<typeof updateRowSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>;
export type CreateShoppingItemInput = z.infer<typeof createShoppingItemSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type AddRecipeToListInput = z.infer<typeof addRecipeToListSchema>;
