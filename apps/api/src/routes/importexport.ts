import { zValidator } from "@hono/zod-validator";
import {
	databaseProperties,
	databaseRows,
	databaseViews,
	databases,
	notes,
	recipes,
	shoppingItems,
	shoppingLists,
	tasks,
	labels,
} from "@nexus/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";

const io = new Hono();
io.use("*", authMiddleware);

// ─── Export: Full Workspace Backup (JSON) ───

io.get(
	"/export/workspace",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");

		const allTasks = db.select().from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt))).all();
		const allLabels = db.select().from(labels).where(and(eq(labels.workspaceId, workspaceId), isNull(labels.deletedAt))).all();
		const allNotes = db.select().from(notes).where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt))).all();
		const allLists = db.select().from(shoppingLists).where(and(eq(shoppingLists.workspaceId, workspaceId), isNull(shoppingLists.deletedAt))).all();
		const allRecipes = db.select().from(recipes).where(and(eq(recipes.workspaceId, workspaceId), isNull(recipes.deletedAt))).all();
		const allDatabases = db.select().from(databases).where(and(eq(databases.workspaceId, workspaceId), isNull(databases.deletedAt))).all();

		// Get items for each list
		const listsWithItems = allLists.map((list) => ({
			...list,
			items: db.select().from(shoppingItems).where(and(eq(shoppingItems.listId, list.id), isNull(shoppingItems.deletedAt))).all(),
		}));

		// Get properties/views/rows for each database
		const databasesWithData = allDatabases.map((dbEntry) => ({
			...dbEntry,
			properties: db.select().from(databaseProperties).where(and(eq(databaseProperties.databaseId, dbEntry.id), isNull(databaseProperties.deletedAt))).all(),
			views: db.select().from(databaseViews).where(and(eq(databaseViews.databaseId, dbEntry.id), isNull(databaseViews.deletedAt))).all(),
			rows: db.select().from(databaseRows).where(and(eq(databaseRows.databaseId, dbEntry.id), isNull(databaseRows.deletedAt))).all(),
		}));

		const backup = {
			version: "1.0",
			exportedAt: new Date().toISOString(),
			workspaceId,
			tasks: allTasks,
			labels: allLabels,
			notes: allNotes,
			shoppingLists: listsWithItems,
			recipes: allRecipes,
			databases: databasesWithData,
		};

		return c.json({ data: backup });
	},
);

// ─── Export: Notes to Markdown ───

io.get(
	"/export/notes/markdown",
	zValidator("query", z.object({ workspaceId: z.string().uuid() })),
	async (c) => {
		const { workspaceId } = c.req.valid("query");

		const allNotes = db
			.select()
			.from(notes)
			.where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
			.all();

		const markdownFiles = allNotes.map((note) => {
			let md = `# ${note.title}\n\n`;
			if (note.contentBlocksJson) {
				try {
					const blocks = JSON.parse(note.contentBlocksJson) as Array<{
						type: string;
						content: string;
						checked?: boolean;
					}>;
					for (const block of blocks) {
						switch (block.type) {
							case "heading":
								md += `## ${block.content}\n\n`;
								break;
							case "subheading":
								md += `### ${block.content}\n\n`;
								break;
							case "heading3":
								md += `#### ${block.content}\n\n`;
								break;
							case "bulleted_list":
								md += `- ${block.content}\n`;
								break;
							case "numbered_list":
								md += `1. ${block.content}\n`;
								break;
							case "checklist":
								md += `- [${block.checked ? "x" : " "}] ${block.content}\n`;
								break;
							case "code":
								md += `\`\`\`\n${block.content}\n\`\`\`\n\n`;
								break;
							case "quote":
								md += `> ${block.content}\n\n`;
								break;
							case "divider":
								md += `---\n\n`;
								break;
							case "callout":
								md += `> **Note:** ${block.content}\n\n`;
								break;
							default:
								md += `${block.content}\n\n`;
						}
					}
				} catch {
					md += "(content could not be parsed)\n";
				}
			}
			return { id: note.id, title: note.title, filename: `${sanitizeFilename(note.title)}.md`, content: md };
		});

		return c.json({ data: markdownFiles });
	},
);

// ─── Export: Single Note to Markdown ───

