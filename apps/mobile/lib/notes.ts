import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface NoteBlock {
	id: string;
	type: "text" | "heading" | "subheading" | "checklist" | "code" | "quote" | "divider" | "callout";
	content: string;
	checked?: boolean;
	language?: string;
}

export interface Note {
	id: string;
	title: string;
	contentBlocksJson: string | null;
	folderId: string | null;
	isPinned: boolean;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
}

export interface NoteDetail extends Note {
	documents: Array<{
		id: string;
		name: string;
		filePath: string;
		mimeType: string;
		sizeBytes: number;
	}>;
	backlinks: Array<{ id: string; title: string }>;
}

export interface Folder {
	id: string;
	name: string;
	parentFolderId: string | null;
	workspaceId: string;
}

export function parseBlocks(json: string | null): NoteBlock[] {
	if (!json) return [];
	try {
		const blocks = JSON.parse(json);
		return Array.isArray(blocks) ? blocks : [];
	} catch {
		return [];
	}
}

export function useNotesQuery(params: {
	workspaceId: string;
	folderId?: string;
	pinned?: boolean;
	search?: string;
}) {
	const qs = new URLSearchParams();
	qs.set("workspaceId", params.workspaceId);
	if (params.folderId) qs.set("folderId", params.folderId);
	if (params.pinned !== undefined) qs.set("pinned", String(params.pinned));
	if (params.search) qs.set("search", params.search);

	return useQuery({
		queryKey: ["notes", params],
		queryFn: async () => {
			const res = await api.get(`/api/notes?${qs}`);
			return ((await res.json()).data || []) as Note[];
		},
		enabled: !!params.workspaceId,
	});
}

export function useNoteDetailQuery(noteId: string) {
	return useQuery({
		queryKey: ["note", noteId],
		queryFn: async () => {
			const res = await api.get(`/api/notes/${noteId}`);
			return (await res.json()).data as NoteDetail;
		},
		enabled: !!noteId,
	});
}

export function useFoldersQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["folders", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/notes/folders?workspaceId=${workspaceId}`);
			return ((await res.json()).data || []) as Folder[];
		},
		enabled: !!workspaceId,
	});
}

export function useCreateNote() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			title: string;
			contentBlocks?: NoteBlock[];
			folderId?: string;
			isPinned?: boolean;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/notes", input);
			return (await res.json()).data as Note;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
	});
}

export function useUpdateNote() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			title?: string;
			contentBlocks?: NoteBlock[];
			folderId?: string | null;
			isPinned?: boolean;
		}) => {
			const res = await api.patch(`/api/notes/${id}`, input);
			return (await res.json()).data as Note;
		},
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["notes"] });
			qc.invalidateQueries({ queryKey: ["note", v.id] });
		},
	});
}

export function useDeleteNote() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await api.delete(`/api/notes/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
	});
}

export function useCreateFolder() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { name: string; parentFolderId?: string; workspaceId: string }) => {
			const res = await api.post("/api/notes/folders", input);
			return (await res.json()).data as Folder;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
	});
}
