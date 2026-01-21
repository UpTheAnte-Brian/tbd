import { inspect } from "node:util";

type ErrorRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorRecord {
    return typeof value === "object" && value !== null;
}

function errorToRecord(err: Error): ErrorRecord {
    const record: ErrorRecord = {
        name: err.name,
        message: err.message,
        stack: err.stack,
    };
    for (const key of Object.getOwnPropertyNames(err)) {
        record[key] = (err as ErrorRecord)[key];
    }
    return record;
}

function safeStringify(value: unknown): string {
    try {
        if (value instanceof Error) {
            return JSON.stringify(errorToRecord(value), null, 2);
        }
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function formatValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (
        typeof value === "number" || typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(value);
    }
    if (value instanceof Error) return value.message || value.name;
    return safeStringify(value);
}

function formatRecord(record: ErrorRecord): string | null {
    const response = isRecord(record.response) ? record.response : null;
    const status = record.status ?? record.statusCode ?? response?.status;
    const statusText = record.statusText ?? response?.statusText;
    const code = record.code;
    const name = record.name;
    const message = record.message;
    const details = record.details;
    const hint = record.hint;

    const lines: string[] = [];
    if (name != null && name !== "Error") {
        lines.push(`name: ${formatValue(name)}`);
    }
    if (status != null) {
        lines.push(
            `status: ${formatValue(status)}${
                statusText ? ` ${formatValue(statusText)}` : ""
            }`,
        );
    }
    if (code != null) lines.push(`code: ${formatValue(code)}`);
    if (message != null) lines.push(`message: ${formatValue(message)}`);
    if (details != null) lines.push(`details: ${formatValue(details)}`);
    if (hint != null) lines.push(`hint: ${formatValue(hint)}`);

    return lines.length ? lines.join("\n") : null;
}

export function extractErrorFields(err: unknown): unknown[] {
    if (!isRecord(err)) return [];
    const record = err as ErrorRecord;
    const extracted: unknown[] = [];

    if (record.error) extracted.push(record.error);
    if (record.cause) extracted.push(record.cause);
    if (isRecord(record.response) && "data" in record.response) {
        extracted.push((record.response as ErrorRecord).data);
    }
    if (record.data) extracted.push(record.data);
    if (record.body) extracted.push(record.body);

    return extracted.filter((value) => value != null);
}

function formatErrorInternal(
    err: unknown,
    seen: Set<unknown>,
    depth: number,
): string {
    if (err == null) return "Unknown error";
    if (typeof err === "string") return err;
    if (
        typeof err === "number" || typeof err === "boolean" ||
        typeof err === "bigint"
    ) {
        return String(err);
    }

    if (Array.isArray(err)) {
        if (err.length === 0) return "Unknown error";
        return err
            .map((item) => formatErrorInternal(item, seen, depth + 1))
            .join("\n---\n");
    }

    if (err instanceof Error) {
        if (seen.has(err)) return "[Circular error object]";
        seen.add(err);
        const record = errorToRecord(err);
        const direct = formatRecord(record) ??
            `message: ${err.message || err.name}`;
        const nested = extractErrorFields(record)
            .map((value) => formatErrorInternal(value, seen, depth + 1))
            .filter((value) => value && value !== direct);
        const stack = record.stack
            ? `stack: ${formatValue(record.stack)}`
            : null;
        const parts = [
            direct,
            stack,
            nested.length ? `Caused by:\n${nested.join("\n")}` : null,
        ].filter((value): value is string => Boolean(value));
        return parts.join("\n");
    }

    if (!isRecord(err)) return String(err);
    if (seen.has(err)) return "[Circular error object]";
    seen.add(err);

    const direct = formatRecord(err);
    const nested = extractErrorFields(err)
        .map((value) => formatErrorInternal(value, seen, depth + 1))
        .filter((value) => value && value !== direct);

    if (nested.length > 0) {
        if (direct) {
            return `${direct}\nCaused by:\n${nested.join("\n")}`;
        }
        return nested.join("\n");
    }

    if (direct) return direct;
    const fallback = safeStringify(err);
    if (fallback === "{}" || fallback === "[]") {
        return inspect(err, { depth: 6, colors: false });
    }
    return fallback;
}

export function formatSupabaseError(err: unknown): string {
    return formatErrorInternal(err, new Set(), 0);
}

export function logSupabaseError(prefix: string, err: unknown): void {
    console.error(`\nERROR: ${prefix}`);
    console.error(formatSupabaseError(err));
}
