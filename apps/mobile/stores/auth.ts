import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

interface User {
	id: string;
	email: string;
	name: string;
}

interface AuthState {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	setAuth: (user: User, accessToken: string, refreshToken: string) => void;
	setTokens: (accessToken: string, refreshToken: string) => void;
	logout: () => void;
	hydrate: () => Promise<void>;
}

const TOKEN_KEY = "nexus_tokens";
const USER_KEY = "nexus_user";

async function saveSecure(key: string, value: string) {
	if (Platform.OS === "web") {
		localStorage.setItem(key, value);
	} else {
		await SecureStore.setItemAsync(key, value);
	}
}

async function getSecure(key: string): Promise<string | null> {
	if (Platform.OS === "web") {
		return localStorage.getItem(key);
	}
	return SecureStore.getItemAsync(key);
}

async function deleteSecure(key: string) {
	if (Platform.OS === "web") {
		localStorage.removeItem(key);
	} else {
		await SecureStore.deleteItemAsync(key);
	}
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	accessToken: null,
	refreshToken: null,
	isAuthenticated: false,
	isLoading: true,

	setAuth: (user, accessToken, refreshToken) => {
		set({ user, accessToken, refreshToken, isAuthenticated: true });
		saveSecure(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
		saveSecure(USER_KEY, JSON.stringify(user));
	},

	setTokens: (accessToken, refreshToken) => {
		set({ accessToken, refreshToken });
		saveSecure(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
	},

	logout: () => {
		set({
			user: null,
			accessToken: null,
			refreshToken: null,
			isAuthenticated: false,
		});
		deleteSecure(TOKEN_KEY);
		deleteSecure(USER_KEY);
	},

	hydrate: async () => {
		try {
			const [tokenData, userData] = await Promise.all([
				getSecure(TOKEN_KEY),
				getSecure(USER_KEY),
			]);

			if (tokenData && userData) {
				const { accessToken, refreshToken } = JSON.parse(tokenData);
				const user = JSON.parse(userData);
				set({
					user,
					accessToken,
					refreshToken,
					isAuthenticated: true,
					isLoading: false,
				});
			} else {
				set({ isLoading: false });
			}
		} catch {
			set({ isLoading: false });
		}
	},
}));
