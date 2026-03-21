import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { users } from "./users.js";
import { workspaces } from "./users.js";

export const tasks = sqliteTable("tasks", {
	...baseColumns,
	title: text("title").notNull(),
	description: text("description"),
	status: text("status", { enum: ["todo", "in_progress", "done"] })
		.notNull()
		.default("todo"),
	priority: integer("priority").notNull().default(4),
	dueDate: text("due_date"),
	recurrenceRule: text("recurrence_rule"),
	parentTaskId: text("parent_task_id"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

export const labels = sqliteTable("labels", {
	...baseColumns,
	name: text("name").notNull(),
	color: text("color").notNull(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

export const taskLabels = sqliteTable("task_labels", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	taskId: text("task_id")
		.notNull()
		.references(() => tasks.id),
	labelId: text("label_id")
		.notNull()
		.references(() => labels.id),
});
