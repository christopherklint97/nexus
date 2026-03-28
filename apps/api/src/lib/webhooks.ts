// ─── Webhook Delivery Engine ───

import { webhookDeliveries, webhooks } from "@nexus/db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "./db.js";

export type WebhookEvent =
	| "task.created" | "task.updated" | "task.deleted"
	| "note.created" | "note.updated" | "note.deleted"
	| "database.row.created" | "database.row.updated" | "database.row.deleted"
	| "shopping.item.created" | "shopping.item.checked"
	| "recipe.created" | "recipe.updated"
	| "comment.created";

interface WebhookPayload {
	event: WebhookEvent;
	timestamp: string;
	data: Record<string, unknown>;
}

/**
 * Fire webhook for a given event. Finds all active webhooks
 * subscribed to this event and delivers asynchronously.
 */
export async function fireWebhook(
	workspaceId: string,
	event: WebhookEvent,
	data: Record<string, unknown>,
) {
	const activeHooks = db
		.select()
		.from(webhooks)
		.where(and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.isActive, 1)))
		.all();

	const matching = activeHooks.filter((h) => {
		try {
			const events = JSON.parse(h.events) as string[];
			return events.includes(event) || events.includes("*");
		} catch {
			return false;
		}
	});

	const payload: WebhookPayload = {
		event,
		timestamp: new Date().toISOString(),
		data,
	};

	// Fire all webhooks concurrently (don't block the request)
	for (const hook of matching) {
		deliverWebhook(hook.id, hook.url, hook.secret, payload).catch(() => {});
	}
}

async function deliverWebhook(
	webhookId: string,
	url: string,
	secret: string,
	payload: WebhookPayload,
) {
	const body = JSON.stringify(payload);
	const now = new Date().toISOString();

	// Create HMAC signature
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
	const sigHex = Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	let responseStatus = 0;
	let responseBody = "";
	let success = false;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Nexus-Signature": `sha256=${sigHex}`,
				"X-Nexus-Event": payload.event,
			},
			body,
			signal: AbortSignal.timeout(10_000),
		});

		responseStatus = res.status;
		responseBody = await res.text().catch(() => "");
		success = res.ok;
	} catch (err) {
		responseBody = err instanceof Error ? err.message : "Delivery failed";
	}

	// Log delivery
	db.insert(webhookDeliveries)
		.values({
			webhookId,
			event: payload.event,
			payloadJson: body,
			responseStatus,
			responseBody: responseBody.slice(0, 5000),
			success: success ? 1 : 0,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Update webhook metadata
	const updates: Record<string, unknown> = { lastTriggeredAt: now };
	if (!success) {
		const hook = db.select().from(webhooks).where(eq(webhooks.id, webhookId)).get();
		const newFailCount = (hook?.failureCount || 0) + 1;
		updates.failureCount = newFailCount;
		// Auto-disable after 10 consecutive failures
		if (newFailCount >= 10) {
			updates.isActive = 0;
		}
	} else {
		updates.failureCount = 0;
	}

	db.update(webhooks).set(updates).where(eq(webhooks.id, webhookId)).run();
}
