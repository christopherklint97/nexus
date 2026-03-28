import { zValidator } from "@hono/zod-validator";
import {
	activityLog,
	comments,
	mentions,
	pageHistory,
	pagePermissions,
	shareLinks,
	workspaceMembers,
} from "@nexus/db/schema";
import { users } from "@nexus/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { broadcastToPage } from "../lib/websocket.js";

const collab = new Hono();
collab.use("*", authMiddleware);

// ─── Comments ───

const createCommentSchema = z.object({
	content: z.string().min(1).max(5000),
	pageType: z.string(),
	pageId: z.string().uuid(),
	blockId: z.string().optional(),
	parentCommentId: z.string().uuid().optional(),
	workspaceId: z.string().uuid(),
	mentionUserIds: z.array(z.string().uuid()).optional(),
});

collab.get("/comments", zValidator("query", z.object({
	pageType: z.string(),
	pageId: z.string().uuid(),
})), async (c) => {
	const { pageType, pageId } = c.req.valid("query");

	const result = db
		.select({
			comment: comments,
			authorName: users.name,
			authorEmail: users.email,
		})
		.from(comments)
		.innerJoin(users, eq(comments.authorId, users.id))
		.where(
			and(
				eq(comments.pageType, pageType),
				eq(comments.pageId, pageId),
				isNull(comments.deletedAt),
			),
		)
		.orderBy(desc(comments.createdAt))
		.all();

	const data = result.map((r) => ({
		...r.comment,
		author: { name: r.authorName, email: r.authorEmail },
	}));

	return c.json({ data });
});

