import { useMutation } from "@tanstack/react-query";
import { api } from "./api";

// ─── Types ───

export type AIAction =
	| "write"
	| "edit"
	| "summarize"
	| "expand"
	| "fix_grammar"
	| "translate"
	| "explain"
	| "brainstorm"
	| "make_shorter"
	| "make_longer"
	| "change_tone";

export interface AIAssistResult {
	text: string;
	action: AIAction;
	model: string;
	usage: { inputTokens: number; outputTokens: number };
}

export interface ParsedTask {
	title: string;
	dueDate: string | null;
	priority: number;
	recurrenceRule: string | null;
}

export interface SmartShoppingResult {
	mergedItems: Array<{ name: string; quantity: number; unit: string; aisle: string }>;
	suggestions: Array<{ name: string; reason: string }>;
}

// ─── AI Actions ───

export const AI_ACTIONS: Array<{ action: AIAction; label: string; icon: string; description: string }> = [
	{ action: "edit", label: "Improve Writing", icon: "\u270F\uFE0F", description: "Fix and improve clarity" },
	{ action: "fix_grammar", label: "Fix Grammar", icon: "\uD83D\uDCD6", description: "Fix spelling and grammar" },
	{ action: "summarize", label: "Summarize", icon: "\uD83D\uDCCB", description: "Condense into key points" },
	{ action: "expand", label: "Expand", icon: "\uD83D\uDCDD", description: "Add more detail" },
	{ action: "make_shorter", label: "Make Shorter", icon: "\u2702\uFE0F", description: "Trim it down" },
	{ action: "make_longer", label: "Make Longer", icon: "\uD83D\uDCC4", description: "Add more substance" },
	{ action: "explain", label: "Explain", icon: "\uD83D\uDCA1", description: "Simplify and explain" },
	{ action: "brainstorm", label: "Brainstorm", icon: "\uD83E\uDDE0", description: "Generate ideas" },
	{ action: "change_tone", label: "Change Tone", icon: "\uD83C\uDFA8", description: "Professional, casual, etc." },
	{ action: "translate", label: "Translate", icon: "\uD83C\uDF10", description: "Translate to another language" },
	{ action: "write", label: "Write for Me", icon: "\u2728", description: "Generate content from a prompt" },
];

// ─── Mutations ───

export function useAIAssist() {
	return useMutation({
		mutationFn: async (input: {
			action: AIAction;
			content: string;
			context?: string;
			tone?: string;
			language?: string;
			prompt?: string;
			model?: string;
		}) => {
			const res = await api.post("/api/ai/assist", input);
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data as AIAssistResult;
		},
	});
}

export function useParseTask() {
	return useMutation({
		mutationFn: async (input: string) => {
			const res = await api.post("/api/ai/parse-task", { input });
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data as ParsedTask;
		},
	});
}

export function useSmartShopping() {
	return useMutation({
		mutationFn: async (items: Array<{ name: string; quantity?: number; unit?: string }>) => {
			const res = await api.post("/api/ai/smart-shopping", { items });
			const json = await res.json();
			if (json.error) throw new Error(json.error.message);
			return json.data as SmartShoppingResult;
		},
	});
}
