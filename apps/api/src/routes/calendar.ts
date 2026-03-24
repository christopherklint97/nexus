import { zValidator } from "@hono/zod-validator";
import { calendarConnections } from "@nexus/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const calendar = new Hono();
calendar.use("*", authMiddleware);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
	process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/google/callback";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// In-memory cache for calendar events (TTL: 5 min)
const eventsCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ─── Google OAuth ───

// Initiate OAuth flow
calendar.get("/google/auth", (c) => {
	const userId = c.get("userId");
	const scopes = [
		"https://www.googleapis.com/auth/calendar.readonly",
		"https://www.googleapis.com/auth/calendar.events",
	].join(" ");

	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: GOOGLE_REDIRECT_URI,
		response_type: "code",
		scope: scopes,
		access_type: "offline",
		prompt: "consent",
		state: userId,
	});

	return c.json({ data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } });
});

// OAuth callback
calendar.get("/google/callback", async (c) => {
	const code = c.req.query("code");
	const userId = c.req.query("state");

	if (!code || !userId) {
		return c.json({ error: { message: "Missing code or state", code: "OAUTH_ERROR" } }, 400);
	}

	// Exchange code for tokens
	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: GOOGLE_REDIRECT_URI,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenRes.ok) {
		const err = await tokenRes.text();
		return c.json(
			{ error: { message: "Token exchange failed", code: "OAUTH_ERROR", details: err } },
			400,
		);
	}

	const tokens = (await tokenRes.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	};

	const now = new Date().toISOString();
	const id = crypto.randomUUID();

	// Upsert connection
	const existing = db
		.select()
		.from(calendarConnections)
		.where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, "google")))
		.get();

	if (existing) {
		db.update(calendarConnections)
			.set({
				accessTokenEncrypted: tokens.access_token,
				refreshTokenEncrypted: tokens.refresh_token || existing.refreshTokenEncrypted,
				updatedAt: now,
			})
			.where(eq(calendarConnections.id, existing.id))
			.run();
	} else {
		db.insert(calendarConnections)
			.values({
				id,
				provider: "google",
				accessTokenEncrypted: tokens.access_token,
				refreshTokenEncrypted: tokens.refresh_token || "",
				userId,
				createdAt: now,
				updatedAt: now,
			})
			.run();
	}

	// Redirect to app or return success
	return c.json({ data: { connected: true } });
});

// Check connection status
calendar.get("/status", (c) => {
	const userId = c.get("userId");
	const conn = db
		.select()
		.from(calendarConnections)
		.where(
			and(
				eq(calendarConnections.userId, userId),
				eq(calendarConnections.provider, "google"),
				isNull(calendarConnections.deletedAt),
			),
		)
		.get();

	return c.json({ data: { connected: !!conn } });
});

// Disconnect
calendar.delete("/google/disconnect", (c) => {
	const userId = c.get("userId");
	const now = new Date().toISOString();
	db.update(calendarConnections)
		.set({ deletedAt: now, updatedAt: now })
		.where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, "google")))
		.run();
	return c.json({ data: { disconnected: true } });
});

// ─── Events Proxy ───

const eventsQuerySchema = z.object({
	timeMin: z.string().datetime(),
	timeMax: z.string().datetime(),
	calendarId: z.string().default("primary"),
	maxResults: z.coerce.number().int().min(1).max(250).default(50),
});

// List events (cached)
calendar.get("/events", zValidator("query", eventsQuerySchema), async (c) => {
	const userId = c.get("userId");
	const { timeMin, timeMax, calendarId, maxResults } = c.req.valid("query");

	const cacheKey = `${userId}:${calendarId}:${timeMin}:${timeMax}`;
	const cached = eventsCache.get(cacheKey);
	if (cached && cached.expires > Date.now()) {
		return c.json({ data: cached.data, cached: true });
	}

	const accessToken = await getAccessToken(userId);
	if (!accessToken) {
		return c.json(
			{ error: { message: "Google Calendar not connected", code: "NOT_CONNECTED" } },
			401,
		);
	}

	const params = new URLSearchParams({
		timeMin,
		timeMax,
		maxResults: String(maxResults),
		singleEvents: "true",
		orderBy: "startTime",
	});

	const res = await fetch(
		`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	if (res.status === 401) {
		// Try to refresh token
		const newToken = await refreshAccessToken(userId);
		if (newToken) {
			const retryRes = await fetch(
				`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
				{
					headers: { Authorization: `Bearer ${newToken}` },
				},
			);
			if (retryRes.ok) {
				const data = await retryRes.json();
				const events = mapGoogleEvents(data);
				eventsCache.set(cacheKey, { data: events, expires: Date.now() + CACHE_TTL });
				return c.json({ data: events });
			}
		}
		return c.json(
			{ error: { message: "Google Calendar auth expired", code: "AUTH_EXPIRED" } },
			401,
		);
	}

	if (!res.ok) {
		return c.json({ error: { message: "Failed to fetch events", code: "GOOGLE_API_ERROR" } }, 502);
	}

	const data = await res.json();
	const events = mapGoogleEvents(data);
	eventsCache.set(cacheKey, { data: events, expires: Date.now() + CACHE_TTL });
	return c.json({ data: events });
});

