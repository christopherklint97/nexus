import { zValidator } from "@hono/zod-validator";
import { users, workspaces } from "@nexus/db/schema";
import { loginSchema } from "@nexus/shared/validators";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import {
	createAccessToken,
	createRefreshToken,
	verifyPassword,
	verifyToken,
} from "../lib/auth.js";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono();

// Registration is disabled — accounts are created via the seed script
auth.post("/register", (c) => {
	return c.json(
		{ error: { message: "Registration is disabled", code: "REGISTRATION_DISABLED" } },
		403,
	);
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
	const { email, password } = c.req.valid("json");

	const user = db.select().from(users).where(eq(users.email, email)).get();
	if (!user) {
		return c.json({ error: { message: "Invalid credentials", code: "INVALID_CREDENTIALS" } }, 401);
	}

	const valid = await verifyPassword(password, user.passwordHash);
	if (!valid) {
		return c.json({ error: { message: "Invalid credentials", code: "INVALID_CREDENTIALS" } }, 401);
	}

	const accessToken = await createAccessToken(user.id);
	const refreshToken = await createRefreshToken(user.id);

	return c.json({
		data: {
			user: { id: user.id, email: user.email, name: user.name },
			accessToken,
			refreshToken,
		},
	});
});

auth.post("/refresh", zValidator("json", z.object({ refreshToken: z.string() })), async (c) => {
	const { refreshToken } = c.req.valid("json");
	try {
		const payload = await verifyToken(refreshToken);
		if (payload.type !== "refresh") {
			return c.json({ error: { message: "Invalid token type", code: "INVALID_TOKEN" } }, 401);
		}

		const accessToken = await createAccessToken(payload.sub);
		const newRefreshToken = await createRefreshToken(payload.sub);

		return c.json({
			data: { accessToken, refreshToken: newRefreshToken },
		});
	} catch {
		return c.json(
			{ error: { message: "Invalid or expired refresh token", code: "INVALID_TOKEN" } },
			401,
		);
	}
});

// ─── Get Current User & Workspace ───

auth.get("/me", authMiddleware, async (c) => {
	const userId = c.get("userId");
	const user = db.select().from(users).where(eq(users.id, userId)).get();

	if (!user) {
		return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);
	}

	const workspace = db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).get();

	return c.json({
		data: {
			id: user.id,
			email: user.email,
			name: user.name,
			workspaceId: workspace?.id || null,
		},
	});
});

export default auth;
