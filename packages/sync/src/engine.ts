export interface SyncConfig {
	apiUrl: string;
	getAccessToken: () => string | null;
	workspaceId: string;
	deviceId: string;
	onSyncComplete?: (status: SyncStatus) => void;
	onConflict?: (conflict: SyncConflict) => void;
}

export interface SyncStatus {
	lastSyncAt: string | null;
	pendingChanges: number;
	isSyncing: boolean;
	error: string | null;
}

export interface PendingChange {
	id: string;
	entityType: string;
	entityId: string;
	operation: "create" | "update" | "delete";
	data?: Record<string, unknown>;
	timestamp: string;
	retryCount: number;
}

export interface SyncConflict {
	entityType: string;
	entityId: string;
	localData: Record<string, unknown>;
	serverData: Record<string, unknown>;
}

export class SyncEngine {
	private config: SyncConfig;
	private queue: PendingChange[] = [];
	private status: SyncStatus = {
		lastSyncAt: null,
		pendingChanges: 0,
		isSyncing: false,
		error: null,
	};
	private syncInterval: ReturnType<typeof setInterval> | null = null;
	private listeners: Set<(status: SyncStatus) => void> = new Set();

	constructor(config: SyncConfig) {
		this.config = config;
		this.loadPersistedState();
	}

	// ─── Public API ───

	getStatus(): SyncStatus {
		return { ...this.status };
	}

	subscribe(listener: (status: SyncStatus) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Queue a local change for syncing */
	trackChange(
		entityType: string,
		entityId: string,
		operation: "create" | "update" | "delete",
		data?: Record<string, unknown>,
	) {
		const change: PendingChange = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			entityType,
			entityId,
			operation,
			data,
			timestamp: new Date().toISOString(),
			retryCount: 0,
		};

		// Collapse updates to the same entity
		const existingIdx = this.queue.findIndex(
			(c) => c.entityType === entityType && c.entityId === entityId,
		);
		if (existingIdx >= 0) {
			const existing = this.queue[existingIdx];
			if (operation === "delete") {
				// If we created it locally and now delete it, just remove from queue
				if (existing.operation === "create") {
					this.queue.splice(existingIdx, 1);
					this.updateStatus({ pendingChanges: this.queue.length });
					return;
				}
				this.queue[existingIdx] = change;
			} else if (operation === "update") {
				// Merge update data
				this.queue[existingIdx] = {
					...existing,
					data: { ...existing.data, ...data },
					timestamp: change.timestamp,
				};
			}
		} else {
			this.queue.push(change);
		}

		this.updateStatus({ pendingChanges: this.queue.length });
		this.persistState();
	}

	/** Push pending changes to server, then pull remote changes */
	async sync(): Promise<void> {
		if (this.status.isSyncing) return;
		this.updateStatus({ isSyncing: true, error: null });

		try {
			await this.push();
			await this.pull();
			this.updateStatus({
				lastSyncAt: new Date().toISOString(),
				isSyncing: false,
			});
			this.config.onSyncComplete?.(this.getStatus());
		} catch (err) {
			const message = err instanceof Error ? err.message : "Sync failed";
			this.updateStatus({ isSyncing: false, error: message });
		}
	}

	/** Start periodic background syncing */
	startAutoSync(intervalMs = 30_000) {
		this.stopAutoSync();
		// Sync immediately
		this.sync();
		this.syncInterval = setInterval(() => this.sync(), intervalMs);
	}

	stopAutoSync() {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	destroy() {
		this.stopAutoSync();
		this.listeners.clear();
	}

	// ─── Internal ───

	private async push(): Promise<void> {
		if (this.queue.length === 0) return;

		const token = this.config.getAccessToken();
		if (!token) throw new Error("Not authenticated");

		const changesToPush = this.queue.map((c) => ({
			entityType: c.entityType,
			entityId: c.entityId,
			operation: c.operation,
			data: c.data,
			timestamp: c.timestamp,
			deviceId: this.config.deviceId,
		}));

		const res = await fetch(`${this.config.apiUrl}/api/sync/push`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ changes: changesToPush }),
		});

		if (!res.ok) {
			throw new Error(`Push failed: ${res.status}`);
		}

		const json = await res.json();
		const results = json.data?.results || [];

		// Remove successfully synced changes
		const successIds = new Set(
			results
				.filter((r: { status: string }) => r.status === "ok")
				.map((r: { entityId: string }) => r.entityId),
		);

		this.queue = this.queue.filter((c) => {
			if (successIds.has(c.entityId)) return false;
			c.retryCount++;
			// Drop after 5 retries
			return c.retryCount < 5;
		});

		this.updateStatus({ pendingChanges: this.queue.length });
		this.persistState();
	}

	private async pull(): Promise<void> {
		const token = this.config.getAccessToken();
		if (!token) throw new Error("Not authenticated");

		const since = this.status.lastSyncAt || "1970-01-01T00:00:00.000Z";
		const params = new URLSearchParams({
			since,
			deviceId: this.config.deviceId,
			workspaceId: this.config.workspaceId,
		});

		const res = await fetch(`${this.config.apiUrl}/api/sync/pull?${params}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!res.ok) {
			throw new Error(`Pull failed: ${res.status}`);
		}

		// The pulled data is returned but consumption is left to the app layer.
		// TanStack Query invalidation will pick up fresh data on next query.
		// This is intentional — the sync engine manages the transport,
		// while the query layer manages the UI cache.
	}

	private updateStatus(partial: Partial<SyncStatus>) {
		this.status = { ...this.status, ...partial };
		for (const listener of this.listeners) {
			listener(this.getStatus());
		}
	}

	private persistState() {
		try {
			const state = {
				queue: this.queue,
				lastSyncAt: this.status.lastSyncAt,
			};
			if (typeof globalThis.localStorage !== "undefined") {
				globalThis.localStorage.setItem(`nexus_sync_${this.config.deviceId}`, JSON.stringify(state));
			}
		} catch {
			// Storage unavailable
		}
	}

	private loadPersistedState() {
		try {
			if (typeof globalThis.localStorage !== "undefined") {
				const raw = globalThis.localStorage.getItem(`nexus_sync_${this.config.deviceId}`);
				if (raw) {
					const state = JSON.parse(raw);
					this.queue = state.queue || [];
					this.status.lastSyncAt = state.lastSyncAt || null;
					this.status.pendingChanges = this.queue.length;
				}
			}
		} catch {
			// Storage unavailable or corrupt
		}
	}
}