io.get("/export/notes/:id/markdown", async (c) => {
	const id = c.req.param("id");
	const note = db.select().from(notes).where(and(eq(notes.id, id), isNull(notes.deletedAt))).get();

	if (!note) {
		return c.json({ error: { message: "Note not found", code: "NOT_FOUND" } }, 404);
	}

	let md = `# ${note.title}\n\n`;
	if (note.contentBlocksJson) {
		try {
			const blocks = JSON.parse(note.contentBlocksJson) as Array<{
				type: string;
				content: string;
				checked?: boolean;
			}>;
			for (const block of blocks) {
				md += blockToMarkdown(block);
			}
		} catch {}
	}

	return c.text(md, 200, { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="${sanitizeFilename(note.title)}.md"` });
});

// ─── Export: Database to CSV ───

io.get("/export/databases/:id/csv", async (c) => {
	const id = c.req.param("id");

	const dbEntry = db.select().from(databases).where(and(eq(databases.id, id), isNull(databases.deletedAt))).get();
	if (!dbEntry) {
		return c.json({ error: { message: "Database not found", code: "NOT_FOUND" } }, 404);
	}

	const props = db
		.select()
		.from(databaseProperties)
		.where(and(eq(databaseProperties.databaseId, id), isNull(databaseProperties.deletedAt)))
		.all();

	const rows = db
		.select()
		.from(databaseRows)
		.where(and(eq(databaseRows.databaseId, id), isNull(databaseRows.deletedAt)))
		.all();

	// Build CSV
	const headers = props.map((p) => p.name);
	const csvRows = [headers.join(",")];

	for (const row of rows) {
		const values = JSON.parse(row.valuesJson) as Record<string, unknown>;
		const cells = props.map((p) => {
			const val = values[p.id];
			if (val === null || val === undefined) return "";
			const str = String(val);
			// Escape CSV
			if (str.includes(",") || str.includes('"') || str.includes("\n")) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		});
		csvRows.push(cells.join(","));
	}

	const csv = csvRows.join("\n");

	return c.text(csv, 200, {
		"Content-Type": "text/csv",
		"Content-Disposition": `attachment; filename="${sanitizeFilename(dbEntry.name)}.csv"`,
	});
});

// ─── Import: Markdown Notes ───

const importMarkdownSchema = z.object({
	workspaceId: z.string().uuid(),
	files: z.array(
		z.object({
			filename: z.string(),
			content: z.string().max(500000),
		}),
	),
	folderId: z.string().uuid().optional(),
});

io.post("/import/notes/markdown", zValidator("json", importMarkdownSchema), async (c) => {
	const { workspaceId, files, folderId } = c.req.valid("json");
	const now = new Date().toISOString();
	const imported: Array<{ id: string; title: string }> = [];

	for (const file of files) {
		const { title, blocks } = parseMarkdownToBlocks(file.content);
		const id = crypto.randomUUID();

		db.insert(notes)
			.values({
				id,
				title: title || file.filename.replace(/\.md$/i, ""),
				contentBlocksJson: JSON.stringify(blocks),
				folderId: folderId || null,
				workspaceId,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		imported.push({ id, title: title || file.filename });
	}

	return c.json({ data: { imported, count: imported.length } }, 201);
});

// ─── Import: CSV to Database ───

const importCsvSchema = z.object({
	workspaceId: z.string().uuid(),
	databaseName: z.string().min(1).max(200),
	csvContent: z.string().max(5000000),
});

io.post("/import/databases/csv", zValidator("json", importCsvSchema), async (c) => {
	const { workspaceId, databaseName, csvContent } = c.req.valid("json");
	const now = new Date().toISOString();

	// Parse CSV
	const lines = csvContent.split("\n").filter((l) => l.trim());
	if (lines.length < 1) {
		return c.json({ error: { message: "CSV is empty", code: "VALIDATION_ERROR" } }, 400);
	}

	const headers = parseCSVLine(lines[0]);

	// Create database
	const dbId = crypto.randomUUID();
	db.insert(databases)
		.values({ id: dbId, name: databaseName, workspaceId, createdAt: now, updatedAt: now })
		.run();

	// Create properties for each header
	const propIds: string[] = [];
	for (let i = 0; i < headers.length; i++) {
		const propId = crypto.randomUUID();
		propIds.push(propId);
		db.insert(databaseProperties)
			.values({
				id: propId,
				databaseId: dbId,
				name: headers[i],
				type: "text",
				position: i,
				createdAt: now,
				updatedAt: now,
			})
			.run();
	}

	// Create default table view
	db.insert(databaseViews)
		.values({
			id: crypto.randomUUID(),
			databaseId: dbId,
			name: "Table",
			type: "table",
			position: 0,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	// Create rows
	let rowCount = 0;
	for (let i = 1; i < lines.length; i++) {
		const cells = parseCSVLine(lines[i]);
		const values: Record<string, string> = {};
		for (let j = 0; j < propIds.length && j < cells.length; j++) {
			values[propIds[j]] = cells[j];
		}

		db.insert(databaseRows)
			.values({
				id: crypto.randomUUID(),
				databaseId: dbId,
				valuesJson: JSON.stringify(values),
				position: i - 1,
				createdAt: now,
				updatedAt: now,
			})
			.run();
		rowCount++;
	}

	return c.json({
		data: {
			databaseId: dbId,
			name: databaseName,
			columns: headers.length,
			rows: rowCount,
		},
	}, 201);
});

// ─── Helpers ───

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 100) || "untitled";
}

function blockToMarkdown(block: { type: string; content: string; checked?: boolean }): string {
	switch (block.type) {
		case "heading": return `## ${block.content}\n\n`;
		case "subheading": return `### ${block.content}\n\n`;
		case "heading3": return `#### ${block.content}\n\n`;
		case "bulleted_list": return `- ${block.content}\n`;
		case "numbered_list": return `1. ${block.content}\n`;
		case "checklist": return `- [${block.checked ? "x" : " "}] ${block.content}\n`;
		case "code": return `\`\`\`\n${block.content}\n\`\`\`\n\n`;
		case "quote": return `> ${block.content}\n\n`;
		case "divider": return `---\n\n`;
		case "callout": return `> **Note:** ${block.content}\n\n`;
		default: return `${block.content}\n\n`;
	}
}

function parseMarkdownToBlocks(md: string): { title: string; blocks: Array<{ id: string; type: string; content: string; checked?: boolean }> } {
	const lines = md.split("\n");
	let title = "";
	const blocks: Array<{ id: string; type: string; content: string; checked?: boolean }> = [];

	let inCodeBlock = false;
	let codeContent = "";

	for (const line of lines) {
		if (line.startsWith("```")) {
			if (inCodeBlock) {
				blocks.push({ id: crypto.randomUUID(), type: "code", content: codeContent.trim() });
				codeContent = "";
				inCodeBlock = false;
			} else {
				inCodeBlock = true;
			}
			continue;
		}

		if (inCodeBlock) {
			codeContent += line + "\n";
			continue;
		}

		if (line.startsWith("# ") && !title) {
			title = line.slice(2).trim();
			continue;
		}

		if (line.startsWith("## ")) {
			blocks.push({ id: crypto.randomUUID(), type: "heading", content: line.slice(3).trim() });
		} else if (line.startsWith("### ")) {
			blocks.push({ id: crypto.randomUUID(), type: "subheading", content: line.slice(4).trim() });
		} else if (line.startsWith("#### ")) {
			blocks.push({ id: crypto.randomUUID(), type: "heading3", content: line.slice(5).trim() });
		} else if (line.startsWith("> ")) {
			blocks.push({ id: crypto.randomUUID(), type: "quote", content: line.slice(2).trim() });
		} else if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
			blocks.push({ id: crypto.randomUUID(), type: "checklist", content: line.slice(6).trim(), checked: true });
		} else if (line.startsWith("- [ ] ")) {
			blocks.push({ id: crypto.randomUUID(), type: "checklist", content: line.slice(6).trim(), checked: false });
		} else if (line.startsWith("- ") || line.startsWith("* ")) {
			blocks.push({ id: crypto.randomUUID(), type: "bulleted_list", content: line.slice(2).trim() });
		} else if (/^\d+\.\s/.test(line)) {
			blocks.push({ id: crypto.randomUUID(), type: "numbered_list", content: line.replace(/^\d+\.\s/, "").trim() });
		} else if (line === "---" || line === "***") {
			blocks.push({ id: crypto.randomUUID(), type: "divider", content: "" });
		} else if (line.trim()) {
			blocks.push({ id: crypto.randomUUID(), type: "text", content: line.trim() });
		}
	}

	if (blocks.length === 0) {
		blocks.push({ id: crypto.randomUUID(), type: "text", content: "" });
	}

	return { title, blocks };
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === "," && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += ch;
		}
	}
	result.push(current.trim());
	return result;
}

export default io;
