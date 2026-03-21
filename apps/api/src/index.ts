import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { initializeDatabase } from "./lib/db.js";
import authRoutes from "./routes/auth.js";
import tasksRoutes from "./routes/tasks.js";
import shoppingRoutes from "./routes/shopping.js";
import notesRoutes from "./routes/notes.js";
import calendarRoutes from "./routes/calendar.js";
import syncRoutes from "./routes/sync.js";
import searchRoutes from "./routes/search.js";

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
app.route("/api/sync", syncRoutes);
app.route("/api/search", searchRoutes);

export default {
	port: Number(process.env.PORT) || 3000,
	fetch: app.fetch,
};
