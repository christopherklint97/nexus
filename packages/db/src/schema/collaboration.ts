import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { baseColumns } from "./helpers.js";
import { users, workspaces } from "./users.js";

// ─── Comments (page-level and inline) ───

export const comments = sqliteTable("comments", {
	...baseColumns,
	content: text("content").notNull(),
	// What the comment is on
	pageType: text("page_type").notNull(), // "note", "database", "task", "recipe"
	pageId: text("page_id").notNull(),
	// Optional: inline comment on a specific block
	blockId: text("block_id"),
	// Thread support
	parentCommentId: text("parent_comment_id"), // reply to another comment
	isResolved: integer("is_resolved").notNull().default(0), // boolean
	// Author
	authorId: text("author_id")
		.notNull()
		.references(() => users.id),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// ─── Mentions ───

export const mentions = sqliteTable("mentions", {
	...baseColumns,
	// Who was mentioned
	mentionedUserId: text("mentioned_user_id")
		.notNull()
		.references(() => users.id),
	// Where they were mentioned
	commentId: text("comment_id").references(() => comments.id),
	pageType: text("page_type"),
	pageId: text("page_id"),
	// Who mentioned them
	mentionedByUserId: text("mentioned_by_user_id")
		.notNull()
		.references(() => users.id),
	// Has the mention been seen?
	isRead: integer("is_read").notNull().default(0), // boolean
});

// ─── Share Links ───

export const shareLinks = sqliteTable("share_links", {
	...baseColumns,
	pageType: text("page_type").notNull(),
	pageId: text("page_id").notNull(),
	token: text("token").notNull(), // unique share token
	permission: text("permission", { enum: ["view", "comment", "edit"] })
		.notNull()
		.default("view"),
	isPublic: integer("is_public").notNull().default(0), // boolean — publicly accessible?
	expiresAt: text("expires_at"), // optional expiry
	createdById: text("created_by_id")
		.notNull()
		.references(() => users.id),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// ─── Workspace Members ───

export const workspaceMembers = sqliteTable("workspace_members", {
	...baseColumns,
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	role: text("role", { enum: ["admin", "member", "guest"] })
		.notNull()
		.default("member"),
	invitedById: text("invited_by_id").references(() => users.id),
});

// ─── Page Permissions (overrides workspace-level) ───

export const pagePermissions = sqliteTable("page_permissions", {
	...baseColumns,
	pageType: text("page_type").notNull(),
	pageId: text("page_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	permission: text("permission", { enum: ["view", "comment", "edit", "admin"] })
		.notNull()
		.default("view"),
});

// ─── Activity Log ───

export const activityLog = sqliteTable("activity_log", {
	...baseColumns,
	action: text("action").notNull(), // "created", "edited", "deleted", "commented", "shared", "restored"
	pageType: text("page_type").notNull(),
	pageId: text("page_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	// Snapshot of what changed (optional, for restore)
	detailsJson: text("details_json"),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id),
});

// ─── Page History (for version restore) ───

export const pageHistory = sqliteTable("page_history", {
	...baseColumns,
	pageType: text("page_type").notNull(),
	pageId: text("page_id").notNull(),
	version: integer("version").notNull(),
	snapshotJson: text("snapshot_json").notNull(), // full page content at this version
	editedById: text("edited_by_id")
		.notNull()
		.references(() => users.id),
});