collab.post("/comments", zValidator("json", createCommentSchema), async (c) => {
	const userId = c.get("userId");
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.insert(comments)
		.values({
			id,
			content: input.content,
			pageType: input.pageType,
			pageId: input.pageId,
			blockId: input.blockId || null,
			parentCommentId: input.parentCommentId || null,
			authorId: userId,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Create mentions
	if (input.mentionUserIds?.length) {
		for (const mentionedUserId of input.mentionUserIds) {
			db.insert(mentions)
				.values({
					mentionedUserId,
					commentId: id,
					pageType: input.pageType,
					pageId: input.pageId,
					mentionedByUserId: userId,
					createdAt: now,
					updatedAt: now,
				})
				.run();
		}
	}

	// Log activity
	db.insert(activityLog)
		.values({
			action: "commented",
			pageType: input.pageType,
			pageId: input.pageId,
			userId,
			detailsJson: JSON.stringify({ commentId: id, preview: input.content.slice(0, 100) }),
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Broadcast to page viewers
	broadcastToPage(input.pageId, {
		type: "new_comment",
		commentId: id,
		authorId: userId,
		content: input.content.slice(0, 200),
	});

	const comment = db.select().from(comments).where(eq(comments.id, id)).get();
	return c.json({ data: comment }, 201);
});

collab.patch("/comments/:id/resolve", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(comments)
		.set({ isResolved: 1, updatedAt: now })
		.where(eq(comments.id, id))
		.run();
	return c.json({ data: { id, resolved: true } });
});

collab.patch("/comments/:id/unresolve", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(comments)
		.set({ isResolved: 0, updatedAt: now })
		.where(eq(comments.id, id))
		.run();
	return c.json({ data: { id, resolved: false } });
});

collab.delete("/comments/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(comments)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(comments.id, id))
		.run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Mentions ───

collab.get("/mentions", async (c) => {
	const userId = c.get("userId");
	const result = db
		.select()
		.from(mentions)
		.where(and(eq(mentions.mentionedUserId, userId), isNull(mentions.deletedAt)))
		.orderBy(desc(mentions.createdAt))
		.all();
	return c.json({ data: result });
});

collab.patch("/mentions/:id/read", async (c) => {
	const id = c.req.param("id");
	db.update(mentions)
		.set({ isRead: 1, updatedAt: new Date().toISOString() })
		.where(eq(mentions.id, id))
		.run();
	return c.json({ data: { id, read: true } });
});

// ─── Share Links ───

const createShareSchema = z.object({
	pageType: z.string(),
	pageId: z.string().uuid(),
	permission: z.enum(["view", "comment", "edit"]).default("view"),
	isPublic: z.boolean().default(false),
	expiresAt: z.string().datetime().optional(),
	workspaceId: z.string().uuid(),
});

collab.get("/shares", zValidator("query", z.object({
	pageType: z.string(),
	pageId: z.string().uuid(),
})), async (c) => {
	const { pageType, pageId } = c.req.valid("query");
	const result = db
		.select()
		.from(shareLinks)
		.where(
			and(
				eq(shareLinks.pageType, pageType),
				eq(shareLinks.pageId, pageId),
				isNull(shareLinks.deletedAt),
			),
		)
		.all();
	return c.json({ data: result });
});

collab.post("/shares", zValidator("json", createShareSchema), async (c) => {
	const userId = c.get("userId");
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const token = crypto.randomUUID().replace(/-/g, "");
	const now = new Date().toISOString();

	db.insert(shareLinks)
		.values({
			id,
			pageType: input.pageType,
			pageId: input.pageId,
			token,
			permission: input.permission,
			isPublic: input.isPublic ? 1 : 0,
			expiresAt: input.expiresAt || null,
			createdById: userId,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Log activity
	db.insert(activityLog)
		.values({
			action: "shared",
			pageType: input.pageType,
			pageId: input.pageId,
			userId,
			detailsJson: JSON.stringify({ permission: input.permission, isPublic: input.isPublic }),
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const link = db.select().from(shareLinks).where(eq(shareLinks.id, id)).get();
	return c.json({ data: link }, 201);
});

collab.delete("/shares/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(shareLinks)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(shareLinks.id, id))
		.run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Workspace Members ───

collab.get("/members", zValidator("query", z.object({ workspaceId: z.string().uuid() })), async (c) => {
	const { workspaceId } = c.req.valid("query");
	const result = db
		.select({
			member: workspaceMembers,
			userName: users.name,
			userEmail: users.email,
		})
		.from(workspaceMembers)
		.innerJoin(users, eq(workspaceMembers.userId, users.id))
		.where(and(eq(workspaceMembers.workspaceId, workspaceId), isNull(workspaceMembers.deletedAt)))
		.all();

	const data = result.map((r) => ({
		...r.member,
		user: { name: r.userName, email: r.userEmail },
	}));
	return c.json({ data });
});

collab.post("/members/invite", zValidator("json", z.object({
	workspaceId: z.string().uuid(),
	email: z.string().email(),
	role: z.enum(["admin", "member", "guest"]).default("member"),
})), async (c) => {
	const userId = c.get("userId");
	const { workspaceId, email, role } = c.req.valid("json");
	const now = new Date().toISOString();

	// Find user by email
	const targetUser = db.select().from(users).where(eq(users.email, email)).get();
	if (!targetUser) {
		return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);
	}

	// Check if already a member
	const existing = db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, targetUser.id),
				isNull(workspaceMembers.deletedAt),
			),
		)
		.get();

	if (existing) {
		return c.json({ error: { message: "User is already a member", code: "ALREADY_MEMBER" } }, 409);
	}

	db.insert(workspaceMembers)
		.values({
			workspaceId,
			userId: targetUser.id,
			role,
			invitedById: userId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	return c.json({ data: { userId: targetUser.id, email, role, workspaceId } }, 201);
});

collab.patch("/members/:memberId/role", zValidator("json", z.object({
	role: z.enum(["admin", "member", "guest"]),
})), async (c) => {
	const memberId = c.req.param("memberId");
	const { role } = c.req.valid("json");
	db.update(workspaceMembers)
		.set({ role, updatedAt: new Date().toISOString() })
		.where(eq(workspaceMembers.id, memberId))
		.run();
	return c.json({ data: { id: memberId, role } });
});

collab.delete("/members/:memberId", async (c) => {
	const memberId = c.req.param("memberId");
	const now = new Date().toISOString();
	db.update(workspaceMembers)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(workspaceMembers.id, memberId))
		.run();
	return c.json({ data: { id: memberId, removed: true } });
});

// ─── Activity Log ───

collab.get("/activity", zValidator("query", z.object({
	workspaceId: z.string().uuid(),
	pageType: z.string().optional(),
	pageId: z.string().uuid().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
})), async (c) => {
	const { workspaceId, pageType, pageId, limit } = c.req.valid("query");

	const conditions = [eq(activityLog.workspaceId, workspaceId), isNull(activityLog.deletedAt)];
	if (pageType) conditions.push(eq(activityLog.pageType, pageType));
	if (pageId) conditions.push(eq(activityLog.pageId, pageId));

	const result = db
		.select({
			activity: activityLog,
			userName: users.name,
		})
		.from(activityLog)
		.innerJoin(users, eq(activityLog.userId, users.id))
		.where(and(...conditions))
		.orderBy(desc(activityLog.createdAt))
		.limit(limit)
		.all();

	const data = result.map((r) => ({
		...r.activity,
		details: r.activity.detailsJson ? JSON.parse(r.activity.detailsJson) : null,
		userName: r.userName,
	}));

	return c.json({ data });
});

// ─── Page History ───

collab.get("/history", zValidator("query", z.object({
	pageType: z.string(),
	pageId: z.string().uuid(),
})), async (c) => {
	const { pageType, pageId } = c.req.valid("query");

	const result = db
		.select({
			history: pageHistory,
			editorName: users.name,
		})
		.from(pageHistory)
		.innerJoin(users, eq(pageHistory.editedById, users.id))
		.where(and(eq(pageHistory.pageType, pageType), eq(pageHistory.pageId, pageId)))
		.orderBy(desc(pageHistory.version))
		.limit(50)
		.all();

	const data = result.map((r) => ({
		...r.history,
		editorName: r.editorName,
	}));

	return c.json({ data });
});

collab.post("/history", zValidator("json", z.object({
	pageType: z.string(),
	pageId: z.string().uuid(),
	snapshotJson: z.string(),
})), async (c) => {
	const userId = c.get("userId");
	const input = c.req.valid("json");
	const now = new Date().toISOString();

	// Get next version number
	const latest = db
		.select({ maxVer: sql<number>`coalesce(max(version), 0)` })
		.from(pageHistory)
		.where(and(eq(pageHistory.pageType, input.pageType), eq(pageHistory.pageId, input.pageId)))
		.get();

	const version = (latest?.maxVer || 0) + 1;

	db.insert(pageHistory)
		.values({
			pageType: input.pageType,
			pageId: input.pageId,
			version,
			snapshotJson: input.snapshotJson,
			editedById: userId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	return c.json({ data: { pageId: input.pageId, version } }, 201);
});

export default collab;
