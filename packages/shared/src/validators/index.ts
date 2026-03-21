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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateShoppingListInput = z.infer<typeof createShoppingListSchema>;
export type CreateShoppingItemInput = z.infer<typeof createShoppingItemSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
