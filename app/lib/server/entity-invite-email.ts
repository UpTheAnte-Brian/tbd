import "server-only";

import { isMailConfigured, sendMail } from "@/app/lib/mail";
import type { EntityUserRole } from "@/domain/entities/types";

function formatExpiry(value: string | null) {
  if (!value) return "soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function canSendEntityInviteEmails() {
  return isMailConfigured();
}

export async function sendEntityInviteEmail(params: {
  to: string;
  entityName: string | null;
  inviterName: string;
  desiredRole: EntityUserRole;
  inviteUrl: string;
  expiresAt: string | null;
}) {
  const entityLabel = params.entityName?.trim() || "a Community Pockets workspace";
  const roleLabel = params.desiredRole.replace("_", " ");
  const expiryLabel = formatExpiry(params.expiresAt);
  const subject = `You're invited to join ${entityLabel}`;

  const text = [
    `${params.inviterName} invited you to join ${entityLabel} on Community Pockets as a ${roleLabel}.`,
    "",
    `Accept the invite: ${params.inviteUrl}`,
    "",
    `This invite expires on ${expiryLabel}.`,
    "If you already have an account, sign in with the invited email address before accepting.",
  ].join("\n");

  const html = `
    <p>${params.inviterName} invited you to join <strong>${entityLabel}</strong> on Community Pockets as a <strong>${roleLabel}</strong>.</p>
    <p><a href="${params.inviteUrl}">Accept your invite</a></p>
    <p>This invite expires on ${expiryLabel}.</p>
    <p>If you already have an account, sign in with the invited email address before accepting.</p>
  `;

  await sendMail({
    to: params.to,
    subject,
    text,
    html,
  });
}
