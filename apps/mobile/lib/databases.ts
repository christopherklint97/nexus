import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ─── Types ───

export type PropertyType =
	| "text"
	| "number"
	| "select"
	| "multi_select"
	| "date"
	| "checkbox"
	| "url"
	| "email"
	| "phone"
	| "relation"
	| "formula"
	| "person";

export type ViewType = "table" | "board" | "calendar" | "gallery" | "list";

export interface SelectOption {
	id: string;
	label: string;
	color: string;
}

export interface DatabaseProperty {
	id: string;
	databaseId: string;
	name: string;
	type: PropertyType;
	config: Record<string, unknown> | null;
	configJson: string | null;
	position: number;
	isVisible: number;
	width: number | null;
}

export interface ViewFilter {
	propertyId: string;
	operator: string;
	value?: unknown;
}

export interface ViewSort {
	propertyId: string;
	direction: "asc" | "desc";
}

export interface DatabaseView {
	id: string;
	databaseId: string;
	name: string;
	type: ViewType;
	config: Record<string, unknown> | null;
	filters: ViewFilter[];
	sorts: ViewSort[];
	groupByPropertyId: string | null;
	position: number;
}

export interface DatabaseRow {
	id: string;
	databaseId: string;
	values: Record<string, unknown>;
	valuesJson: string;
	position: number;
	createdAt: string;
	updatedAt: string;
}

export interface Database {
	id: string;
	name: string;
	description: string | null;
	icon: string | null;
	coverUrl: string | null;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
	rowCount: number;
}

export interface DatabaseDetail extends Omit<Database, "rowCount"> {
	properties: DatabaseProperty[];
	views: DatabaseView[];
	rowCount: number;
}

// ─── Color palette for select options ───

export const OPTION_COLORS = [
	"#E2E8F0", "#BFDBFE", "#BBF7D0", "#FDE68A", "#FECACA",
	"#DDD6FE", "#FBCFE8", "#A5F3FC", "#FED7AA", "#D9F99D",
];

// ─── Queries ───

export function useDatabasesQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["databases", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/databases?workspaceId=${workspaceId}`);
			const json = await res.json();
			return json.data as Database[];
		},
		enabled: !!workspaceId,
	});
}

export function useDatabaseDetailQuery(id: string) {
	return useQuery({
		queryKey: ["database", id],
		queryFn: async () => {
			const res = await api.get(`/api/databases/${id}`);
			const json = await res.json();
			return json.data as DatabaseDetail;
		},
		enabled: !!id,
	});
}

export function useDatabaseRowsQuery(databaseId: string, viewId?: string) {
	return useQuery({
		queryKey: ["database-rows", databaseId, viewId],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (viewId) params.set("viewId", viewId);
			const res = await api.get(`/api/databases/${databaseId}/rows?${params}`);
			const json = await res.json();
			return json.data as DatabaseRow[];
		},
		enabled: !!databaseId,
	});
}

// ─── Mutations ───

export function useCreateDatabase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			name: string;
			description?: string;
			icon?: string;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/databases", input);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["databases"] }),
	});
}

export function useUpdateDatabase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; icon?: string }) => {
			const res = await api.patch(`/api/databases/${id}`, input);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["databases"] });
			qc.invalidateQueries({ queryKey: ["database", v.id] });
		},
	});
}

export function useDeleteDatabase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/databases/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["databases"] }),
	});
}

export function useCreateProperty() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			databaseId: string;
			name: string;
			type: PropertyType;
			config?: Record<string, unknown>;
		}) => {
			const res = await api.post(`/api/databases/${input.databaseId}/properties`, {
				name: input.name,
				type: input.type,
				config: input.config,
			});
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["database", v.databaseId] }),
	});
}

export function useUpdateProperty() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			databaseId,
			propertyId,
			...input
		}: {
			databaseId: string;
			propertyId: string;
			name?: string;
			type?: PropertyType;
			config?: Record<string, unknown>;
			isVisible?: boolean;
			width?: number;
		}) => {
			const res = await api.patch(`/api/databases/${databaseId}/properties/${propertyId}`, input);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["database", v.databaseId] }),
	});
}

export function useCreateView() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			databaseId: string;
			name: string;
			type: ViewType;
			config?: Record<string, unknown>;
			groupByPropertyId?: string;
		}) => {
			const res = await api.post(`/api/databases/${input.databaseId}/views`, {
				name: input.name,
				type: input.type,
				config: input.config,
				groupByPropertyId: input.groupByPropertyId,
			});
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["database", v.databaseId] }),
	});
}

export function useUpdateView() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			databaseId,
			viewId,
			...input
		}: {
			databaseId: string;
			viewId: string;
			name?: string;
			filters?: ViewFilter[];
			sorts?: ViewSort[];
			groupByPropertyId?: string;
		}) => {
			const res = await api.patch(`/api/databases/${databaseId}/views/${viewId}`, input);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["database", v.databaseId] });
			qc.invalidateQueries({ queryKey: ["database-rows", v.databaseId] });
		},
	});
}

export function useCreateRow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { databaseId: string; values?: Record<string, unknown> }) => {
			const res = await api.post(`/api/databases/${input.databaseId}/rows`, {
				values: input.values || {},
			});
			return (await res.json()).data as DatabaseRow;
		},
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["database-rows", v.databaseId] });
			qc.invalidateQueries({ queryKey: ["databases"] });
		},
	});
}

export function useUpdateRow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			databaseId,
			rowId,
			values,
		}: {
			databaseId: string;
			rowId: string;
			values: Record<string, unknown>;
		}) => {
			const res = await api.patch(`/api/databases/${databaseId}/rows/${rowId}`, { values });
			return (await res.json()).data as DatabaseRow;
		},
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["database-rows", v.databaseId] }),
	});
}

export function useDeleteRow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ databaseId, rowId }: { databaseId: string; rowId: string }) => {
			const res = await api.delete(`/api/databases/${databaseId}/rows/${rowId}`);
			return (await res.json()).data;
		},
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: ["database-rows", v.databaseId] });
			qc.invalidateQueries({ queryKey: ["databases"] });
		},
	});
}

// ─── Helpers ───

export function getPropertyIcon(type: PropertyType): string {
	const icons: Record<PropertyType, string> = {
		text: "Aa",
		number: "#",
		select: "\u25BC",
		multi_select: "\u2630",
		date: "\uD83D\uDCC5",
		checkbox: "\u2611",
		url: "\uD83D\uDD17",
		email: "@",
		phone: "\uD83D\uDCDE",
		relation: "\u21C4",
		formula: "fx",
		person: "\uD83D\uDC64",
	};
	return icons[type] || "?";
}

export function getCellDisplayValue(
	value: unknown,
	property: DatabaseProperty,
): string {
	if (value === null || value === undefined || value === "") return "";

	switch (property.type) {
		case "checkbox":
			return value ? "\u2713" : "";
		case "select": {
			const options = (property.config as { options?: SelectOption[] })?.options || [];
			const opt = options.find((o) => o.id === value);
			return opt?.label || String(value);
		}
		case "multi_select": {
			const opts = (property.config as { options?: SelectOption[] })?.options || [];
			const ids = Array.isArray(value) ? value : [];
			return ids.map((id) => opts.find((o) => o.id === id)?.label || id).join(", ");
		}
		case "number":
			return typeof value === "number" ? String(value) : "";
		case "date":
			if (typeof value === "string") {
				try {
					return new Date(value).toLocaleDateString();
				} catch {
					return String(value);
				}
			}
			return "";
		default:
			return String(value);
	}
}
