import { getEntityUserInvitePreview } from "@/domain/entities/entity-people-dto";
import type { EntityUserInvitePreview } from "@/domain/entities/entity-people-dto";
import { createClient } from "@/utils/supabase/server";
import InvitePageClient from "./InvitePageClient";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  let preview: EntityUserInvitePreview | null = null;
  let initialError: string | null = null;

  if (!token) {
    initialError = "Invite link is missing a token.";
  } else {
    try {
      preview = await getEntityUserInvitePreview({ token });
    } catch (error) {
      initialError = error instanceof Error
        ? error.message
        : "Failed to load invite.";
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InvitePageClient
      token={token}
      preview={preview}
      initialError={initialError}
      isAuthenticated={Boolean(user)}
      userEmail={user?.email ?? null}
    />
  );
}
