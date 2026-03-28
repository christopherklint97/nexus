import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./api";

// ─── Export ───

export function useExportWorkspace(workspaceId: string) {
	return useQuery({
		queryKey: ["export-workspace", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/io/export/workspace?workspaceId=${workspaceId}`);
			return (await res.json()).data;
		},
		enabled: false, // only fetch on demand
	});
}

export function useExportNotesMarkdown() {
	return useMutation({
		mutationFn: async (workspaceId: string) => {
			const res = await api.get(`/api/io/export/notes/markdown?workspaceId=${workspaceId}`);
			return (await res.json()).data as Array<{ id: string; title: string; filename: string; content: string }>;
		},
	});
}

export function useExportDatabaseCSV() {
	return useMutation({
		mutationFn: async (databaseId: string) => {
			const res = await api.get(`/api/io/export/databases/${databaseId}/csv`);
			return res.text();
		},
	});
}

// ─── Import ───

export function useImportMarkdown() {
	return useMutation({
		mutationFn: async (input: {
			workspaceId: string;
			files: Array<{ filename: string; content: string }>;
			folderId?: string;
		}) => {
			const res = await api.post("/api/io/import/notes/markdown", input);
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data as { imported: Array<{ id: string; title: string }>; count: number };
		},
	});
}

export function useImportCSV() {
	return useMutation({
		mutationFn: async (input: {
			workspaceId: string;
			databaseName: string;
			csvContent: string;
		}) => {
			const res = await api.post("/api/io/import/databases/csv", input);
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data as { databaseId: string; name: string; columns: number; rows: number };
		},
	});
}
