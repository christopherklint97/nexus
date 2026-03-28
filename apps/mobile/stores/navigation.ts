import { Platform } from "react-native";
import { create } from "zustand";

interface RecentPage {
	id: string;
	title: string;
	icon: string;
	route: string;
	type: "note" | "database" | "task" | "recipe" | "shopping" | "folder";
	timestamp: number;
}

interface FavoritePage {
	id: string;
	title: string;
	icon: string;
	route: string;
	type: "note" | "database" | "task" | "recipe" | "shopping" | "folder";
}

interface NavigationState {
	recents: RecentPage[];
	favorites: FavoritePage[];
	isDrawerOpen: boolean;
	setDrawerOpen: (open: boolean) => void;
	addRecent: (page: Omit<RecentPage, "timestamp">) => void;
	toggleFavorite: (page: FavoritePage) => void;
	isFavorite: (id: string) => boolean;
	hydrate: () => void;
}

const STORAGE_KEY = "nexus_nav";
const MAX_RECENTS = 20;

function loadFromStorage(): { recents: RecentPage[]; favorites: FavoritePage[] } {
	try {
		if (Platform.OS === "web" && typeof localStorage !== "undefined") {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw);
		}
	} catch {}
	return { recents: [], favorites: [] };
}

function saveToStorage(recents: RecentPage[], favorites: FavoritePage[]) {
	try {
		if (Platform.OS === "web" && typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ recents, favorites }));
		}
	} catch {}
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
	recents: [],
	favorites: [],
	isDrawerOpen: false,

	setDrawerOpen: (open) => set({ isDrawerOpen: open }),

	addRecent: (page) => {
		const { recents, favorites } = get();
		const entry: RecentPage = { ...page, timestamp: Date.now() };
		const filtered = recents.filter((r) => r.id !== page.id);
		const next = [entry, ...filtered].slice(0, MAX_RECENTS);
		set({ recents: next });
		saveToStorage(next, favorites);
	},

	toggleFavorite: (page) => {
		const { favorites, recents } = get();
		const exists = favorites.some((f) => f.id === page.id);
		const next = exists
			? favorites.filter((f) => f.id !== page.id)
			: [...favorites, page];
		set({ favorites: next });
		saveToStorage(recents, next);
	},

	isFavorite: (id) => get().favorites.some((f) => f.id === id),

	hydrate: () => {
		const data = loadFromStorage();
		set({ recents: data.recents, favorites: data.favorites });
	},
}));
