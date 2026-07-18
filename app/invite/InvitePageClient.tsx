"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntityUserInvitePreview } from "@/domain/entities/entity-people-dto";

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  token: string;
  preview: EntityUserInvitePreview | null;
  initialError: string | null;
  isAuthenticated: boolean;
  userEmail: string | null;
}

export default function InvitePageClient({
  token,
  preview,
  initialError,
  isAuthenticated,
  userEmail,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  const redirectPath = `/invite?token=${encodeURIComponent(token)}`;
  const inviteeEmail = preview?.email?.toLowerCase() ?? null;
  const signedInEmail = userEmail?.toLowerCase() ?? null;
  const emailMismatch = Boolean(
    inviteeEmail && signedInEmail && inviteeEmail !== signedInEmail,
  );

  async function acceptInvite() {
    if (!token) {
      setError("Invite link is missing a token.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/entity-invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to accept invite");
      }

      window.location.href = `/entities/${body.entityId}`;
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Failed to accept invite",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const status = preview?.status ?? "invalid";
  const expiresLabel = formatDate(preview?.expiresAt ?? null);
  const entityLabel = preview?.entityName?.trim() || "Community Pockets";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-white to-gray-100 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-brand-secondary-2 bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent-1">
          Community Pockets
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-brand-secondary-1">
          Workspace invite
        </h1>

        {preview ? (
          <div className="mt-6 rounded-2xl border border-brand-secondary-2 bg-brand-secondary-2/40 p-5">
            <p className="text-sm text-brand-secondary-0">
              You&apos;ve been invited to join
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-secondary-1">
              {entityLabel}
            </p>
            <div className="mt-4 space-y-2 text-sm text-brand-secondary-0">
              <p>
                Invitee: <span className="font-medium text-brand-secondary-1">{preview.email}</span>
              </p>
              <p>
                Role: <span className="font-medium capitalize text-brand-secondary-1">{preview.desiredRole}</span>
              </p>
              {expiresLabel ? (
                <p>
                  Expires: <span className="font-medium text-brand-secondary-1">{expiresLabel}</span>
                </p>
              ) : null}
              <p>
                Status: <span className="font-medium capitalize text-brand-secondary-1">{status}</span>
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!preview ? null : status === "expired" ? (
          <p className="mt-6 text-sm text-brand-secondary-0">
            This invite has expired. Ask the workspace admin to send a new one.
          </p>
        ) : status === "accepted" ? (
          <p className="mt-6 text-sm text-brand-secondary-0">
            This invite has already been accepted.
          </p>
        ) : !isAuthenticated ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-brand-secondary-0">
              Sign in or create an account with <span className="font-medium text-brand-secondary-1">{preview.email}</span> to accept this invite.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/auth/sign-in?redirect=${encodeURIComponent(redirectPath)}`}
                className="inline-flex items-center justify-center rounded-xl bg-brand-primary-0 px-4 py-3 font-medium text-white transition hover:bg-brand-primary-2"
              >
                Sign in
              </Link>
              <Link
                href={`/auth/sign-up?redirect=${encodeURIComponent(redirectPath)}`}
                className="inline-flex items-center justify-center rounded-xl border border-brand-secondary-2 px-4 py-3 font-medium text-brand-secondary-1 transition hover:bg-brand-secondary-2"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : emailMismatch ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-brand-secondary-0">
              You&apos;re signed in as <span className="font-medium text-brand-secondary-1">{userEmail}</span>, but this invite is for <span className="font-medium text-brand-secondary-1">{preview.email}</span>.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signout"
                className="inline-flex items-center justify-center rounded-xl bg-brand-primary-0 px-4 py-3 font-medium text-white transition hover:bg-brand-primary-2"
              >
                Sign out
              </Link>
              <Link
                href={`/auth/sign-in?redirect=${encodeURIComponent(redirectPath)}`}
                className="inline-flex items-center justify-center rounded-xl border border-brand-secondary-2 px-4 py-3 font-medium text-brand-secondary-1 transition hover:bg-brand-secondary-2"
              >
                Use a different account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-brand-secondary-0">
              You&apos;re signed in as <span className="font-medium text-brand-secondary-1">{userEmail}</span>.
            </p>
            <button
              type="button"
              onClick={acceptInvite}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-brand-primary-0 px-4 py-3 font-medium text-white transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Accepting..." : "Accept invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
