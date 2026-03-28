import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import OpenAI from "openai";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";

const ai = new Hono();
ai.use("*", authMiddleware);

// ─── OpenRouter Client ───
// Uses OpenAI-compatible SDK pointed at OpenRouter
// Zero data retention via X-Title and HTTP-Referer headers

function getClient(): OpenAI | null {
	const key = process.env.OPENROUTER_API_KEY;
	if (!key) return null;
	return new OpenAI({
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: key,
		defaultHeaders: {
			"HTTP-Referer": process.env.APP_URL || "https://nexus.app",
			"X-Title": "Nexus",
		},
	});
}

// ─── Model Configuration ───
// Easily swap models by changing these defaults or passing model in request

const DEFAULT_MODELS = {
	writing: process.env.AI_MODEL_WRITING || "anthropic/claude-sonnet-4",
	fast: process.env.AI_MODEL_FAST || "anthropic/claude-haiku-4",
};

// ─── AI Writing Assistant ───

const writeAssistSchema = z.object({
	action: z.enum([
		"write",
		"edit",
		"summarize",
		"expand",
		"fix_grammar",
		"translate",
		"explain",
		"brainstorm",
		"make_shorter",
		"make_longer",
		"change_tone",
	]),
	content: z.string().max(50000),
	context: z.string().max(10000).optional(),
	tone: z.string().max(50).optional(),
	language: z.string().max(50).optional(),
	prompt: z.string().max(2000).optional(),
	model: z.string().max(100).optional(), // allow client to override model
});

const ACTION_PROMPTS: Record<string, (content: string, opts?: Record<string, string>) => string> = {
	write: (content, opts) =>
		`Write content based on this prompt:\n\n${opts?.prompt || content}\n\nContext from the page:\n${content}\n\nWrite naturally, in markdown format. Be concise and direct.`,
	edit: (content) =>
		`Edit and improve the following text. Fix any issues, improve clarity, and enhance readability while preserving the original meaning and tone:\n\n${content}`,
	summarize: (content) =>
		`Summarize the following text into key points. Be concise:\n\n${content}`,
	expand: (content) =>
		`Expand on the following text with more detail, examples, and explanation:\n\n${content}`,
	fix_grammar: (content) =>
		`Fix all grammar, spelling, and punctuation errors in the following text. Only return the corrected text, nothing else:\n\n${content}`,
	translate: (content, opts) =>
		`Translate the following text to ${opts?.language || "English"}. Only return the translation:\n\n${content}`,
	explain: (content) =>
		`Explain the following text in simple terms, as if explaining to someone unfamiliar with the topic:\n\n${content}`,
	brainstorm: (content) =>
		`Based on the following context, brainstorm 5-10 ideas or suggestions. Format as a bullet list:\n\n${content}`,
	make_shorter: (content) =>
		`Rewrite the following text to be significantly shorter while keeping the key information:\n\n${content}`,
	make_longer: (content) =>
		`Rewrite the following text to be more detailed and comprehensive:\n\n${content}`,
	change_tone: (content, opts) =>
		`Rewrite the following text in a ${opts?.tone || "professional"} tone:\n\n${content}`,
};

