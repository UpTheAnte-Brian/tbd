"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import { SmallAvatar } from "@/app/components/ui/avatar";
import { toast } from "react-hot-toast";
import type { EntityUser } from "@/domain/entities/types";
import type { EntityType, EntityUserRole } from "@/domain/entities/types";

interface Props {
  entityId: string;
  entityType: EntityType | null;
}

type InviteResponse = {
  inviteId: string;
  inviteUrl: string;
  delivery: "sent" | "manual";
};

export default function EntityUsersTab({ entityId, entityType }: Props) {
  const [users, setUsers] = useState<EntityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<EntityUserRole>("viewer");
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    inviteUrl: string;
    delivery: "sent" | "manual";
  } | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<EntityUserRole>("viewer");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const DEBOUNCE_MS = 250;
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/entities/${entityId}/users`);
      if (!res.ok) throw new Error("Failed to fetch entity users");
      const json = await res.json();
      setUsers(json ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load users";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function addUser() {
    try {
      setAdding(true);
      if (users.some((u) => u.user_id === newUserId)) {
        toast.error("User is already assigned to this entity");
        setAdding(false);
        return;
      }
      const res = await fetch(`/api/entities/${entityId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          role: newRole,
        }),
      });

      if (!res.ok) throw new Error("Failed to add user");
      toast.success("User added");
      setNewUserId("");
      setNewRole("viewer");
      setSearchText("");
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add user";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function inviteUser() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Email is required");
      return;
    }

    try {
      setInviting(true);
      const res = await fetch(`/api/entities/${entityId}/people/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          desiredRole: inviteRole,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "Failed to invite user");
      }

      const invite = body as InviteResponse;
      setInviteResult({
        email,
        inviteUrl: invite.inviteUrl,
        delivery: invite.delivery,
      });
      setInviteEmail("");
      setInviteRole("viewer");
      toast.success(
        invite.delivery === "sent"
          ? "Invite email sent"
          : "Invite link ready to share",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to invite user";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  }

  async function updateUser(userId: string, role: string) {
    try {
      const res = await fetch(`/api/entities/${entityId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) throw new Error("Failed to update user");
      toast.success("Updated");
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    }
  }

  async function searchProfiles(q: string) {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setSearchResults(json);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function deleteUser(userId: string) {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/users?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Failed to delete user");
      toast.success("Removed");
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-on-light">
        User Assignments
      </h2>
      <p className="text-sm text-brand-secondary-0 opacity-70">
        Governance roles are managed separately. Use this list for operational
        access (admin, editor, viewer, employee). Invited users appear here
        after they accept.
      </p>

      <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-on-light">
          Invite User
        </h3>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-on-light">
              Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-inset p-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
              placeholder="name@domain.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-on-light">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as EntityUserRole)}
              className="w-full rounded-lg border border-border-subtle bg-surface-inset p-2.5 text-text-on-light focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <button
            onClick={inviteUser}
            disabled={inviting || !inviteEmail.trim()}
            className="rounded-lg bg-surface-accent px-4 py-2 font-semibold text-text-on-dark transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-brand-secondary-0"
          >
            {inviting ? <LoadingSpinner /> : "Invite User"}
          </button>
        </div>

        <p className="text-xs text-brand-secondary-0 opacity-70">
          {entityType === "nonprofit" || entityType === "district"
            ? "Use People for IRS-derived invite candidates. Use this form for direct operational access invites."
            : "Use this form when the person is not already a platform user."}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-on-light">
          Add Existing User
        </h3>

        <div className="relative">
          <input
            value={searchText}
            onChange={(e) => {
              const value = e.target.value;
              setSearchText(value);

              if (debounceTimer) clearTimeout(debounceTimer);

              const timer = setTimeout(() => {
                searchProfiles(value);
              }, DEBOUNCE_MS);

              setDebounceTimer(timer);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (!dropdownOpen || searchResults.length === 0) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev < searchResults.length - 1 ? prev + 1 : 0,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev > 0 ? prev - 1 : searchResults.length - 1,
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                const sel = searchResults[highlightIndex];
                if (sel) {
                  setNewUserId(sel.id);
                  setSearchText(sel.full_name ?? "");
                  setSearchResults([]);
                  setDropdownOpen(false);
                  setHighlightIndex(-1);
                }
              } else if (e.key === "Escape") {
                setDropdownOpen(false);
                setHighlightIndex(-1);
              }
            }}
            className="w-full rounded-lg border border-border-subtle bg-surface-inset p-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="Search users by name..."
          />

          {searchLoading && (
            <div className="absolute right-3 top-2.5">
              <LoadingSpinner />
            </div>
          )}

          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-subtle bg-surface-card shadow-lg">
              {searchResults.map((u, idx) => {
                const alreadyAssigned = users.some(
                  (user) => user.user_id === u.id,
                );
                const active = idx === highlightIndex;
                return (
                  <div
                    key={u.id}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                      active
                        ? "bg-surface-nav text-text-on-dark"
                        : "text-text-on-light hover:bg-surface-inset"
                    }`}
                    onClick={() => {
                      setNewUserId(u.id);
                      setSearchText(u.full_name ?? "");
                      setSearchResults([]);
                      setDropdownOpen(false);
                      setHighlightIndex(-1);
                    }}
                  >
                    <SmallAvatar
                      name={u.full_name ?? null}
                      url={u.avatar_url ?? null}
                      size={32}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{u.full_name ?? u.id}</p>
                    </div>
                    {alreadyAssigned && (
                      <span className="rounded bg-surface-nav px-2 py-1 text-xs text-text-on-dark">
                        Assigned
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-on-light">
            Role
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as EntityUserRole)}
            className="w-full rounded-lg border border-border-subtle bg-surface-inset p-2.5 text-text-on-light focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <button
          onClick={addUser}
          disabled={adding || !newUserId}
          className="rounded-lg bg-surface-accent px-4 py-2 font-semibold text-text-on-dark transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-brand-secondary-0"
        >
          {adding ? <LoadingSpinner /> : "Add Existing User"}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <p className="text-brand-secondary-0 opacity-70">
            No users assigned.
          </p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card p-4 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <SmallAvatar
                    name={u.profile?.full_name ?? null}
                    url={u.profile?.avatar_url ?? null}
                    size={32}
                  />
                  <div>
                    <p className="font-semibold text-text-on-light">
                      {u.profile?.full_name ?? u.user_id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteUser(u.user_id)}
                  className="text-brand-primary-2 hover:text-brand-primary-0"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-on-light">
                  Role
                </label>
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.user_id, e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-inset p-2.5 text-text-on-light focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {inviteResult ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-gray-900 shadow-lg">
            <h3 className="text-lg font-semibold">
              {inviteResult.delivery === "sent" ? "Invite Sent" : "Invite Link"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {inviteResult.delivery === "sent"
                ? `An invite email was sent to ${inviteResult.email}. Copy the link below if you want to resend it manually.`
                : `Email delivery is not configured. Send this link manually to ${inviteResult.email}.`}
            </p>
            <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm">
              {inviteResult.inviteUrl}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteResult.inviteUrl);
                    toast.success("Copied invite link");
                  } catch {
                    toast.error("Failed to copy invite link");
                  }
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => setInviteResult(null)}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
