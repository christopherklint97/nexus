import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { users, workspaces } from "@nexus/db/schema";
import { loginSchema, registerSchema } from "@nexus/shared/validators";
import { db } from "../lib/db.js";
import {
	createAccessToken,
	createRefreshToken,
	hashPassword,
	verifyPassword,
	verifyToken,
} from "../lib/auth.js";
import { z } from "zod";

const auth = new Hono();

auth.post("/register", zValidator("json", registerSchema), async (c) => {
	const { email, password, name } = c.req.valid("json");

	const existing = db.select().from(users).where(eq(users.email, email)).get();
	if (existing) {
		return c.json({ error: { message: "Email already registered", code: "EMAIL_EXISTS" } }, 409);
	}

	const passwordHash = await hashPassword(password);
	const userId = crypto.randomUUID();

	db.insert(users)
		.values({ id: userId, email, name, passwordHash })
		.run();

	// Create a default personal workspace
	db.insert(workspaces)
		.values({ name: "Personal", ownerId: userId })
		.run();

	const accessToken = await createAccessToken(userId);
	const refreshToken = await createRefreshToken(userId);

	return c.json(
		{
			data: {
				user: { id: userId, email, name },
				accessToken,
				refreshToken,
			},
		},
		201,
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

auth.post(
	"/refresh",
	zValidator("json", z.object({ refreshToken: z.string() })),
	async (c) => {
		const { refreshToken } = c.req.valid("json");
		try {
			const payload = await verifyToken(refreshToken);
			if (payload.type !== "refresh") {
				return c.json(
					{ error: { message: "Invalid token type", code: "INVALID_TOKEN" } },
					401,
				);
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
	},
);

export default auth;
