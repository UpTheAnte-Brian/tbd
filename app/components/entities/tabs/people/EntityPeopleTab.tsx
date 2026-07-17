"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/app/components/loading-spinner";
import { SmallAvatar } from "@/app/components/ui/avatar";
import type { EntityUserRole } from "@/domain/entities/types";
import type { EntityType } from "@/domain/entities/types";
import { useUser } from "@/app/hooks/useUser";

type PersonRole = {
  id: string;
  entity_id: string;
  display_name: string;
  role_title: string | null;
  is_officer: boolean | null;
  tax_year: number | null;
  reportable_compensation: number | null;
  other_compensation: number | null;
  email: string | null;
  phone: string | null;
  linked_user_id: string | null;
  invite_status: string;
  invited_at: string | null;
  joined_at: string | null;
  access_role: EntityUserRole | null;
  is_primary_admin: boolean | null;
  created_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  entity_id: string;
  entity_person_role_id: string | null;
  email: string;
  desired_role: EntityUserRole;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string;
  invited_by: string;
};

type PeopleResponse = {
  people: PersonRole[];
  invites: InviteRow[];
  entity_user_count: number;
};

type LinkModalState = {
  open: boolean;
  person: PersonRole | null;
};

const ROLE_OPTIONS: EntityUserRole[] = [
  "admin",
  "editor",
  "viewer",
  "employee",
];

