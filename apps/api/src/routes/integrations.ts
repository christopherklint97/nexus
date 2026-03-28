import { zValidator } from "@hono/zod-validator";
import { apiKeys, webhookDeliveries, webhooks } from "@nexus/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const integrations = new Hono();
integrations.use("*", authMiddleware);

// ─── API Keys ───

integrations.get("/api-keys", zValidator("query", z.object({ workspaceId: z.string().uuid() })), async (c) => {
	const { workspaceId } = c.req.valid("query");
	const keys = db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.deletedAt)))
		.all();

	// Never return the hash, only prefix
	const data = keys.map((k) => ({
		id: k.id,
		name: k.name,
		keyPrefix: k.keyPrefix,
		scopes: k.scopes,
		lastUsedAt: k.lastUsedAt,
		expiresAt: k.expiresAt,
		createdAt: k.createdAt,
	}));

	return c.json({ data });
});

integrations.post(
	"/api-keys",
	zValidator("json", z.object({
		name: z.string().min(1).max(100),
		scopes: z.enum(["read", "write", "admin"]).default("read"),
		workspaceId: z.string().uuid(),
		expiresAt: z.string().datetime().optional(),
	})),
	async (c) => {
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		// Generate API key: nxs_<random>
		const rawKey = `nxs_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
		const keyPrefix = rawKey.slice(0, 12);

		// Hash the key for storage
		const encoder = new TextEncoder();
		const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
		const keyHash = Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		db.insert(apiKeys)
			.values({
				id,
				name: input.name,
				keyHash,
				keyPrefix,
				scopes: input.scopes,
				expiresAt: input.expiresAt || null,
				workspaceId: input.workspaceId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		// Return the raw key ONCE — it won't be retrievable after this
		return c.json({
			data: {
				id,
				name: input.name,
				key: rawKey,
				keyPrefix,
				scopes: input.scopes,
				message: "Save this key now. It won't be shown again.",
			},
		}, 201);
	},
);

integrations.delete("/api-keys/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(apiKeys).set({ deletedAt: now, updatedAt: now }).where(eq(apiKeys.id, id)).run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Webhooks ───

integrations.get("/webhooks", zValidator("query", z.object({ workspaceId: z.string().uuid() })), async (c) => {
	const { workspaceId } = c.req.valid("query");
	const hooks = db
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.workspaceId, workspaceId), isNull(webhooks.deletedAt)))
		.all();

	const data = hooks.map((h) => ({
		...h,
		events: JSON.parse(h.events),
	}));

	return c.json({ data });
});

integrations.post(
	"/webhooks",
	zValidator("json", z.object({
		url: z.string().url().max(2000),
		events: z.array(z.string()).min(1),
		workspaceId: z.string().uuid(),
	})),
	async (c) => {
		const input = c.req.valid("json");
		const id = crypto.randomUUID();
		const secret = crypto.randomUUID().replace(/-/g, "");
		const now = new Date().toISOString();

		db.insert(webhooks)
			.values({
				id,
				url: input.url,
				events: JSON.stringify(input.events),
				secret,
				workspaceId: input.workspaceId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		return c.json({
			data: {
				id,
				url: input.url,
				events: input.events,
				secret,
				message: "Save the secret for webhook signature verification.",
			},
		}, 201);
	},
);

integrations.patch(
	"/webhooks/:id",
	zValidator("json", z.object({
		url: z.string().url().max(2000).optional(),
		events: z.array(z.string()).min(1).optional(),
		isActive: z.boolean().optional(),
	})),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");
		const now = new Date().toISOString();

		const updates: Record<string, unknown> = { updatedAt: now };
		if (input.url !== undefined) updates.url = input.url;
		if (input.events !== undefined) updates.events = JSON.stringify(input.events);
		if (input.isActive !== undefined) {
			updates.isActive = input.isActive ? 1 : 0;
			if (input.isActive) updates.failureCount = 0; // reset on re-enable
		}

		db.update(webhooks).set(updates).where(eq(webhooks.id, id)).run();
		const hook = db.select().from(webhooks).where(eq(webhooks.id, id)).get();
		return c.json({ data: { ...hook, events: JSON.parse(hook!.events) } });
	},
);

integrations.delete("/webhooks/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(webhooks).set({ deletedAt: now, updatedAt: now }).where(eq(webhooks.id, id)).run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Webhook Deliveries (recent history) ───

integrations.get("/webhooks/:id/deliveries", async (c) => {
	const webhookId = c.req.param("id");
	const deliveries = db
		.select()
		.from(webhookDeliveries)
		.where(eq(webhookDeliveries.webhookId, webhookId))
		.orderBy(desc(webhookDeliveries.createdAt))
		.limit(50)
		.all();

	return c.json({ data: deliveries });
});

export default integrations;
