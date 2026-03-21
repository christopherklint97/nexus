import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface ShoppingList {
	id: string;
	name: string;
	storeName: string;
	storeAddress: string | null;
	storeLat: number | null;
	storeLng: number | null;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
	itemCount: number;
	checkedCount: number;
	estimatedTotal: number;
}

export interface ShoppingItem {
	id: string;
	name: string;
	quantity: number;
	unit: string | null;
	estimatedPrice: number | null;
	aisle: string | null;
	isChecked: boolean;
	listId: string;
	createdAt: string;
	updatedAt: string;
}

export interface ShoppingListDetail extends Omit<ShoppingList, "itemCount" | "checkedCount" | "estimatedTotal"> {
	items: ShoppingItem[];
}

export interface RouteStop {
	order: number;
	listId: string;
	storeName: string;
	storeAddress: string | null;
	storeLat: number | null;
	storeLng: number | null;
	itemCount: number;
	uncheckedCount: number;
	estimatedSpend: number;
}

export interface OptimizedRoute {
	stops: RouteStop[];
	summary: {
		storeCount: number;
		totalItems: number;
		totalEstimated: number;
	};
}

export function useShoppingListsQuery(workspaceId: string) {
	return useQuery({
		queryKey: ["shopping-lists", workspaceId],
		queryFn: async () => {
			const res = await api.get(`/api/shopping/lists?workspaceId=${workspaceId}`);
			const json = await res.json();
			return json.data as ShoppingList[];
		},
		enabled: !!workspaceId,
	});
}

export function useShoppingListDetailQuery(listId: string) {
	return useQuery({
		queryKey: ["shopping-list", listId],
		queryFn: async () => {
			const res = await api.get(`/api/shopping/lists/${listId}`);
			const json = await res.json();
			return json.data as ShoppingListDetail;
		},
		enabled: !!listId,
	});
}

export function useCreateShoppingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			name: string;
			storeName: string;
			storeAddress?: string;
			storeLat?: number;
			storeLng?: number;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/shopping/lists", input);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
	});
}

export function useDeleteShoppingList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/shopping/lists/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
	});
}

export function useCreateShoppingItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			name: string;
			quantity?: number;
			unit?: string;
			estimatedPrice?: number;
			aisle?: string;
			listId: string;
		}) => {
			const res = await api.post("/api/shopping/items", input);
			return (await res.json()).data;
		},
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: ["shopping-list", variables.listId] });
			qc.invalidateQueries({ queryKey: ["shopping-lists"] });
		},
	});
}

export function useUpdateShoppingItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, listId, ...input }: { id: string; listId: string; isChecked?: boolean; name?: string; quantity?: number }) => {
			const res = await api.patch(`/api/shopping/items/${id}`, input);
			return (await res.json()).data;
		},
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: ["shopping-list", variables.listId] });
			qc.invalidateQueries({ queryKey: ["shopping-lists"] });
		},
	});
}

export function useDeleteShoppingItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, listId }: { id: string; listId: string }) => {
			const res = await api.delete(`/api/shopping/items/${id}`);
			return (await res.json()).data;
		},
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: ["shopping-list", variables.listId] });
			qc.invalidateQueries({ queryKey: ["shopping-lists"] });
		},
	});
}

export function useOptimizeRoute() {
	return useMutation({
		mutationFn: async (input: { listIds: string[]; startLat?: number; startLng?: number }) => {
			const res = await api.post("/api/shopping/routes/optimize", input);
			return (await res.json()).data as OptimizedRoute;
		},
	});
}