ai.post("/assist", zValidator("json", writeAssistSchema), async (c) => {
	const client = getClient();
	if (!client) {
		return c.json(
			{ error: { message: "AI features not configured. Set OPENROUTER_API_KEY.", code: "AI_NOT_CONFIGURED" } },
			503,
		);
	}

	const { action, content, context, tone, language, prompt, model } = c.req.valid("json");

	const buildPrompt = ACTION_PROMPTS[action];
	if (!buildPrompt) {
		return c.json({ error: { message: "Unknown action", code: "INVALID_ACTION" } }, 400);
	}

	const userMessage = buildPrompt(content, {
		tone: tone || "",
		language: language || "",
		prompt: prompt || "",
	});

	try {
		const response = await client.chat.completions.create({
			model: model || DEFAULT_MODELS.writing,
			max_tokens: 4096,
			messages: [
				{
					role: "system",
					content:
						"You are an AI writing assistant embedded in a personal productivity app called Nexus. " +
						"You help users write, edit, and improve their notes, tasks, and documents. " +
						"Be concise, helpful, and match the user's writing style when possible. " +
						"Output clean text or markdown. Do not add unnecessary preamble or explanations unless asked.",
				},
				...(context
					? [
							{ role: "user" as const, content: `Here is additional context from the page I'm working on:\n\n${context}` },
							{ role: "assistant" as const, content: "I understand the context. What would you like me to help with?" },
						]
					: []),
				{ role: "user", content: userMessage },
			],
			// OpenRouter-specific: request zero data retention
			// @ts-ignore — OpenRouter extension
			provider: {
				data_collection: "deny",
			},
		});

		const text = response.choices[0]?.message?.content || "";

		return c.json({
			data: {
				text,
				action,
				model: response.model,
				usage: {
					inputTokens: response.usage?.prompt_tokens || 0,
					outputTokens: response.usage?.completion_tokens || 0,
				},
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "AI request failed";
		return c.json({ error: { message, code: "AI_ERROR" } }, 500);
	}
});

// ─── Natural Language Task Parser ───

const parseTaskSchema = z.object({
	input: z.string().min(1).max(500),
	model: z.string().max(100).optional(),
});

ai.post("/parse-task", zValidator("json", parseTaskSchema), async (c) => {
	const client = getClient();
	if (!client) {
		return c.json(
			{ error: { message: "AI features not configured", code: "AI_NOT_CONFIGURED" } },
			503,
		);
	}

	const { input, model } = c.req.valid("json");

	try {
		const response = await client.chat.completions.create({
			model: model || DEFAULT_MODELS.fast,
			max_tokens: 500,
			messages: [
				{
					role: "user",
					content: `Parse this natural language input into a structured task. Today's date is ${new Date().toISOString().split("T")[0]}.

Input: "${input}"

Respond with ONLY a JSON object (no markdown, no backticks) with these fields:
- title: string (the task title, cleaned up)
- dueDate: string | null (ISO 8601 date if mentioned, e.g. "tomorrow" = next day, "friday" = next friday)
- priority: number (1=urgent, 2=high, 3=medium, 4=low, default 4)
- recurrenceRule: string | null (if recurring, use RRULE format like "FREQ=DAILY;INTERVAL=1")`,
				},
			],
			// @ts-ignore — OpenRouter extension
			provider: { data_collection: "deny" },
		});

		const text = response.choices[0]?.message?.content || "";

		try {
			const parsed = JSON.parse(text.trim());
			return c.json({ data: parsed });
		} catch {
			return c.json({ data: { title: input, dueDate: null, priority: 4, recurrenceRule: null } });
		}
	} catch {
		return c.json({ data: { title: input, dueDate: null, priority: 4, recurrenceRule: null } });
	}
});

// ─── Smart Shopping List ───

const smartShoppingSchema = z.object({
	items: z.array(
		z.object({
			name: z.string(),
			quantity: z.number().optional(),
			unit: z.string().optional(),
		}),
	),
	model: z.string().max(100).optional(),
});

ai.post("/smart-shopping", zValidator("json", smartShoppingSchema), async (c) => {
	const client = getClient();
	if (!client) {
		return c.json(
			{ error: { message: "AI features not configured", code: "AI_NOT_CONFIGURED" } },
			503,
		);
	}

	const { items, model } = c.req.valid("json");

	try {
		const response = await client.chat.completions.create({
			model: model || DEFAULT_MODELS.fast,
			max_tokens: 1000,
			messages: [
				{
					role: "user",
					content: `I have a shopping list. Please:
1. Merge duplicate items (combine quantities)
2. Categorize items by aisle (produce, dairy, meat, bakery, frozen, pantry, beverages, snacks, household, other)
3. Suggest any commonly forgotten complementary items

Items: ${JSON.stringify(items)}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "mergedItems": [{"name": string, "quantity": number, "unit": string, "aisle": string}],
  "suggestions": [{"name": string, "reason": string}]
}`,
				},
			],
			// @ts-ignore — OpenRouter extension
			provider: { data_collection: "deny" },
		});

		const text = response.choices[0]?.message?.content || "";

		try {
			const parsed = JSON.parse(text.trim());
			return c.json({ data: parsed });
		} catch {
			return c.json({ data: { mergedItems: items, suggestions: [] } });
		}
	} catch {
		return c.json({ data: { mergedItems: items, suggestions: [] } });
	}
});

// ─── Get Available Models ───

ai.get("/models", async (c) => {
	return c.json({
		data: {
			current: DEFAULT_MODELS,
			description:
				"Models can be overridden per-request via the 'model' field, or globally via AI_MODEL_WRITING and AI_MODEL_FAST env vars.",
			examples: [
				"anthropic/claude-sonnet-4",
				"anthropic/claude-haiku-4",
				"openai/gpt-4o",
				"openai/gpt-4o-mini",
				"google/gemini-2.5-flash",
				"meta-llama/llama-4-maverick",
			],
		},
	});
});

export default ai;
