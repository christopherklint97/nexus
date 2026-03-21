import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface SearchResult {
	type: "task" | "shopping_list" | "shopping_item" | "note";
	id: string;
	title: string;
	subtitle: string;
}

export function useGlobalSearch(query: string, workspaceId: string) {
	return useQuery({
		queryKey: ["search", query, workspaceId],
		queryFn: async () => {
			const params = new URLSearchParams({ q: query, workspaceId });
			const res = await api.get(`/api/search?${params}`);
			return ((await res.json()).data || []) as SearchResult[];
		},
		enabled: query.length >= 2 && !!workspaceId,
		staleTime: 10000,
	});
}
