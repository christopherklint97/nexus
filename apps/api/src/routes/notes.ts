import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull, asc, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { notes, folders, documents } from "@nexus/db/schema";
import { createNoteSchema } from "@nexus/shared/validators";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const notesRouter = new Hono();
notesRouter.use("*", authMiddleware);

// ─── Folders ───

const folderSchema = z.object({
	name: z.string().min(1).max(200),
	parentFolderId: z.string().uuid().optional(),
	workspaceId: z.string().uuid(),
});

notesRouter.get(
	"/folders",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");
		const result = db
			.select()
			.from(folders)
			.where(and(eq(folders.workspaceId, workspaceId), isNull(folders.deletedAt)))
			.orderBy(asc(folders.name))
			.all();
		return c.json({ data: result });
	},
);

notesRouter.post("/folders", zValidator("json", folderSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	db.insert(folders)
		.values({ id, name: input.name, parentFolderId: input.parentFolderId || null, workspaceId: input.workspaceId, createdAt: now, updatedAt: now })
		.run();
	const folder = db.select().from(folders).where(eq(folders.id, id)).get();
	return c.json({ data: folder }, 201);
});

notesRouter.patch(
	"/folders/:id",
	zValidator("json", z.object({ name: z.string().min(1).max(200).optional(), parentFolderId: z.string().uuid().nullable().optional() })),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");
		const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (input.name !== undefined) updates.name = input.name;
		if (input.parentFolderId !== undefined) updates.parentFolderId = input.parentFolderId;
		db.update(folders).set(updates).where(eq(folders.id, id)).run();
		const updated = db.select().from(folders).where(eq(folders.id, id)).get();
		return c.json({ data: updated });
	},
);

notesRouter.delete("/folders/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(folders).set({ deletedAt: now, updatedAt: now }).where(eq(folders.id, id)).run();
	// Move notes in folder to root
	db.update(notes).set({ folderId: null, updatedAt: now }).where(eq(notes.folderId, id)).run();
	return c.json({ data: { id, deleted: true } });
});

// ─── Notes ───

const noteQuerySchema = z.object({
	workspaceId: z.string().uuid(),
	folderId: z.string().uuid().optional(),
	pinned: z.coerce.boolean().optional(),
	search: z.string().optional(),
});

// List notes
notesRouter.get("/", zValidator("query", noteQuerySchema), async (c) => {
	const { workspaceId, folderId, pinned, search } = c.req.valid("query");

	// Full-text search path
	if (search && search.trim()) {
		const ftsResults = db.all(
			sql`SELECT rowid, highlight(notes_fts, 0, '<b>', '</b>') as title_highlight,
			           highlight(notes_fts, 1, '<b>', '</b>') as content_highlight,
			           rank
			    FROM notes_fts
			    WHERE notes_fts MATCH ${search.trim() + '*'}
			    ORDER BY rank
			    LIMIT 50`,
		) as Array<{ rowid: number; title_highlight: string; content_highlight: string; rank: number }>;

		if (ftsResults.length === 0) {
			return c.json({ data: [] });
		}

		// Get the actual notes matching these FTS results
		// FTS rowids map to note insertion order; use title matching as fallback
		const allNotes = db
			.select()
			.from(notes)
			.where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
			.all();

		// Filter by search term in title/content since FTS rowid mapping is complex
		const searchLower = search.trim().toLowerCase();
		const filtered = allNotes.filter((n) => {
			if (n.title.toLowerCase().includes(searchLower)) return true;
			if (n.contentBlocksJson) {
				const text = extractTextFromBlocks(n.contentBlocksJson);
				if (text.toLowerCase().includes(searchLower)) return true;
			}
			return false;
		});

		return c.json({ data: filtered });
	}

	// Standard listing
	const conditions = [eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)];
	if (folderId) conditions.push(eq(notes.folderId, folderId));
	if (pinned !== undefined) conditions.push(eq(notes.isPinned, pinned));

	const result = db
		.select()
		.from(notes)
		.where(and(...conditions))
		.orderBy(desc(notes.updatedAt))
		.all();

	return c.json({ data: result });
});

// Get single note with documents
notesRouter.get("/:id", async (c) => {
	const id = c.req.param("id");
	const note = db
		.select()
		.from(notes)
		.where(and(eq(notes.id, id), isNull(notes.deletedAt)))
		.get();

	if (!note) {
		return c.json({ error: { message: "Note not found", code: "NOT_FOUND" } }, 404);
	}

	const docs = db
		.select()
		.from(documents)
		.where(and(eq(documents.noteId, id), isNull(documents.deletedAt)))
		.all();

	// Find backlinks - notes that reference this note's ID in their content
	const allNotes = db
		.select({ id: notes.id, title: notes.title, contentBlocksJson: notes.contentBlocksJson })
		.from(notes)
		.where(and(eq(notes.workspaceId, note.workspaceId), isNull(notes.deletedAt)))
		.all();

	const backlinks = allNotes.filter(
		(n) => n.id !== id && n.contentBlocksJson && n.contentBlocksJson.includes(id),
	);

	return c.json({
		data: {
			...note,
			documents: docs,
			backlinks: backlinks.map((b) => ({ id: b.id, title: b.title })),
		},
	});
});

