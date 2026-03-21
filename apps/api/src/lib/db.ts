import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "@nexus/db/schema";

const sqlite = new Database(process.env.DATABASE_URL || "nexus.db");
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });
export type AppDatabase = typeof db;

const tableStatements = [
	`CREATE TABLE IF NOT EXISTS users (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		email text NOT NULL,
		name text NOT NULL,
		password_hash text NOT NULL,
		avatar_url text,
		google_token_encrypted text
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
	`CREATE TABLE IF NOT EXISTS workspaces (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		owner_id text NOT NULL,
		settings_json text,
		FOREIGN KEY (owner_id) REFERENCES users(id)
	)`,
	`CREATE TABLE IF NOT EXISTS tasks (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		title text NOT NULL,
		description text,
		status text DEFAULT 'todo' NOT NULL,
		priority integer DEFAULT 4 NOT NULL,
		due_date text,
		recurrence_rule text,
		parent_task_id text,
		workspace_id text NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS labels (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		color text NOT NULL,
		workspace_id text NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS task_labels (
		id text PRIMARY KEY NOT NULL,
		task_id text NOT NULL,
		label_id text NOT NULL,
		FOREIGN KEY (task_id) REFERENCES tasks(id),
		FOREIGN KEY (label_id) REFERENCES labels(id)
	)`,
	`CREATE TABLE IF NOT EXISTS shopping_lists (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		store_name text NOT NULL,
		store_address text,
		store_lat real,
		store_lng real,
		workspace_id text NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS shopping_items (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		quantity real DEFAULT 1 NOT NULL,
		unit text,
		estimated_price real,
		aisle text,
		is_checked integer DEFAULT 0 NOT NULL,
		list_id text NOT NULL,
		FOREIGN KEY (list_id) REFERENCES shopping_lists(id)
	)`,
	`CREATE TABLE IF NOT EXISTS shopping_routes (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		stops_json text,
		optimized_order text,
		workspace_id text NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS folders (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		parent_folder_id text,
		workspace_id text NOT NULL,
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS notes (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		title text NOT NULL,
		content_blocks_json text,
		folder_id text,
		is_pinned integer DEFAULT 0 NOT NULL,
		workspace_id text NOT NULL,
		FOREIGN KEY (folder_id) REFERENCES folders(id),
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS documents (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		name text NOT NULL,
		file_path text NOT NULL,
		mime_type text NOT NULL,
		size_bytes integer NOT NULL,
		note_id text,
		workspace_id text NOT NULL,
		FOREIGN KEY (note_id) REFERENCES notes(id),
		FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
	)`,
	`CREATE TABLE IF NOT EXISTS calendar_connections (
		id text PRIMARY KEY NOT NULL,
		created_at text NOT NULL,
		updated_at text NOT NULL,
		deleted_at text,
		sync_version integer DEFAULT 0 NOT NULL,
		provider text DEFAULT 'google' NOT NULL,
		access_token_encrypted text NOT NULL,
		refresh_token_encrypted text NOT NULL,
		user_id text NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id)
	)`,
	`CREATE TABLE IF NOT EXISTS sync_log (
		id text PRIMARY KEY NOT NULL,
		entity_type text NOT NULL,
		entity_id text NOT NULL,
		operation text NOT NULL,
		timestamp text NOT NULL,
		device_id text NOT NULL
	)`,
];

export function initializeDatabase() {
	for (const stmt of tableStatements) {
		sqlite.exec(stmt);
	}
	// FTS5 virtual table for full-text search on notes
	sqlite.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
			title,
			content,
			content_rowid='rowid',
			tokenize='porter unicode61'
		)
	`);
	sqlite.exec("PRAGMA foreign_keys = ON;");
}
