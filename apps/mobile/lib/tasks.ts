import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface TaskLabel {
	id: string;
	name: string;
	color: string;
}

export interface Task {
	id: string;
	title: string;
	description: string | null;
	status: "todo" | "in_progress" | "done";
	priority: number;
	dueDate: string | null;
	recurrenceRule: string | null;
	parentTaskId: string | null;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	labels: TaskLabel[];
	subtasks: { total: number; done: number };
}

export interface TaskDetail extends Omit<Task, "subtasks"> {
	subtaskList: Omit<Task, "labels" | "subtasks">[];
}

interface ListTasksParams {
	workspaceId: string;
	status?: string;
	priority?: number;
	sort?: string;
	order?: string;
	parentTaskId?: string | null;
}

export function useTasksQuery(params: ListTasksParams) {
	const queryString = new URLSearchParams(
		Object.entries(params).reduce(
			(acc, [k, v]) => {
				if (v !== undefined && v !== null) acc[k] = String(v);
				return acc;
			},
			{} as Record<string, string>,
		),
	).toString();

	return useQuery({
		queryKey: ["tasks", params],
		queryFn: async () => {
			const res = await api.get(`/api/tasks?${queryString}`);
			const json = await res.json();
			return json.data as Task[];
		},
		enabled: !!params.workspaceId,
	});
}

export function useTaskDetailQuery(taskId: string) {
	return useQuery({
		queryKey: ["task", taskId],
		queryFn: async () => {
			const res = await api.get(`/api/tasks/${taskId}`);
			const json = await res.json();
			return json.data as TaskDetail;
		},
		enabled: !!taskId,
	});
}

export function useCreateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			title: string;
			description?: string;
			status?: string;
			priority?: number;
			dueDate?: string;
			recurrenceRule?: string;
			parentTaskId?: string;
			workspaceId: string;
		}) => {
			const res = await api.post("/api/tasks", input);
			const json = await res.json();
			return json.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useUpdateTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			title?: string;
			description?: string;
			status?: string;
			priority?: number;
			dueDate?: string;
			recurrenceRule?: string;
		}) => {
			const res = await api.patch(`/api/tasks/${id}`, input);
			const json = await res.json();
			return json.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["task", variables.id] });
		},
	});
}

export function useDeleteTask() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await api.delete(`/api/tasks/${id}`);
			const json = await res.json();
			return json.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
