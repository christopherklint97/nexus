import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface RecipeIngredient {
	quantity: number;
	unit: string;
	item: string;
}

export interface Recipe {
	id: string;
	title: string;
	description: string | null;
	ingredientsJson: string | null;
	instructionsJson: string | null;
	prepTime: number | null;
	cookTime: number | null;
	servings: number | null;
	cuisine: string | null;
	difficulty: "easy" | "medium" | "hard" | null;
	sourceUrl: string | null;
	imageUrl: string | null;
	tagsJson: string | null;
	isFavorite: boolean;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
}

export function parseIngredients(json: string | null): RecipeIngredient[] {
	if (!json) return [];
	try {
		return JSON.parse(json);
	} catch {
		return [];
	}
}

export function parseInstructions(json: string | null): string[] {
	if (!json) return [];
	try {
		return JSON.parse(json);
	} catch {
		return [];
	}
}

export function parseTags(json: string | null): string[] {
	if (!json) return [];
	try {
		return JSON.parse(json);
	} catch {
		return [];
	}
}

export function formatTime(minutes: number | null): string {
	if (!minutes) return "";
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function useRecipesQuery(
	workspaceId: string,
	filters?: {
		cuisine?: string;
		difficulty?: string;
		tag?: string;
		favorite?: boolean;
		search?: string;
	},
) {
	return useQuery({
		queryKey: ["recipes", workspaceId, filters],
		queryFn: async () => {
			const params = new URLSearchParams({ workspaceId });
			if (filters?.cuisine) params.set("cuisine", filters.cuisine);
			if (filters?.difficulty) params.set("difficulty", filters.difficulty);
			if (filters?.tag) params.set("tag", filters.tag);
			if (filters?.favorite !== undefined) params.set("favorite", String(filters.favorite));
			if (filters?.search) params.set("search", filters.search);
			const res = await api.get(`/api/recipes?${params}`);
			const json = await res.json();
			return json.data as Recipe[];
		},
		enabled: !!workspaceId,
	});
}

export function useRecipeDetailQuery(id: string) {
	return useQuery({
		queryKey: ["recipe", id],
		queryFn: async () => {
			const res = await api.get(`/api/recipes/${id}`);
			const json = await res.json();
			return json.data as Recipe;
		},
		enabled: !!id,
	});
}

export function useCreateRecipe() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			title: string;
			description?: string;
			ingredients?: RecipeIngredient[];
			instructions?: string[];
			prepTime?: number;
			cookTime?: number;
			servings?: number;
			cuisine?: string;
			difficulty?: "easy" | "medium" | "hard";
			sourceUrl?: string;
			imageUrl?: string;
			tags?: string[];
			isFavorite?: boolean;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/recipes", input);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
	});
}

export function useUpdateRecipe() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			title?: string;
			description?: string;
			ingredients?: RecipeIngredient[];
			instructions?: string[];
			prepTime?: number | null;
			cookTime?: number | null;
			servings?: number | null;
			cuisine?: string | null;
			difficulty?: "easy" | "medium" | "hard" | null;
			tags?: string[];
			isFavorite?: boolean;
		}) => {
			const res = await api.patch(`/api/recipes/${id}`, input);
			return (await res.json()).data;
		},
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: ["recipes"] });
			qc.invalidateQueries({ queryKey: ["recipe", variables.id] });
		},
	});
}

export function useDeleteRecipe() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/recipes/${id}`);
			return (await res.json()).data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
	});
}

export function useAddRecipeToList() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: { recipeId: string; listId: string; scale?: number }) => {
			const res = await api.post(`/api/recipes/${input.recipeId}/add-to-list`, {
				listId: input.listId,
				scale: input.scale ?? 1,
			});
			return (await res.json()).data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["shopping-lists"] });
			qc.invalidateQueries({ queryKey: ["shopping-list"] });
		},
	});
}
