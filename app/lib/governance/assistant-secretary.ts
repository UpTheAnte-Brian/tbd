import { z } from "zod";

export const ASSISTANT_SECRETARY_EXTRACTOR_VERSION = "phase1-regex-v1";

const motionOutcomeSchema = z.enum(["approved", "passed", "failed", "unknown"]);

const voteSummarySchema = z.object({
    raw: z.string().nullable(),
    yes: z.number().int().nonnegative().nullable(),
    no: z.number().int().nonnegative().nullable(),
    abstain: z.number().int().nonnegative().nullable(),
    outcome: motionOutcomeSchema,
}).strict();

export const assistantSecretaryMotionSchema = z.object({
    title: z.string().min(1),
    moved_by: z.string().nullable(),
    seconded_by: z.string().nullable(),
    source_excerpt: z.string().min(1),
    source_line_numbers: z.array(z.number().int().positive()).min(1),
    vote: voteSummarySchema,
}).strict();

export const assistantSecretaryActionItemSchema = z.object({
    description: z.string().min(1),
    owner_name: z.string().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    source_excerpt: z.string().min(1),
    source_line_number: z.number().int().positive(),
}).strict();

export const assistantSecretaryOutputSchema = z.object({
    extractor_version: z.literal(ASSISTANT_SECRETARY_EXTRACTOR_VERSION),
    meeting_id: z.string().uuid(),
    generated_at: z.string().datetime({ offset: true }),
    stats: z.object({
        line_count: z.number().int().nonnegative(),
        keyword_hit_count: z.number().int().nonnegative(),
    }).strict(),
    motions: z.array(assistantSecretaryMotionSchema),
    action_items: z.array(assistantSecretaryActionItemSchema),
    minutes: z.object({
        content_md: z.string().min(1),
    }).strict(),
}).strict();

export type AssistantSecretaryOutput = z.infer<
    typeof assistantSecretaryOutputSchema
>;
export type AssistantSecretaryMotion = z.infer<
    typeof assistantSecretaryMotionSchema
>;
export type AssistantSecretaryActionItem = z.infer<
    typeof assistantSecretaryActionItemSchema
>;

type MotionDraft = AssistantSecretaryMotion;

const KEYWORD_REGEX =
    /\b(motion|moved|second(?:ed)?|vote|approved|passed|failed)\b/i;
const MOTION_START_REGEX = /\b(motion|moved)\b/i;
const ACTION_ITEM_REGEX = /\b(action item|follow[- ]?up|todo)\b/i;

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function cleanLine(value: string): string {
    let cleaned = normalizeWhitespace(value);
    cleaned = cleaned.replace(/^[-*\u2022\d.)\s:]+/, "");
    cleaned = cleaned.replace(/^[A-Za-z][A-Za-z .'-]{1,80}:\s*/, "");
    return normalizeWhitespace(cleaned);
}

function titleCaseFirst(value: string): string {
    if (!value) return value;
    return value[0].toUpperCase() + value.slice(1);
}

function parsePerson(line: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
        const match = line.match(pattern);
        const raw = match?.[1];
        if (!raw) continue;
        const name = normalizeWhitespace(raw.replace(/[.,;:]+$/, ""));
        if (name.length >= 2) return name;
    }
    return null;
}

