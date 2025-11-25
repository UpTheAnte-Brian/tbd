// app/lib/api/handler.ts
import { extractErrorMessage, jsonError } from "./errors";

export async function safeRoute<T>(fn: () => Promise<T>) {
    try {
        const result = await fn();
        return result;
    } catch (err: unknown) {
        console.error("Route error:", err);
        return jsonError(extractErrorMessage(err), 500);
    }
}