// Create event
calendar.post(
	"/events",
	zValidator(
		"json",
		z.object({
			summary: z.string().min(1).max(500),
			description: z.string().max(5000).optional(),
			startDateTime: z.string().datetime(),
			endDateTime: z.string().datetime(),
			calendarId: z.string().default("primary"),
			colorId: z.string().optional(),
		}),
	),
	async (c) => {
		const userId = c.get("userId");
		const input = c.req.valid("json");

		const accessToken = await getAccessToken(userId);
		if (!accessToken) {
			return c.json(
				{ error: { message: "Google Calendar not connected", code: "NOT_CONNECTED" } },
				401,
			);
		}

		const body = {
			summary: input.summary,
			description: input.description,
			start: { dateTime: input.startDateTime, timeZone: "UTC" },
			end: { dateTime: input.endDateTime, timeZone: "UTC" },
			colorId: input.colorId,
		};

		const res = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			},
		);

		if (!res.ok) {
			return c.json(
				{ error: { message: "Failed to create event", code: "GOOGLE_API_ERROR" } },
				502,
			);
		}

		// Invalidate cache
		invalidateUserCache(userId);

		const event = await res.json();
		return c.json({ data: mapSingleEvent(event) }, 201);
	},
);

// Update event
calendar.patch(
	"/events/:eventId",
	zValidator(
		"json",
		z.object({
			summary: z.string().min(1).max(500).optional(),
			description: z.string().max(5000).optional(),
			startDateTime: z.string().datetime().optional(),
			endDateTime: z.string().datetime().optional(),
			calendarId: z.string().default("primary"),
			colorId: z.string().optional(),
		}),
	),
	async (c) => {
		const userId = c.get("userId");
		const eventId = c.req.param("eventId");
		const input = c.req.valid("json");

		const accessToken = await getAccessToken(userId);
		if (!accessToken) {
			return c.json({ error: { message: "Not connected", code: "NOT_CONNECTED" } }, 401);
		}

		const body: Record<string, unknown> = {};
		if (input.summary) body.summary = input.summary;
		if (input.description !== undefined) body.description = input.description;
		if (input.startDateTime) body.start = { dateTime: input.startDateTime, timeZone: "UTC" };
		if (input.endDateTime) body.end = { dateTime: input.endDateTime, timeZone: "UTC" };
		if (input.colorId) body.colorId = input.colorId;

		const res = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events/${eventId}`,
			{
				method: "PATCH",
				headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify(body),
			},
		);

		if (!res.ok) {
			return c.json(
				{ error: { message: "Failed to update event", code: "GOOGLE_API_ERROR" } },
				502,
			);
		}

		invalidateUserCache(userId);
		const event = await res.json();
		return c.json({ data: mapSingleEvent(event) });
	},
);

// Delete event
calendar.delete(
	"/events/:eventId",
	zValidator("query", z.object({ calendarId: z.string().default("primary") })),
	async (c) => {
		const userId = c.get("userId");
		const eventId = c.req.param("eventId");
		const { calendarId } = c.req.valid("query");

		const accessToken = await getAccessToken(userId);
		if (!accessToken) {
			return c.json({ error: { message: "Not connected", code: "NOT_CONNECTED" } }, 401);
		}

		const res = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
			{ method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (!res.ok && res.status !== 204) {
			return c.json(
				{ error: { message: "Failed to delete event", code: "GOOGLE_API_ERROR" } },
				502,
			);
		}

		invalidateUserCache(userId);
		return c.json({ data: { id: eventId, deleted: true } });
	},
);

// ─── Helpers ───

async function getAccessToken(userId: string): Promise<string | null> {
	const conn = db
		.select()
		.from(calendarConnections)
		.where(
			and(
				eq(calendarConnections.userId, userId),
				eq(calendarConnections.provider, "google"),
				isNull(calendarConnections.deletedAt),
			),
		)
		.get();
	return conn?.accessTokenEncrypted || null;
}

async function refreshAccessToken(userId: string): Promise<string | null> {
	const conn = db
		.select()
		.from(calendarConnections)
		.where(
			and(
				eq(calendarConnections.userId, userId),
				eq(calendarConnections.provider, "google"),
				isNull(calendarConnections.deletedAt),
			),
		)
		.get();

	if (!conn?.refreshTokenEncrypted) return null;

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			refresh_token: conn.refreshTokenEncrypted,
			grant_type: "refresh_token",
		}),
	});

	if (!res.ok) return null;

	const tokens = (await res.json()) as { access_token: string };
	db.update(calendarConnections)
		.set({ accessTokenEncrypted: tokens.access_token, updatedAt: new Date().toISOString() })
		.where(eq(calendarConnections.id, conn.id))
		.run();

	return tokens.access_token;
}

function invalidateUserCache(userId: string) {
	for (const [key] of eventsCache) {
		if (key.startsWith(`${userId}:`)) eventsCache.delete(key);
	}
}

interface GoogleEvent {
	id: string;
	summary?: string;
	description?: string;
	start: { dateTime?: string; date?: string };
	end: { dateTime?: string; date?: string };
	colorId?: string;
	status: string;
	htmlLink: string;
}

function mapSingleEvent(event: GoogleEvent) {
	return {
		id: event.id,
		title: event.summary || "(No title)",
		description: event.description || null,
		startDateTime: event.start.dateTime || event.start.date || "",
		endDateTime: event.end.dateTime || event.end.date || "",
		allDay: !event.start.dateTime,
		colorId: event.colorId || null,
		status: event.status,
		link: event.htmlLink,
	};
}

function mapGoogleEvents(data: { items?: GoogleEvent[] }) {
	return (data.items || []).filter((e) => e.status !== "cancelled").map(mapSingleEvent);
}

export default calendar;
