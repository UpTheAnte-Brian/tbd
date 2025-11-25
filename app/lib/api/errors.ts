// app/lib/api/errors.ts

import { NextResponse } from "next/server";

export function jsonError(message: string, status = 500) {
    return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
}

export interface ApiErrorResponse {
    error: string;
}

export function extractErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    try {
        return JSON.stringify(e);
    } catch {
        return "Unknown error";
    }
}
