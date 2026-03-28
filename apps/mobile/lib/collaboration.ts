import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ─── Types ───

export interface Comment {
	id: string;
	content: string;
	pageType: string;
	pageId: string;
	blockId: string | null;
	parentCommentId: string | null;
	isResolved: number;
	authorId: string;
	author: { name: string; email: string };
	createdAt: string;
	updatedAt: string;
}

export interface ShareLink {
	id: string;
	pageType: string;
	pageId: string;
	token: string;
	permission: "view" | "comment" | "edit";
	isPublic: number;
	expiresAt: string | null;
	createdAt: string;
}

export interface WorkspaceMember {
	id: string;
	workspaceId: string;
	userId: string;
	role: "admin" | "member" | "guest";
	user: { name: string; email: string };
}

export interface ActivityEntry {
	id: string;
	action: string;
	pageType: string;
	pageId: string;
	userId: string;
	userName: string;
	details: Record<string, unknown> | null;
	createdAt: string;
}

export interface HistoryEntry {
	id: string;
	pageType: string;
	pageId: string;
	version: number;
	snapshotJson: string;
	editorName: string;
	createdAt: string;
}

// ─── Comments ───

export function useCommentsQuery(pageType: string, pageId: string) {
	return useQuery({
		queryKey: ["comments", pageType, pageId],
		queryFn: async () => {
			const res = await api.get(`/api/collab/comments?pageType=${pageType}&pageId=${pageId}`);
			return ((await res.json()).data || []) as Comment[];
		},
		enabled: !!pageId,
	});
}

export function useCreateComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			content: string;
			pageType: string;
			pageId: string;
			blockId?: string;
			parentCommentId?: string;
			workspaceId: string;
			mentionUserIds?: string[];
		}) => {
			const res = await api.post("/api/collab/comments", input);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["comments", v.pageType, v.pageId] }),
	});
}

export function useResolveComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, resolve }: { id: string; resolve: boolean }) => {
			const res = await api.patch(`/api/collab/comments/${id}/${resolve ? "resolve" : "unresolve"}`, {});
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
	});
}

export function useDeleteComment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/collab/comments/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
	});
}

// ─── Shares ───

export function useShareLinksQuery(pageType: string, pageId: string) {
	return useQuery({
		queryKey: ["shares", pageType, pageId],
		queryFn: async () => {
			const res = await api.get(`/api/collab/shares?pageType=${pageType}&pageId=${pageId}`);
			return ((await res.json()).data || []) as ShareLink[];
		},
		enabled: !!pageId,
	});
}

export function useCreateShareLink() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			pageType: string;
			pageId: string;
			permission?: "view" | "comment" | "edit";
			isPublic?: boolean;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/collab/shares", input);
			return (await res.json()).data as ShareLink;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["shares", v.pageType, v.pageId] }),
	});
}

export function useDeleteShareLink() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/collab/shares/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shares"] }),
	});
}

// ─── Members ───

export function useMembersQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["members", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/collab/members?workspaceId=${workspaceId}`);
			return ((await res.json()).data || []) as WorkspaceMember[];
		},
		enabled: !!workspaceId,
	});
}

export function useInviteMember() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { workspaceId: string; email: string; role?: "admin" | "member" | "guest" }) => {
			const res = await api.post("/api/collab/members/invite", input);
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
	});
}

// ─── Activity ───

export function useActivityQuery(workspaceId: string, pageType?: string, pageId?: string) {
	return useQuery({
		queryKey: ["activity", workspaceId, pageType, pageId],
		queryFn: async () => {
			const params = new URLSearchParams({ workspaceId });
			if (pageType) params.set("pageType", pageType);
			if (pageId) params.set("pageId", pageId);
			const res = await api.get(`/api/collab/activity?${params}`);
			return ((await res.json()).data || []) as ActivityEntry[];
		},
		enabled: !!workspaceId,
	});
}

// ─── History ───

export function usePageHistoryQuery(pageType: string, pageId: string) {
	return useQuery({
		queryKey: ["page-history", pageType, pageId],
		queryFn: async () => {
			const res = await api.get(`/api/collab/history?pageType=${pageType}&pageId=${pageId}`);
			return ((await res.json()).data || []) as HistoryEntry[];
		},
		enabled: !!pageId,
	});
}

export function useSavePageHistory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { pageType: string; pageId: string; snapshotJson: string }) => {
			const res = await api.post("/api/collab/history", input);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["page-history", v.pageType, v.pageId] }),
	});
}

// ─── WebSocket Client ───

export function createRealtimeConnection(
	apiUrl: string,
	token: string,
	userName: string,
): WebSocket {
	const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws";
	const ws = new WebSocket(wsUrl);

	ws.onopen = () => {
		ws.send(JSON.stringify({ type: "auth", token, userName }));
	};

	return ws;
}
