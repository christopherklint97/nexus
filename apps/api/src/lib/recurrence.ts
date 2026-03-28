// ─── Recurrence Rule Engine ───
//
// Rule format: "FREQ=DAILY;INTERVAL=1" (subset of RFC 5545 / iCalendar RRULE)
// Supported: FREQ (DAILY, WEEKLY, MONTHLY, YEARLY), INTERVAL, BYDAY, COUNT, UNTIL

export interface ParsedRule {
	freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
	interval: number;
	byDay?: string[]; // MO, TU, WE, TH, FR, SA, SU
	count?: number;
	until?: Date;
}

export function parseRecurrenceRule(rule: string): ParsedRule | null {
	if (!rule) return null;

	const parts = rule.split(";").reduce(
		(acc, part) => {
			const [key, value] = part.split("=");
			if (key && value) acc[key.toUpperCase()] = value;
			return acc;
		},
		{} as Record<string, string>,
	);

	const freq = parts.FREQ as ParsedRule["freq"];
	if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
		return null;
	}

	return {
		freq,
		interval: Number(parts.INTERVAL) || 1,
		byDay: parts.BYDAY?.split(","),
		count: parts.COUNT ? Number(parts.COUNT) : undefined,
		until: parts.UNTIL ? new Date(parts.UNTIL) : undefined,
	};
}

export function buildRecurrenceRule(
	freq: ParsedRule["freq"],
	interval = 1,
	byDay?: string[],
): string {
	let rule = `FREQ=${freq};INTERVAL=${interval}`;
	if (byDay && byDay.length > 0) {
		rule += `;BYDAY=${byDay.join(",")}`;
	}
	return rule;
}

/**
 * Compute the next occurrence date from a given base date and rule.
 */
export function getNextOccurrence(baseDate: Date, rule: ParsedRule): Date {
	const next = new Date(baseDate);

	switch (rule.freq) {
		case "DAILY":
			next.setDate(next.getDate() + rule.interval);
			break;

		case "WEEKLY":
			if (rule.byDay && rule.byDay.length > 0) {
				// Find next matching day of week
				const dayMap: Record<string, number> = {
					SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
				};
				const targetDays = rule.byDay.map((d) => dayMap[d]).filter((d) => d !== undefined);
				const currentDay = next.getDay();

				let daysUntilNext = Infinity;
				for (const target of targetDays) {
					let diff = target - currentDay;
					if (diff <= 0) diff += 7;
					if (diff < daysUntilNext) daysUntilNext = diff;
				}
				next.setDate(next.getDate() + (daysUntilNext === Infinity ? 7 * rule.interval : daysUntilNext));
			} else {
				next.setDate(next.getDate() + 7 * rule.interval);
			}
			break;

		case "MONTHLY":
			next.setMonth(next.getMonth() + rule.interval);
			break;

		case "YEARLY":
			next.setFullYear(next.getFullYear() + rule.interval);
			break;
	}

	return next;
}

/**
 * Check if recurrence has reached its limit.
 */
export function isRecurrenceExpired(
	rule: ParsedRule,
	completedCount: number,
	nextDate: Date,
): boolean {
	if (rule.count && completedCount >= rule.count) return true;
	if (rule.until && nextDate > rule.until) return true;
	return false;
}

// ─── Preset Rules ───

export const RECURRENCE_PRESETS = [
	{ label: "Daily", rule: "FREQ=DAILY;INTERVAL=1" },
	{ label: "Weekdays", rule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR" },
	{ label: "Weekly", rule: "FREQ=WEEKLY;INTERVAL=1" },
	{ label: "Biweekly", rule: "FREQ=WEEKLY;INTERVAL=2" },
	{ label: "Monthly", rule: "FREQ=MONTHLY;INTERVAL=1" },
	{ label: "Yearly", rule: "FREQ=YEARLY;INTERVAL=1" },
] as const;

export function getRuleLabel(rule: string | null): string {
	if (!rule) return "None";
	const preset = RECURRENCE_PRESETS.find((p) => p.rule === rule);
	if (preset) return preset.label;

	const parsed = parseRecurrenceRule(rule);
	if (!parsed) return "Custom";

	const freqLabel = parsed.freq.charAt(0) + parsed.freq.slice(1).toLowerCase();
	return parsed.interval > 1 ? `Every ${parsed.interval} ${freqLabel}s` : freqLabel;
}
