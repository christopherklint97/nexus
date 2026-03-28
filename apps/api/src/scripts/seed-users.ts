/**
 * Seed script to create user accounts from users.csv.
 *
 * Usage:
 *   bun run seed          (from apps/api/)
 *
 * CSV format (apps/api/users.csv):
 *   email,password,name
 *   chris@example.com,secret123,Christopher
 *   wife@example.com,secret456,Her Name
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { users, workspaces } from "@nexus/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth.js";
import { db, initializeDatabase } from "../lib/db.js";

const csvPath = resolve(import.meta.dir, "../../users.csv");
const raw = readFileSync(csvPath, "utf-8");

const lines = raw
	.split("\n")
	.map((l) => l.trim())
	.filter((l) => l && !l.startsWith("email"));

if (lines.length === 0) {
	console.error("No users found in users.csv. Add rows in format: email,password,name");
	process.exit(1);
}

initializeDatabase();

for (const line of lines) {
	const [email, password, ...nameParts] = line.split(",");
	const name = nameParts.join(",").trim();

	if (!email || !password || !name) {
		console.error(`Invalid row: ${line} — skipping.`);
		continue;
	}

	const existing = db.select().from(users).where(eq(users.email, email)).get();
	if (existing) {
		// Update password if changed
		const passwordHash = await hashPassword(password);
		db.update(users).set({ passwordHash, name }).where(eq(users.email, email)).run();
		console.log(`Updated user: ${email}`);
		continue;
	}

	const passwordHash = await hashPassword(password);
	const userId = crypto.randomUUID();

	db.insert(users).values({ id: userId, email, name, passwordHash }).run();
	db.insert(workspaces).values({ name: "Personal", ownerId: userId }).run();

	console.log(`Created user: ${email}`);
}

console.log("Done.");
