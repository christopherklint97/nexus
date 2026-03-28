// ─── Real-Time WebSocket Server ───
// Handles presence, live cursors, page change broadcasts, and typing indicators.

import { verifyToken } from "./auth.js";

export interface WSClient {
	ws: any; // Bun WebSocket
	userId: string;
	userName: string;
	pageId: string | null; // which page they're viewing
	cursor?: { blockId: string; offset: number };
	lastSeen: number;
}

export interface PresenceInfo {
	userId: string;
	userName: string;
	pageId: string | null;
	cursor?: { blockId: string; offset: number };
	color: string;
}

// In-memory connected clients
const clients = new Map<string, WSClient>();

// Presence colors assigned to users
const USER_COLORS = [
	"#4361EE", "#E67C73", "#33B679", "#F6BF26", "#8E24AA",
	"#039BE5", "#F4511E", "#0B8043", "#D50000", "#7986CB",
];

function getUserColor(userId: string): string {
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
	}
	return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ─── Public API ───

export function getClients(): Map<string, WSClient> {
	return clients;
}

export function getPagePresence(pageId: string): PresenceInfo[] {
	const result: PresenceInfo[] = [];
	for (const client of clients.values()) {
		if (client.pageId === pageId) {
			result.push({
				userId: client.userId,
				userName: client.userName,
				pageId: client.pageId,
				cursor: client.cursor,
				color: getUserColor(client.userId),
			});
		}
	}
	return result;
}

export function broadcastToPage(pageId: string, message: object, excludeUserId?: string) {
	const payload = JSON.stringify(message);
	for (const client of clients.values()) {
		if (client.pageId === pageId && client.userId !== excludeUserId) {
			try {
				client.ws.send(payload);
			} catch {}
		}
	}
}

export function broadcastToAll(message: object, excludeUserId?: string) {
	const payload = JSON.stringify(message);
	for (const client of clients.values()) {
		if (client.userId !== excludeUserId) {
			try {
				client.ws.send(payload);
			} catch {}
		}
	}
}

// ─── Message Handlers ───

interface WSMessage {
	type: string;
	[key: string]: unknown;
}

function handleMessage(clientId: string, data: WSMessage) {
	const client = clients.get(clientId);
	if (!client) return;

	switch (data.type) {
		case "join_page": {
			const oldPage = client.pageId;
			client.pageId = data.pageId as string;
			client.lastSeen = Date.now();

			// Notify old page that user left
			if (oldPage) {
				broadcastToPage(oldPage, {
					type: "presence_leave",
					userId: client.userId,
					userName: client.userName,
				}, client.userId);
			}

			// Notify new page of join + send current presence
			const presence = getPagePresence(client.pageId);
			client.ws.send(JSON.stringify({ type: "presence_list", presence }));

			broadcastToPage(client.pageId, {
				type: "presence_join",
				userId: client.userId,
				userName: client.userName,
				color: getUserColor(client.userId),
			}, client.userId);
			break;
		}

		case "leave_page": {
			const pageId = client.pageId;
			client.pageId = null;
			if (pageId) {
				broadcastToPage(pageId, {
					type: "presence_leave",
					userId: client.userId,
					userName: client.userName,
				}, client.userId);
			}
			break;
		}

		case "cursor_move": {
			if (!client.pageId) break;
			client.cursor = data.cursor as { blockId: string; offset: number };
			broadcastToPage(client.pageId, {
				type: "cursor_update",
				userId: client.userId,
				userName: client.userName,
				cursor: client.cursor,
				color: getUserColor(client.userId),
			}, client.userId);
			break;
		}

		case "typing": {
			if (!client.pageId) break;
			broadcastToPage(client.pageId, {
				type: "typing",
				userId: client.userId,
				userName: client.userName,
				blockId: data.blockId,
			}, client.userId);
			break;
		}

		case "page_update": {
			// Broadcast page content change to other viewers
			if (!client.pageId) break;
			broadcastToPage(client.pageId, {
				type: "page_update",
				userId: client.userId,
				changes: data.changes,
				timestamp: Date.now(),
			}, client.userId);
			break;
		}

		case "ping": {
			client.lastSeen = Date.now();
			client.ws.send(JSON.stringify({ type: "pong" }));
			break;
		}
	}
}

// ─── Bun WebSocket Handlers ───

export const websocketHandlers = {
	async open(ws: any) {
		// Client sends auth token in first message
	},

	async message(ws: any, message: string | Buffer) {
		try {
			const data = JSON.parse(typeof message === "string" ? message : message.toString());

			// Authentication message
			if (data.type === "auth") {
				try {
					const payload = await verifyToken(data.token);
					if (payload.type !== "access") {
						ws.send(JSON.stringify({ type: "error", message: "Invalid token type" }));
						ws.close();
						return;
					}

					const clientId = `${payload.sub}-${Date.now()}`;
					clients.set(clientId, {
						ws,
						userId: payload.sub,
						userName: data.userName || "User",
						pageId: null,
						lastSeen: Date.now(),
					});

					// Store clientId on ws for later lookup
					(ws as any).__clientId = clientId;

					ws.send(JSON.stringify({
						type: "auth_ok",
						userId: payload.sub,
						clientId,
					}));
				} catch {
					ws.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
					ws.close();
				}
				return;
			}

			// All other messages require auth
			const clientId = (ws as any).__clientId;
			if (!clientId || !clients.has(clientId)) {
				ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
				return;
			}

			handleMessage(clientId, data);
		} catch {
			// Ignore malformed messages
		}
	},

	close(ws: any) {
		const clientId = (ws as any).__clientId;
		if (clientId) {
			const client = clients.get(clientId);
			if (client?.pageId) {
				broadcastToPage(client.pageId, {
					type: "presence_leave",
					userId: client.userId,
					userName: client.userName,
				});
			}
			clients.delete(clientId);
		}
	},
};

// ─── Cleanup stale connections every 60s ───

setInterval(() => {
	const now = Date.now();
	for (const [id, client] of clients) {
		if (now - client.lastSeen > 5 * 60 * 1000) {
			if (client.pageId) {
				broadcastToPage(client.pageId, {
					type: "presence_leave",
					userId: client.userId,
					userName: client.userName,
				});
			}
			try { client.ws.close(); } catch {}
			clients.delete(id);
		}
	}
}, 60_000);