function formatInviteStatus(value: string | null | undefined) {
  switch (value) {
    case "ready":
      return "Ready";
    case "invited":
      return "Invited";
    case "joined":
      return "Joined";
    default:
      return "None";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

function formatRoleTitle(person: PersonRole) {
  if (person.role_title) return person.role_title;
  if (person.is_officer) return "Officer";
  return "Person";
}

function formatAccessRole(role: EntityUserRole | null | undefined) {
  if (!role) return "—";
  return role.replace("_", " ");
}

interface Props {
  entityId: string;
  entityType: EntityType | null;
}

export default function EntityPeopleTab({ entityId, entityType }: Props) {
  const { user } = useUser();
  const isPlatformAdmin = user?.global_role === "admin";
  const peopleSupported =
    entityType === "nonprofit" || entityType === "district";
  const [people, setPeople] = useState<PersonRole[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [entityUserCount, setEntityUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [officerFilter, setOfficerFilter] = useState("all");
  const [editValues, setEditValues] = useState<
    Record<string, { email: string; phone: string }>
  >({});
  const [inviteRoles, setInviteRoles] = useState<Record<string, EntityUserRole>>(
    {},
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [tokenModal, setTokenModal] = useState<{
    token: string;
    email: string;
  } | null>(null);

  const [linkModal, setLinkModal] = useState<LinkModalState>({
    open: false,
    person: null,
  });
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkRole, setLinkRole] = useState<EntityUserRole>("viewer");
  const [linkUserId, setLinkUserId] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkHighlightIndex, setLinkHighlightIndex] = useState(-1);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const [bootstrapSearch, setBootstrapSearch] = useState("");
  const [bootstrapResults, setBootstrapResults] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapUserId, setBootstrapUserId] = useState<string | null>(null);
  const [bootstrapHighlightIndex, setBootstrapHighlightIndex] = useState(-1);
  const [bootstrapDropdownOpen, setBootstrapDropdownOpen] = useState(false);
  const [bootstrapSubmitting, setBootstrapSubmitting] = useState(false);

  const invitesByRoleId = useMemo(() => {
    const map = new Map<string, InviteRow[]>();
    for (const invite of invites) {
      if (!invite.entity_person_role_id) continue;
      const list = map.get(invite.entity_person_role_id) ?? [];
      list.push(invite);
      map.set(invite.entity_person_role_id, list);
    }
    return map;
  }, [invites]);

  const showInviteHelper = useMemo(
    () => (people ?? []).some((person) => !person.access_role),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (people ?? []).filter((person) => {
      if (statusFilter !== "all" && person.invite_status !== statusFilter) {
        return false;
      }
      if (officerFilter === "officer" && !person.is_officer) {
        return false;
      }
      if (officerFilter === "non_officer" && person.is_officer) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        person.display_name,
        person.role_title ?? "",
        person.email ?? "",
        person.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [people, officerFilter, search, statusFilter]);

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/entities/${entityId}/people`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load people");
      }
      const data = (await res.json()) as PeopleResponse;
      setPeople(data.people ?? []);
      setInvites(data.invites ?? []);
      setEntityUserCount(data.entity_user_count ?? 0);

      const edits: Record<string, { email: string; phone: string }> = {};
      const roleSelections: Record<string, EntityUserRole> = {};
      for (const person of data.people ?? []) {
        edits[person.id] = {
          email: person.email ?? "",
          phone: person.phone ?? "",
        };
        roleSelections[person.id] = "viewer";
      }
      setEditValues(edits);
      setInviteRoles((prev) => ({ ...roleSelections, ...prev }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    if (!peopleSupported) {
      setLoading(false);
      return;
    }
    fetchPeople();
  }, [fetchPeople, peopleSupported]);

  if (!peopleSupported) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-card p-4 text-sm text-brand-secondary-0">
        People is only available for nonprofits and districts.
      </div>
    );
  }

  async function savePerson(personId: string) {
    const values = editValues[personId];
    if (!values) return;
    setSavingId(personId);
    try {
      const res = await fetch(`/api/entities/${entityId}/people`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personId,
          email: values.email,
          phone: values.phone,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save person");
      }
      const payload = (await res.json()) as { person: PersonRole };
      setPeople((prev) =>
        prev.map((row) => (row.id === personId ? payload.person : row)),
      );
      toast.success("Saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  async function sendInvite(person: PersonRole) {
    if (!person.email) {
      toast.error("Add an email before inviting.");
      return;
    }
    setInviteId(person.id);
    try {
      const desiredRole = inviteRoles[person.id] ?? "viewer";
      const res = await fetch(`/api/entities/${entityId}/people/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: person.email,
          desiredRole,
          entityPersonRoleId: person.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Invite failed");
      }
      const payload = (await res.json()) as { rawToken: string };
      setTokenModal({ token: payload.rawToken, email: person.email });
      toast.success("Invite created");
      await fetchPeople();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invite failed";
      toast.error(message);
    } finally {
      setInviteId(null);
    }
  }

  async function searchProfiles(query: string) {
    if (!query || query.length < 2) {
      setLinkResults([]);
      return;
    }
    setLinkLoading(true);
    try {
      const res = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }[];
      setLinkResults(data ?? []);
    } catch {
      setLinkResults([]);
    } finally {
      setLinkLoading(false);
    }
  }

  async function searchBootstrapProfiles(query: string) {
    if (!query || query.length < 2) {
      setBootstrapResults([]);
      return;
    }
    setBootstrapLoading(true);
    try {
      const res = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }[];
      setBootstrapResults(data ?? []);
    } catch {
      setBootstrapResults([]);
    } finally {
      setBootstrapLoading(false);
    }
  }

  async function bootstrapAdmin() {
    if (!bootstrapUserId) {
      toast.error("Select a user to bootstrap.");
      return;
    }
    setBootstrapSubmitting(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/users/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: bootstrapUserId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Bootstrap failed");
      }
      toast.success("Initial admin assigned");
      setBootstrapUserId(null);
      setBootstrapSearch("");
      setBootstrapResults([]);
      setBootstrapDropdownOpen(false);
      setBootstrapHighlightIndex(-1);
      await fetchPeople();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bootstrap failed";
      toast.error(message);
    } finally {
      setBootstrapSubmitting(false);
    }
  }

  async function linkUser() {
    if (!linkModal.person || !linkUserId) {
      toast.error("Select a user to link.");
      return;
    }
    setLinkSubmitting(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: linkUserId,
          role: linkRole,
          status: "active",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to link user");
      }

      const patchRes = await fetch(`/api/entities/${entityId}/people`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: linkModal.person.id,
          linkedUserId: linkUserId,
        }),
      });
      if (!patchRes.ok) {
        const body = await patchRes.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to update person role");
      }
      toast.success("User linked");
      setLinkModal({ open: false, person: null });
      setLinkUserId(null);
      setLinkSearch("");
      setLinkResults([]);
      setLinkDropdownOpen(false);
      setLinkHighlightIndex(-1);
      await fetchPeople();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Link failed";
      toast.error(message);
    } finally {
      setLinkSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {isPlatformAdmin &&
      entityType === "nonprofit" &&
      entityUserCount === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col gap-2">
            <div className="font-semibold">Bootstrap access</div>
            <p className="text-xs text-amber-800">
              Assign the first admin for this nonprofit. After this, use
              invites.
            </p>
            <div className="relative">
              <input
                value={bootstrapSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setBootstrapSearch(value);
                  if (debounceTimer) clearTimeout(debounceTimer);
                  const timer = setTimeout(() => {
                    searchBootstrapProfiles(value);
                  }, 250);
                  setDebounceTimer(timer);
                }}
                onFocus={() => setBootstrapDropdownOpen(true)}
                onKeyDown={(event) => {
                  if (!bootstrapDropdownOpen || bootstrapResults.length === 0) {
                    return;
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setBootstrapHighlightIndex((prev) =>
                      prev < bootstrapResults.length - 1 ? prev + 1 : 0,
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setBootstrapHighlightIndex((prev) =>
                      prev > 0 ? prev - 1 : bootstrapResults.length - 1,
                    );
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const selected = bootstrapResults[bootstrapHighlightIndex];
                    if (selected) {
                      setBootstrapUserId(selected.id);
                      setBootstrapSearch(selected.full_name ?? selected.id);
                      setBootstrapResults([]);
                      setBootstrapDropdownOpen(false);
                      setBootstrapHighlightIndex(-1);
                    }
                  } else if (event.key === "Escape") {
                    setBootstrapDropdownOpen(false);
                    setBootstrapHighlightIndex(-1);
                  }
                }}
                className="w-full rounded border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Search platform users..."
              />
              {bootstrapLoading ? (
                <div className="absolute right-3 top-2.5">
                  <LoadingSpinner />
                </div>
              ) : null}
              {bootstrapDropdownOpen && bootstrapResults.length > 0 ? (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded border border-amber-200 bg-white">
                  {bootstrapResults.map((candidate, idx) => (
                    <div
                      key={candidate.id}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                        idx === bootstrapHighlightIndex
                          ? "bg-amber-100"
                          : "hover:bg-amber-100"
                      }`}
                      onClick={() => {
                        setBootstrapUserId(candidate.id);
                        setBootstrapSearch(
                          candidate.full_name ?? candidate.id,
                        );
                        setBootstrapResults([]);
                        setBootstrapDropdownOpen(false);
                        setBootstrapHighlightIndex(-1);
                      }}
                    >
                      <SmallAvatar
                        name={candidate.full_name ?? null}
                        url={candidate.avatar_url ?? null}
                        size={28}
                      />
                      <div className="text-sm">
                        {candidate.full_name ?? candidate.id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end">
              <button
                onClick={bootstrapAdmin}
                disabled={bootstrapSubmitting}
                className="rounded border border-brand-secondary-2 bg-brand-secondary-2 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-secondary-0 disabled:opacity-60"
              >
                {bootstrapSubmitting ? "Assigning..." : "Make initial admin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">People</h2>
          <p className="text-sm text-brand-secondary-0 opacity-70">
            Manage IRS-derived people, contact info, and access invites.
          </p>
          {showInviteHelper ? (
            <p className="text-xs text-brand-secondary-0 opacity-70">
              Invite roles only apply after an invite is accepted.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people..."
            className="w-56 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0 placeholder:text-brand-primary-1"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0"
          >
            <option value="all">All statuses</option>
            <option value="none">None</option>
            <option value="ready">Ready</option>
            <option value="invited">Invited</option>
            <option value="joined">Joined</option>
          </select>
          <select
            value={officerFilter}
            onChange={(event) => setOfficerFilter(event.target.value)}
            className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-3 py-2 text-sm text-brand-secondary-0"
          >
            <option value="all">All roles</option>
            <option value="officer">Officer only</option>
            <option value="non_officer">Non-officer</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-brand-secondary-1 bg-brand-secondary-2">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-brand-secondary-1 text-xs uppercase tracking-wide text-brand-secondary-0">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Person role</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Invite status</th>
              <th className="px-3 py-3">Linked User</th>
              <th className="px-3 py-3">Access</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-secondary-1">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : filteredPeople.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center">
                  No people found.
                </td>
              </tr>
            ) : (
              filteredPeople.map((person) => {
                const inviteStatus = formatInviteStatus(person.invite_status);
                const inviteList = invitesByRoleId.get(person.id) ?? [];
                const latestInvite = inviteList[0];
                const hasAccess = Boolean(person.access_role);
                const canInvite = !hasAccess && Boolean(person.email);
                const showInviteControls = !hasAccess;
                const edit = editValues[person.id] ?? {
                  email: person.email ?? "",
                  phone: person.phone ?? "",
                };
                return (
                  <tr key={person.id} className="hover:bg-brand-secondary-1/50">
                    <td className="px-3 py-3 font-semibold">
                      {person.display_name}
                      {person.is_officer ? (
                        <span className="ml-2 rounded bg-brand-primary-0 px-2 py-0.5 text-xs text-brand-secondary-2">
                          Officer
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{formatRoleTitle(person)}</td>
                    <td className="px-3 py-3">
                      <input
                        value={edit.email}
                        onChange={(event) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [person.id]: {
                              ...prev[person.id],
                              email: event.target.value,
                            },
                          }))
                        }
                        className="w-56 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-sm text-brand-secondary-0"
                        placeholder="email@domain.com"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={edit.phone}
                        onChange={(event) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [person.id]: {
                              ...prev[person.id],
                              phone: event.target.value,
                            },
                          }))
                        }
                        className="w-36 rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-sm text-brand-secondary-0"
                        placeholder="(555) 123-4567"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-brand-secondary-0">
                        {inviteStatus}
                      </div>
                      {latestInvite ? (
                        <div className="text-xs text-brand-secondary-0 opacity-70">
                          {latestInvite.status} ·{" "}
                          {formatDate(latestInvite.invited_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {person.linked_user_id ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                          Linked
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {hasAccess ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-brand-secondary-1 px-2 py-1 text-xs text-brand-primary-1">
                            {formatAccessRole(person.access_role)}
                          </span>
                          {person.is_primary_admin ? (
                            <span className="rounded border border-brand-primary-0 px-2 py-1 text-xs text-brand-primary-0">
                              Primary
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-brand-secondary-0">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => savePerson(person.id)}
                          disabled={savingId === person.id}
                          className="rounded bg-brand-primary-0 px-3 py-1 text-xs text-brand-secondary-2 hover:bg-brand-primary-2 disabled:bg-brand-secondary-1 disabled:text-brand-secondary-0"
                        >
                          {savingId === person.id ? "Saving..." : "Save contact"}
                        </button>
                        {showInviteControls ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={inviteRoles[person.id] ?? "viewer"}
                              onChange={(event) =>
                                setInviteRoles((prev) => ({
                                  ...prev,
                                  [person.id]:
                                    event.target.value as EntityUserRole,
                                }))
                              }
                              disabled={!person.email}
                              title="Invite role (access granted only after invite accepted)"
                              className="rounded border border-brand-secondary-1 bg-brand-secondary-2 px-2 py-1 text-xs text-brand-secondary-0"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => sendInvite(person)}
                              disabled={inviteId === person.id || !canInvite}
                              className="rounded border border-brand-primary-0 px-3 py-1 text-xs text-brand-primary-0 hover:bg-brand-primary-0 hover:text-brand-secondary-2 disabled:border-brand-secondary-1 disabled:text-brand-secondary-0"
                            >
                              {inviteId === person.id ? "Inviting..." : "Invite"}
                            </button>
                            {!person.email ? (
                              <span className="text-[11px] text-brand-secondary-0">
                                Email required to invite
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <button
                          onClick={() => {
                            setLinkModal({ open: true, person: person });
                            setLinkSearch("");
                            setLinkResults([]);
                            setLinkUserId(null);
                            setLinkDropdownOpen(false);
                            setLinkHighlightIndex(-1);
                          }}
                          className="rounded border border-brand-secondary-1 px-3 py-1 text-xs text-brand-secondary-0 hover:bg-brand-secondary-1"
                        >
                          Link user
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded border border-brand-secondary-1 bg-brand-secondary-2 p-4">
        <h3 className="text-sm font-semibold">Active Invites</h3>
        {invites.length === 0 ? (
          <p className="mt-2 text-sm text-brand-secondary-0 opacity-70">
            No invites sent yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {invites.slice(0, 6).map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand-secondary-1 bg-brand-secondary-1 px-3 py-2"
              >
                <div>
                  <div className="font-semibold">{invite.email}</div>
                  <div className="text-xs text-brand-secondary-0 opacity-70">
                    {invite.desired_role} · {invite.status}
                  </div>
                </div>
                <div className="text-xs text-brand-secondary-0 opacity-70">
                  Expires {formatDate(invite.expires_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tokenModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-gray-900 shadow-lg">
            <h3 className="text-lg font-semibold">Invite Token</h3>
            <p className="mt-2 text-sm text-gray-600">
              Share this token with {tokenModal.email}. This is a dev-only
              display.
            </p>
            <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm">
              {tokenModal.token}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tokenModal.token);
                    toast.success("Copied token");
                  } catch {
                    toast.error("Failed to copy token");
                  }
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
              >
                Copy
              </button>
              <button
                onClick={() => setTokenModal(null)}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {linkModal.open && linkModal.person ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 text-gray-900 shadow-lg">
            <h3 className="text-lg font-semibold">Link User</h3>
            <p className="mt-2 text-sm text-gray-600">
              Link an existing user to {linkModal.person.display_name}.
            </p>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <input
                  value={linkSearch}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLinkSearch(value);
                    if (debounceTimer) clearTimeout(debounceTimer);
                    const timer = setTimeout(() => {
                      searchProfiles(value);
                    }, 250);
                    setDebounceTimer(timer);
                  }}
                  onFocus={() => setLinkDropdownOpen(true)}
                  onKeyDown={(event) => {
                    if (!linkDropdownOpen || linkResults.length === 0) return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setLinkHighlightIndex((prev) =>
                        prev < linkResults.length - 1 ? prev + 1 : 0,
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setLinkHighlightIndex((prev) =>
                        prev > 0 ? prev - 1 : linkResults.length - 1,
                      );
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const selected = linkResults[linkHighlightIndex];
                      if (selected) {
                        setLinkUserId(selected.id);
                        setLinkSearch(selected.full_name ?? selected.id);
                        setLinkResults([]);
                        setLinkDropdownOpen(false);
                        setLinkHighlightIndex(-1);
                      }
                    } else if (event.key === "Escape") {
                      setLinkDropdownOpen(false);
                      setLinkHighlightIndex(-1);
                    }
                  }}
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="Search users by name or email..."
                />
                {linkLoading ? (
                  <div className="absolute right-3 top-2.5">
                    <LoadingSpinner />
                  </div>
                ) : null}
                {linkDropdownOpen && linkResults.length > 0 ? (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded border border-gray-200 bg-white">
                    {linkResults.map((user, idx) => (
                      <div
                        key={user.id}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                          idx === linkHighlightIndex
                            ? "bg-gray-100"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => {
                          setLinkUserId(user.id);
                          setLinkSearch(user.full_name ?? user.id);
                          setLinkResults([]);
                          setLinkDropdownOpen(false);
                          setLinkHighlightIndex(-1);
                        }}
                      >
                        <SmallAvatar
                          name={user.full_name ?? null}
                          url={user.avatar_url ?? null}
                          size={28}
                        />
                        <div className="text-sm">
                          {user.full_name ?? user.id}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Assign role
                </label>
                <select
                  value={linkRole}
                  onChange={(event) =>
                    setLinkRole(event.target.value as EntityUserRole)
                  }
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setLinkModal({ open: false, person: null });
                  setLinkUserId(null);
                  setLinkSearch("");
                  setLinkResults([]);
                  setLinkDropdownOpen(false);
                  setLinkHighlightIndex(-1);
                }}
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={linkUser}
                disabled={linkSubmitting}
                className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {linkSubmitting ? "Linking..." : "Link user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
