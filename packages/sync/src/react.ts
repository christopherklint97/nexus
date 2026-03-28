import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SyncEngine, type SyncConfig, type SyncStatus } from "./engine";

// React bindings — lightweight context + hook wrapper

const SyncContext = createContext<SyncEngine | null>(null);

export const SyncProvider = SyncContext.Provider;

export function useSyncEngine(): {
	engine: SyncEngine | null;
	status: SyncStatus;
	sync: () => Promise<void>;
	trackChange: SyncEngine["trackChange"];
} {
	const engine = useContext(SyncContext);
	const [status, setStatus] = useState<SyncStatus>(
		engine?.getStatus() ?? {
			lastSyncAt: null,
			pendingChanges: 0,
			isSyncing: false,
			error: null,
		},
	);

	useEffect(() => {
		if (!engine) return;
		setStatus(engine.getStatus());
		return engine.subscribe(setStatus);
	}, [engine]);

	return {
		engine,
		status,
		sync: () => engine?.sync() ?? Promise.resolve(),
		trackChange: (...args) => engine?.trackChange(...args),
	};
}