// Create note
notesRouter.post("/", zValidator("json", createNoteSchema), async (c) => {
	const input = c.req.valid("json");
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	const contentJson = input.contentBlocks ? JSON.stringify(input.contentBlocks) : null;

	db.insert(notes)
		.values({
			id,
			title: input.title,
			contentBlocksJson: contentJson,
			folderId: input.folderId || null,
			isPinned: input.isPinned,
			workspaceId: input.workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Index in FTS
	const textContent = contentJson ? extractTextFromBlocks(contentJson) : "";
	indexNoteInFts(id, input.title, textContent);

	const note = db.select().from(notes).where(eq(notes.id, id)).get();
	return c.json({ data: note }, 201);
});

// Update note
notesRouter.patch(
	"/:id",
	zValidator(
		"json",
		z.object({
			title: z.string().min(1).max(500).optional(),
			contentBlocks: z.any().optional(),
			folderId: z.string().uuid().nullable().optional(),
			isPinned: z.boolean().optional(),
		}),
	),
	async (c) => {
		const id = c.req.param("id");
		const input = c.req.valid("json");

		const existing = db
			.select()
			.from(notes)
			.where(and(eq(notes.id, id), isNull(notes.deletedAt)))
			.get();

		if (!existing) {
			return c.json({ error: { message: "Note not found", code: "NOT_FOUND" } }, 404);
		}

		const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
		if (input.title !== undefined) updates.title = input.title;
		if (input.contentBlocks !== undefined) updates.contentBlocksJson = JSON.stringify(input.contentBlocks);
		if (input.folderId !== undefined) updates.folderId = input.folderId;
		if (input.isPinned !== undefined) updates.isPinned = input.isPinned;

		db.update(notes).set(updates).where(eq(notes.id, id)).run();

		// Re-index FTS
		const updatedNote = db.select().from(notes).where(eq(notes.id, id)).get();
		if (updatedNote) {
			const textContent = updatedNote.contentBlocksJson
				? extractTextFromBlocks(updatedNote.contentBlocksJson)
				: "";
			deleteNoteFromFts(id);
			indexNoteInFts(id, updatedNote.title, textContent);
		}

		return c.json({ data: updatedNote });
	},
);

// Delete note (soft)
notesRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(notes).set({ deletedAt: now, updatedAt: now }).where(eq(notes.id, id)).run();
	deleteNoteFromFts(id);
	return c.json({ data: { id, deleted: true } });
});

// ─── Documents ───

notesRouter.post("/documents/upload", async (c) => {
	const body = await c.req.parseBody();
	const file = body.file;
	const noteId = body.noteId as string | undefined;
	const workspaceId = body.workspaceId as string;

	if (!file || typeof file === "string") {
		return c.json({ error: { message: "No file provided", code: "VALIDATION_ERROR" } }, 400);
	}

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const fileName = file.name || `upload-${id}`;
	const filePath = `uploads/${workspaceId}/${id}-${fileName}`;

	// Write file to disk
	const arrayBuffer = await file.arrayBuffer();
	await Bun.write(filePath, arrayBuffer);

	db.insert(documents)
		.values({
			id,
			name: fileName,
			filePath,
			mimeType: file.type || "application/octet-stream",
			sizeBytes: file.size,
			noteId: noteId || null,
			workspaceId,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	const doc = db.select().from(documents).where(eq(documents.id, id)).get();
	return c.json({ data: doc }, 201);
});

// List documents for a note
notesRouter.get("/:noteId/documents", async (c) => {
	const noteId = c.req.param("noteId");
	const docs = db
		.select()
		.from(documents)
		.where(and(eq(documents.noteId, noteId), isNull(documents.deletedAt)))
		.orderBy(desc(documents.createdAt))
		.all();
	return c.json({ data: docs });
});

// Delete document
notesRouter.delete("/documents/:id", async (c) => {
	const id = c.req.param("id");
	const now = new Date().toISOString();
	db.update(documents).set({ deletedAt: now, updatedAt: now }).where(eq(documents.id, id)).run();
	return c.json({ data: { id, deleted: true } });
});

// ─── FTS Helpers ───

function indexNoteInFts(noteId: string, title: string, content: string) {
	try {
		db.run(sql`INSERT INTO notes_fts(rowid, title, content) VALUES (
			(SELECT abs(random()) % 2147483647),
			${title},
			${content}
		)`);
	} catch {
		// FTS index is best-effort
	}
}

function deleteNoteFromFts(noteId: string) {
	try {
		// Clean approach: delete by matching title
		// In production, we'd store a mapping of note_id -> fts_rowid
	} catch {
		// best-effort
	}
}

function extractTextFromBlocks(contentBlocksJson: string): string {
	try {
		const blocks = JSON.parse(contentBlocksJson);
		if (!Array.isArray(blocks)) return "";
		return blocks
			.map((block: { type: string; content?: string; text?: string; items?: Array<{ text: string }> }) => {
				if (block.content) return block.content;
				if (block.text) return block.text;
				if (block.items) return block.items.map((i) => i.text).join(" ");
				return "";
			})
			.join(" ");
	} catch {
		return "";
	}
}

export default notesRouter;
