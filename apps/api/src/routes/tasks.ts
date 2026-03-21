import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { tasks, taskLabels, labels } from "@nexus/db/schema";
import { createTaskSchema, updateTaskSchema } from "@nexus/shared/validators";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const tasksRouter = new Hono();
tasksRouter.use("*", authMiddleware);

const taskQuerySchema = z.object({
	workspaceId: z.string().uuid(),
	status: z.enum(["todo", "in_progress", "done"]).optional(),
	priority: z.coerce.number().int().min(1).max(4).optional(),
	parentTaskId: z.string().uuid().optional().nullable(),
	sort: z.enum(["priority", "due_date", "created_at", "title"]).default("created_at"),
	order: z.enum(["asc", "desc"]).default("desc"),
});

// List tasks
tasksRouter.get("/", zValidator("query", taskQuerySchema), async (c) => {
	const { workspaceId, status, priority, parentTaskId, sort, order } = c.req.valid("query");

	const conditions = [
		eq(tasks.workspaceId, workspaceId),
		isNull(tasks.deletedAt),
	];

	if (status) conditions.push(eq(tasks.status, status));
	if (priority) conditions.push(eq(tasks.priority, priority));
	if (parentTaskId !== undefined) {
		if (parentTaskId === null) {
			conditions.push(isNull(tasks.parentTaskId));
		} else {
			conditions.push(eq(tasks.parentTaskId, parentTaskId));
		}
	}

	const sortColumn = {
		priority: tasks.priority,
		due_date: tasks.dueDate,
		created_at: tasks.createdAt,
		title: tasks.title,
	}[sort];

	const orderFn = order === "asc" ? asc : desc;

	const result = db
		.select()
		.from(tasks)
		.where(and(...conditions))
		.orderBy(orderFn(sortColumn))
		.all();

	// Fetch labels for all tasks
	const taskIds = result.map((t) => t.id);
	const taskLabelRows =
		taskIds.length > 0
			? db
					.select({
						taskId: taskLabels.taskId,
						labelId: labels.id,
						labelName: labels.name,
						labelColor: labels.color,
					})
					.from(taskLabels)
					.innerJoin(labels, eq(taskLabels.labelId, labels.id))
					.where(
						sql`${taskLabels.taskId} IN (${sql.join(
							taskIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					)
					.all()
			: [];

	const labelsByTask = new Map<string, { id: string; name: string; color: string }[]>();
	for (const row of taskLabelRows) {
		const existing = labelsByTask.get(row.taskId) || [];
		existing.push({ id: row.labelId, name: row.labelName, color: row.labelColor });
		labelsByTask.set(row.taskId, existing);
	}

	// Count subtasks per task
	const subtaskCounts =
		taskIds.length > 0
			? db
					.select({
						parentTaskId: tasks.parentTaskId,
						total: sql<number>`count(*)`,
						done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
					})
					.from(tasks)
					.where(
						and(
							sql`${tasks.parentTaskId} IN (${sql.join(
								taskIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
							isNull(tasks.deletedAt),
						),
					)
					.groupBy(tasks.parentTaskId)
					.all()
			: [];

	const subtaskMap = new Map<string, { total: number; done: number }>();
	for (const row of subtaskCounts) {
		if (row.parentTaskId) {
			subtaskMap.set(row.parentTaskId, { total: row.total, done: row.done });
		}
	}

	const tasksWithMeta = result.map((task) => ({
		...task,
		labels: labelsByTask.get(task.id) || [],
		subtasks: subtaskMap.get(task.id) || { total: 0, done: 0 },
	}));

	return c.json({ data: tasksWithMeta });
});

// Get single task
tasksRouter.get("/:id", async (c) => {
	const id = c.req.param("id");
	const task = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
		.get();

	if (!task) {
		return c.json({ error: { message: "Task not found", code: "NOT_FOUND" } }, 404);
	}

	// Fetch labels
	const taskLabelRows = db
		.select({
			labelId: labels.id,
			labelName: labels.name,
			labelColor: labels.color,
		})
		.from(taskLabels)
		.innerJoin(labels, eq(taskLabels.labelId, labels.id))
		.where(eq(taskLabels.taskId, id))
		.all();

	// Fetch subtasks
	const subtaskList = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.parentTaskId, id), isNull(tasks.deletedAt)))
		.orderBy(asc(tasks.createdAt))
		.all();

	return c.json({
		data: {
			...task,
			labels: taskLabelRows.map((r) => ({ id: r.labelId, name: r.labelName, color: r.labelColor })),
			subtaskList,
		},
	});
});

// Create task
tasksRouter.post("/", zValidator("json", createTaskSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(tasks)
		.values({
			id,
			title: input.title,
			description: input.description || null,
			status: input.status,
			priority: input.priority,
			dueDate: input.dueDate || null,
			parentTaskId: input.parentTaskId || null,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
	return c.json({ data: task }, 201);
});

// Update task
tasksRouter.patch("/:id", zValidator("json", updateTaskSchema), async (c) => {
	const id = c.req.param("id");
	const input = c.req.valid("json");

	const existing = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
		.get();

	if (!existing) {
		return c.json({ error: { message: "Task not found", code: "NOT_FOUND" } }, 404);
	}

	const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
	if (input.title !== undefined) updates.title = input.title;
	if (input.description !== undefined) updates.description = input.description;
	if (input.status !== undefined) updates.status = input.status;
	if (input.priority !== undefined) updates.priority = input.priority;
	if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
	if (input.parentTaskId !== undefined) updates.parentTaskId = input.parentTaskId;

	db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

	const updated = db.select().from(tasks).where(eq(tasks.id, id)).get();
	return c.json({ data: updated });
});

// Delete task (soft delete)
tasksRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const existing = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
		.get();

	if (!existing) {
		return c.json({ error: { message: "Task not found", code: "NOT_FOUND" } }, 404);
	}

	db.update(tasks)
		.set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
		.where(eq(tasks.id, id))
		.run();

	return c.json({ data: { id, deleted: true } });
});

// --- Label management ---

const labelSchema = z.object({
	name: z.string().min(1).max(100),
	color: z.string().min(1).max(20),
	workspaceId: z.string().uuid(),
});

// List labels
tasksRouter.get("/labels/list", zValidator("query", z.object({ workspaceId: z.string().uuid() })), async (c) => {
	const { workspaceId } = c.req.valid("query");
	const result = db
		.select()
		.from(labels)
		.where(and(eq(labels.workspaceId, workspaceId), isNull(labels.deletedAt)))
		.all();
	return c.json({ data: result });
});

// Create label
tasksRouter.post("/labels", zValidator("json", labelSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(labels).values({ id, ...input, createdAt: now, updatedAt: now }).run();
	const label = db.select().from(labels).where(eq(labels.id, id)).get();
	return c.json({ data: label }, 201);
});

// Assign label to task
tasksRouter.post(
	"/:taskId/labels",
	zValidator("json", z.object({ labelId: z.string().uuid() })),
	async (c) => {
		const taskId = c.req.param("taskId");
		const { labelId } = c.req.valid("json");

		db.insert(taskLabels).values({ taskId, labelId }).run();
		return c.json({ data: { taskId, labelId } }, 201);
	},
);

// Remove label from task
tasksRouter.delete("/:taskId/labels/:labelId", async (c) => {
	const taskId = c.req.param("taskId");
	const labelId = c.req.param("labelId");

	db.delete(taskLabels)
		.where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)))
		.run();

	return c.json({ data: { taskId, labelId, removed: true } });
});

export default tasksRouter;
