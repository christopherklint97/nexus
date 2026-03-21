import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { workspaces } from "./users.js";

export const folders = sqliteTable("folders", {
	...baseColumns,
	name: text("name").notNull(),
	parentFolderId: text("parent_folder_id"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

export const notes = sqliteTable("notes", {
	...baseColumns,
	title: text("title").notNull(),
	contentBlocksJson: text("content_blocks_json"),
	folderId: text("folder_id").references(() => folders.id),
	isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

export const documents = sqliteTable("documents", {
	...baseColumns,
	name: text("name").notNull(),
	filePath: text("file_path").notNull(),
	mimeType: text("mime_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	noteId: text("note_id").references(() => notes.id),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});
