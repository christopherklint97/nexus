import { useAuthStore } from "@/stores/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
	const { accessToken } = useAuthStore.getState();

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options.headers as Record<string, string>),
	};

	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}

	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers,
	});

	// Handle token refresh on 401
	if (response.status === 401 && accessToken) {
		const { refreshToken, setTokens, logout } = useAuthStore.getState();
		if (refreshToken) {
			const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ refreshToken }),
			});

			if (refreshResponse.ok) {
				const { data } = await refreshResponse.json();
				setTokens(data.accessToken, data.refreshToken);

				// Retry original request with new token
				headers.Authorization = `Bearer ${data.accessToken}`;
				return fetch(`${API_URL}${path}`, { ...options, headers });
			}

			logout();
		}
	}

	return response;
}

export const api = {
	get: (path: string) => fetchWithAuth(path),
	post: (path: string, body?: unknown) =>
		fetchWithAuth(path, {
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		}),
	patch: (path: string, body?: unknown) =>
		fetchWithAuth(path, {
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
		}),
	delete: (path: string) => fetchWithAuth(path, { method: "DELETE" }),
};
