import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";
import { createApiClient } from "@/utils/supabase/route";
import { resolveEntityId } from "@/app/lib/entities";

export async function getServerClient(): Promise<SupabaseClient<Database>> {
  return createApiClient();
}

export async function getSessionOrThrow(
  supabase: SupabaseClient<Database>
) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Unauthorized");
  }
  return data.session;
}

export async function getUserOrThrow(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }
  return data.user;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonError(message: string, status = 500, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status, ...init });
}

export async function parseEntityId(
  supabase: SupabaseClient<Database>,
  params: Promise<{ id?: string }> | { id?: string }
) {
  const resolved = await Promise.resolve(params);
  const entityKey = resolved?.id;
  if (!entityKey) {
    throw new Error("Entity id is required");
  }
  return resolveEntityId(supabase, entityKey);
}
