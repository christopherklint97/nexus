import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyToken } from "../lib/auth.js";

export async function authMiddleware(c: Context, next: Next) {
	const header = c.req.header("Authorization");
	if (!header?.startsWith("Bearer ")) {
		throw new HTTPException(401, { message: "Missing or invalid authorization header" });
	}

	const token = header.slice(7);
	try {
		const payload = await verifyToken(token);
		if (payload.type !== "access") {
			throw new HTTPException(401, { message: "Invalid token type" });
		}
		c.set("userId", payload.sub);
		await next();
	} catch (error) {
		if (error instanceof HTTPException) throw error;
		throw new HTTPException(401, { message: "Invalid or expired token" });
	}
}