function parseMovedBy(line: string): string | null {
    return parsePerson(line, [
        /\bmoved by\s+([A-Za-z][A-Za-z .'-]{1,80})/i,
        /^([A-Za-z][A-Za-z .'-]{1,80})\s+moved\b/i,
    ]);
}

function parseSecondedBy(line: string): string | null {
    return parsePerson(line, [
        /\bsecond(?:ed)? by\s+([A-Za-z][A-Za-z .'-]{1,80})/i,
        /^([A-Za-z][A-Za-z .'-]{1,80})\s+second(?:ed)?\b/i,
    ]);
}

function parseMotionTitle(line: string): string {
    const patterns = [
        /\bmotion(?:\s+was)?\s+to\s+(.+)/i,
        /\bmoved\s+to\s+(.+)/i,
        /\bmotion\s*[:-]\s*(.+)/i,
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        const value = match?.[1];
        if (!value) continue;
        const trimmed = normalizeWhitespace(
            value.replace(/\b(second(?:ed)?|vote|approved|passed|failed)\b.*$/i, ""),
        );
        if (trimmed) return titleCaseFirst(trimmed);
    }

    return titleCaseFirst(line);
}

function parseCount(line: string, label: "yes" | "no" | "abstain"): number | null {
    const match = line.match(new RegExp(`\\b${label}\\s*[:=]?\\s*(\\d+)`, "i"));
    if (!match?.[1]) return null;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseVoteSummary(line: string): AssistantSecretaryMotion["vote"] {
    let yes = parseCount(line, "yes");
    let no = parseCount(line, "no");
    const abstain = parseCount(line, "abstain");

    if (yes === null || no === null) {
        const tally = line.match(/\b(\d+)\s*[-–]\s*(\d+)\b/);
        if (tally?.[1] && tally?.[2]) {
            yes = yes ?? Number.parseInt(tally[1], 10);
            no = no ?? Number.parseInt(tally[2], 10);
        }
    }

    let outcome: AssistantSecretaryMotion["vote"]["outcome"] = "unknown";
    if (/\bfailed\b/i.test(line)) {
        outcome = "failed";
    } else if (/\bapproved\b/i.test(line)) {
        outcome = "approved";
    } else if (/\bpassed\b/i.test(line)) {
        outcome = "passed";
    } else if (yes !== null && no !== null) {
        outcome = yes > no ? "passed" : no > yes ? "failed" : "unknown";
    }

    return {
        raw: line,
        yes,
        no,
        abstain,
        outcome,
    };
}

function appendSourceLine(
    motion: MotionDraft,
    lineNumber: number,
): void {
    if (!motion.source_line_numbers.includes(lineNumber)) {
        motion.source_line_numbers.push(lineNumber);
    }
}

function createMotionDraft(line: string, lineNumber: number): MotionDraft {
    return {
        title: parseMotionTitle(line),
        moved_by: parseMovedBy(line),
        seconded_by: parseSecondedBy(line),
        source_excerpt: line,
        source_line_numbers: [lineNumber],
        vote: parseVoteSummary(line),
    };
}

function updateMotionDraft(
    motion: MotionDraft,
    line: string,
    lineNumber: number,
): void {
    appendSourceLine(motion, lineNumber);

    if (!motion.moved_by) {
        motion.moved_by = parseMovedBy(line);
    }
    if (!motion.seconded_by) {
        motion.seconded_by = parseSecondedBy(line);
    }

    const vote = parseVoteSummary(line);
    const hasVoteSignal =
        /\b(vote|approved|passed|failed)\b/i.test(line) ||
        vote.yes !== null ||
        vote.no !== null ||
        vote.abstain !== null;
    if (hasVoteSignal) {
        motion.vote = vote;
    }
}

function parseActionItem(line: string, lineNumber: number): AssistantSecretaryActionItem {
    const cleaned = line
        .replace(/\b(action item|follow[- ]?up|todo)\b[:\-\s]*/i, "")
        .trim();
    const owner =
        line.match(/\bowner\s*[:=]\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ??
            null;
    const due = line.match(/\bdue\s*[:=]?\s*(\d{4}-\d{2}-\d{2})\b/i)?.[1] ??
        null;

    return {
        description: cleaned || line,
        owner_name: owner ? normalizeWhitespace(owner) : null,
        due_date: due,
        source_excerpt: line,
        source_line_number: lineNumber,
    };
}

function motionSummaryLine(motion: AssistantSecretaryMotion): string {
    const movedBy = motion.moved_by ? `moved by ${motion.moved_by}` : "mover unknown";
    const secondedBy = motion.seconded_by
        ? `seconded by ${motion.seconded_by}`
        : "seconder unknown";
    const outcome = motion.vote.outcome;
    const voteBits = [
        motion.vote.yes !== null ? `yes ${motion.vote.yes}` : null,
        motion.vote.no !== null ? `no ${motion.vote.no}` : null,
        motion.vote.abstain !== null ? `abstain ${motion.vote.abstain}` : null,
    ].filter(Boolean);
    const voteText = voteBits.length > 0
        ? ` (${voteBits.join(", ")})`
        : "";

    return `- **${motion.title}** (${movedBy}; ${secondedBy}; outcome: ${outcome}${voteText})`;
}

function buildMinutesMarkdown(
    meetingId: string,
    motions: AssistantSecretaryMotion[],
    actionItems: AssistantSecretaryActionItem[],
): string {
    const generatedAt = new Date().toISOString();
    const motionLines = motions.length > 0
        ? motions.map((motion) => motionSummaryLine(motion))
        : ["- No motions were detected from the provided transcript."];
    const actionItemLines = actionItems.length > 0
        ? actionItems.map((item) =>
            `- ${item.description}${
                item.owner_name ? ` (owner: ${item.owner_name})` : ""
            }${item.due_date ? ` (due: ${item.due_date})` : ""}`
        )
        : ["- No action items were detected."];

    return [
        "# Board Meeting Minutes (Draft)",
        "",
        "## Metadata",
        `- Meeting ID: ${meetingId}`,
        `- Generated At: ${generatedAt}`,
        `- Extractor: ${ASSISTANT_SECRETARY_EXTRACTOR_VERSION}`,
        "",
        "## Motions",
        ...motionLines,
        "",
        "## Action Items",
        ...actionItemLines,
        "",
        "## Notes",
        "- This draft was generated with deterministic regex heuristics from the stored transcript.",
        "- Review and edit before finalizing official minutes.",
    ].join("\n");
}

export function extractAssistantSecretaryOutput(params: {
    meetingId: string;
    transcript: string;
}): AssistantSecretaryOutput {
    const meetingId = params.meetingId.trim();
    const lines = params.transcript.split(/\r?\n/);
    const motions: MotionDraft[] = [];
    const actionItems: AssistantSecretaryActionItem[] = [];
    let currentMotion: MotionDraft | null = null;
    let keywordHitCount = 0;

    lines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        const cleaned = cleanLine(rawLine);
        if (!cleaned) return;

        if (ACTION_ITEM_REGEX.test(cleaned)) {
            actionItems.push(parseActionItem(cleaned, lineNumber));
        }

        const hasKeyword = KEYWORD_REGEX.test(cleaned);
        if (!hasKeyword) return;

        keywordHitCount += 1;
        const startsMotion = MOTION_START_REGEX.test(cleaned);
        const closesMotion = /\b(approved|passed|failed)\b/i.test(cleaned);

        if (startsMotion) {
            if (currentMotion) motions.push(currentMotion);
            currentMotion = createMotionDraft(cleaned, lineNumber);
            if (closesMotion) {
                motions.push(currentMotion);
                currentMotion = null;
            }
            return;
        }

        if (!currentMotion) {
            currentMotion = createMotionDraft(cleaned, lineNumber);
        } else {
            updateMotionDraft(currentMotion, cleaned, lineNumber);
        }

        if (closesMotion) {
            motions.push(currentMotion);
            currentMotion = null;
        }
    });

    if (currentMotion) {
        motions.push(currentMotion);
    }

    const sortedMotions = motions.sort(
        (a, b) => a.source_line_numbers[0] - b.source_line_numbers[0],
    );
    const minutesContentMd = buildMinutesMarkdown(
        meetingId,
        sortedMotions,
        actionItems,
    );

    return assistantSecretaryOutputSchema.parse({
        extractor_version: ASSISTANT_SECRETARY_EXTRACTOR_VERSION,
        meeting_id: meetingId,
        generated_at: new Date().toISOString(),
        stats: {
            line_count: lines.length,
            keyword_hit_count: keywordHitCount,
        },
        motions: sortedMotions,
        action_items: actionItems,
        minutes: {
            content_md: minutesContentMd,
        },
    });
}

export function validateAssistantSecretaryOutput(
    payload: unknown,
): ReturnType<typeof assistantSecretaryOutputSchema.safeParse> {
    return assistantSecretaryOutputSchema.safeParse(payload);
}
