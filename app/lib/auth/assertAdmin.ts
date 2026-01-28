import "server-only";

import { createClient } from "@/utils/supabase/server";
import { isPlatformAdminServer } from "@/app/lib/auth/platformAdmin";

export type AdminAccess = {
  userId: string;
  email: string | null;
  method: "allowlist" | "role";
};

const splitAllowlist = (value: string | null | undefined): Set<string> => {
  if (!value) return new Set();
  return new Set(
    value
      .split(/[\s,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
};

export async function assertAdmin(): Promise<AdminAccess> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const email = user.email?.toLowerCase() ?? null;
  const userId = user.id?.toLowerCase() ?? "";
  const allowlist = splitAllowlist(
    process.env.ADMIN_ALLOWLIST ?? process.env.NEXT_PUBLIC_ADMIN_ALLOWLIST,
  );

  if (allowlist.has("*") || allowlist.has("all")) {
    return { userId, email, method: "allowlist" };
  }

  if ((email && allowlist.has(email)) || allowlist.has(userId)) {
    return { userId, email, method: "allowlist" };
  }

  const isAdmin = await isPlatformAdminServer();
  if (isAdmin) {
    return { userId, email, method: "role" };
  }

  throw new Error("Unauthorized");
}
