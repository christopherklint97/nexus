export type Priority = 1 | 2 | 3 | 4;

export type TaskStatus = "todo" | "in_progress" | "done";

export type SyncOperation = "create" | "update" | "delete";

export interface ApiResponse<T> {
	data: T;
	error?: never;
}

export interface ApiError {
	data?: never;
	error: {
		message: string;
		code: string;
	};
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
