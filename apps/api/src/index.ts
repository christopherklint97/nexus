import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { initializeDatabase } from "./lib/db.js";
import { websocketHandlers } from "./lib/websocket.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import calendarRoutes from "./routes/calendar.js";
import collabRoutes from "./routes/collaboration.js";
import importExportRoutes from "./routes/importexport.js";
import integrationsRoutes from "./routes/integrations.js";
import databasesRoutes from "./routes/databases.js";
import notesRoutes from "./routes/notes.js";
import recipesRoutes from "./routes/recipes.js";
import searchRoutes from "./routes/search.js";
import shoppingRoutes from "./routes/shopping.js";
import syncRoutes from "./routes/sync.js";
import tasksRoutes from "./routes/tasks.js";

// Initialize database tables on startup
initializeDatabase();

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

// Error handler
app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ error: { message: err.message, code: "HTTP_ERROR" } }, err.status);
	}
	console.error(err);
	return c.json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } }, 500);
});

// Health check
app.get("/", (c) => {
	return c.json({ name: "Nexus API", version: "0.0.1", status: "ok" });
});

app.get("/health", (c) => {
	return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/tasks", tasksRoutes);
app.route("/api/shopping", shoppingRoutes);
app.route("/api/notes", notesRoutes);
app.route("/api/calendar", calendarRoutes);
app.route("/api/recipes", recipesRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/databases", databasesRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/collab", collabRoutes);
app.route("/api/io", importExportRoutes);
app.route("/api/integrations", integrationsRoutes);

export default {
	port: Number(process.env.PORT) || 3000,
	fetch(req: Request, server: any) {
		// WebSocket upgrade for /ws path
		if (new URL(req.url).pathname === "/ws") {
			const upgraded = server.upgrade(req);
			if (upgraded) return undefined;
			return new Response("WebSocket upgrade failed", { status: 400 });
		}
		return app.fetch(req, server);
	},
	websocket: websocketHandlers,
};
