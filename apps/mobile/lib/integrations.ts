import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ─── Types ───

export interface ApiKey {
	id: string;
	name: string;
	keyPrefix: string;
	scopes: string;
	lastUsedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
}

export interface Webhook {
	id: string;
	url: string;
	events: string[];
	isActive: number;
	lastTriggeredAt: string | null;
	failureCount: number;
	createdAt: string;
}

export interface WebhookDelivery {
	id: string;
	event: string;
	responseStatus: number | null;
	success: number;
	createdAt: string;
}

// ─── API Keys ───

export function useApiKeysQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["api-keys", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/integrations/api-keys?workspaceId=${workspaceId}`);
			return ((await res.json()).data || []) as ApiKey[];
		},
		enabled: !!workspaceId,
	});
}

export function useCreateApiKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { name: string; scopes?: string; workspaceId: string }) => {
			const res = await api.post("/api/integrations/api-keys", input);
			return (await res.json()).data as { id: string; name: string; key: string; keyPrefix: string; scopes: string; message: string };
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
	});
}

export function useDeleteApiKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/integrations/api-keys/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
	});
}

// ─── Webhooks ───

export function useWebhooksQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["webhooks", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/integrations/webhooks?workspaceId=${workspaceId}`);
			return ((await res.json()).data || []) as Webhook[];
		},
		enabled: !!workspaceId,
	});
}

export function useCreateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { url: string; events: string[]; workspaceId: string }) => {
			const res = await api.post("/api/integrations/webhooks", input);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
	});
}

export function useUpdateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: { id: string; url?: string; events?: string[]; isActive?: boolean }) => {
			const res = await api.patch(`/api/integrations/webhooks/${id}`, input);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
	});
}

export function useDeleteWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/integrations/webhooks/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
	});
}

export function useWebhookDeliveries(webhookId: string) {
	return useQuery({
		queryKey: ["webhook-deliveries", webhookId],
		queryFn: async () => {
			const res = await api.get(`/api/integrations/webhooks/${webhookId}/deliveries`);
			return ((await res.json()).data || []) as WebhookDelivery[];
		},
		enabled: !!webhookId,
	});
}
