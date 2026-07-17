"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "@/app/components/loading-spinner";
import type {
  EntityContactSummary,
  EntityContactsResponse,
} from "@/domain/entities/entity-contacts-dto";

type Props = {
  entityId: string;
  canManageContacts?: boolean;
};

type ContactDraft = {
  name: string;
  contact_role: string;
  email: string;
  phone: string;
  office_label: string;
  relationship_summary: string;
  notes: string;
  tags: string;
};

const EMPTY_DRAFT: ContactDraft = {
  name: "",
  contact_role: "",
  email: "",
  phone: "",
  office_label: "",
  relationship_summary: "",
  notes: "",
  tags: "",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatSourceLabel(contact: EntityContactSummary) {
  if (contact.is_manual) return "Manual";
  return contact.source_system.split("_").join(" ");
}

function toDraft(contact: EntityContactSummary): ContactDraft {
  return {
    name: contact.name ?? "",
    contact_role: contact.contact_role ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    office_label: contact.office_label ?? "",
    relationship_summary: contact.relationship_summary ?? "",
    notes: contact.notes ?? "",
    tags: contact.tags.join(", "),
  };
}

function cardSearchText(contact: EntityContactSummary) {
  return [
    contact.name ?? "",
    contact.contact_role,
    contact.email ?? "",
    contact.phone ?? "",
    contact.office_label ?? "",
    contact.relationship_summary ?? "",
    contact.notes ?? "",
    contact.tags.join(" "),
    contact.source_system,
  ]
    .join(" ")
    .toLowerCase();
}

function SourceBadge({ contact }: { contact: EntityContactSummary }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        contact.is_manual
          ? "bg-brand-primary-0 text-text-on-dark"
          : "bg-surface-page text-text-on-light"
      }`}
    >
      {formatSourceLabel(contact)}
    </span>
  );
}

function ContactEditor({
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  busy,
}: {
  draft: ContactDraft;
  onChange: (field: keyof ContactDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  submitLabel: string;
  busy: boolean;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Name</span>
          <input
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="Taylor Brooks"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Role</span>
          <input
            value={draft.contact_role}
            onChange={(event) => onChange("contact_role", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="Office manager"
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Email</span>
          <input
            value={draft.email}
            onChange={(event) => onChange("email", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="taylor@westphoto.com"
            type="email"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Phone</span>
          <input
            value={draft.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="(555) 123-4567"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Office</span>
          <input
            value={draft.office_label}
            onChange={(event) => onChange("office_label", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="North office"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-text-on-light">Tags</span>
          <input
            value={draft.tags}
            onChange={(event) => onChange("tags", event.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            placeholder="ap, payroll, approvals"
          />
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-text-on-light">
          Relationship summary
        </span>
        <textarea
          value={draft.relationship_summary}
          onChange={(event) =>
            onChange("relationship_summary", event.target.value)}
          className="min-h-24 w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
          placeholder="Main point of contact for monthly close questions and invoice follow-up."
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-text-on-light">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          className="min-h-28 w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
          placeholder="Met on-site. Prefers text before 9 AM. Handles payroll packet reviews."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center rounded-full bg-brand-primary-0 px-4 py-2 text-sm font-semibold text-text-on-dark transition hover:bg-brand-primary-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-border-subtle bg-surface-page px-4 py-2 text-sm font-semibold text-text-on-light transition hover:bg-surface-inset"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function EntityContactsTab({
  entityId,
  canManageContacts = false,
}: Props) {
  const [data, setData] = useState<EntityContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "imported">(
    "all",
  );
  const [createDraft, setCreateDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, ContactDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchContacts = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const res = await fetch(`/api/entities/${entityId}/contacts`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load contacts");
        }
        const json = (await res.json()) as EntityContactsResponse;
        setData(json);
        setEditDrafts(
          Object.fromEntries(
            (json.contacts ?? []).map((contact) => [
              contact.id,
              toDraft(contact),
            ]),
          ),
        );
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error";
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entityId],
  );

  useEffect(() => {
    void fetchContacts("initial");
  }, [fetchContacts]);

  const contacts = useMemo(() => data?.contacts ?? [], [data?.contacts]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const next = contacts.filter((contact) => {
      if (sourceFilter === "manual" && !contact.is_manual) return false;
      if (sourceFilter === "imported" && contact.is_manual) return false;
      if (!term) return true;
      return cardSearchText(contact).includes(term);
    });

    return [...next].sort((left, right) => {
      if (left.is_manual !== right.is_manual) {
        return left.is_manual ? -1 : 1;
      }
      return (
        new Date(right.last_seen_at).getTime() -
        new Date(left.last_seen_at).getTime()
      );
    });
  }, [contacts, search, sourceFilter]);

  const manualCount = useMemo(
    () => contacts.filter((contact) => contact.is_manual).length,
    [contacts],
  );

  const importedCount = contacts.length - manualCount;

  function updateCreateDraft(field: keyof ContactDraft, value: string) {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  }

  function updateEditDraft(contactId: string, field: keyof ContactDraft, value: string) {
    setEditDrafts((current) => ({
      ...current,
      [contactId]: {
        ...(current[contactId] ?? EMPTY_DRAFT),
        [field]: value,
      },
    }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageContacts) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create contact");
      }
      toast.success("Contact added");
      setCreateDraft(EMPTY_DRAFT);
      await fetchContacts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create contact";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave(contactId: string) {
    const draft = editDrafts[contactId];
    if (!draft) return;

    setSavingId(contactId);
    try {
      const res = await fetch(`/api/entities/${entityId}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contactId, ...draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update contact");
      }
      toast.success("Contact updated");
      setEditingId(null);
      await fetchContacts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update contact";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(contact: EntityContactSummary) {
    if (!contact.is_manual) return;
    const confirmed = window.confirm(
      `Delete ${contact.name ?? contact.email ?? "this contact"}?`,
    );
    if (!confirmed) return;

    setDeletingId(contact.id);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/contacts?contactId=${encodeURIComponent(contact.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete contact");
      }
      toast.success("Contact deleted");
      if (editingId === contact.id) {
        setEditingId(null);
      }
      await fetchContacts();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete contact";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-brand-primary-2">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-border-subtle bg-surface-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-text-on-light">
                Relationship Directory
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-brand-secondary-0 opacity-80">
                Track the people you meet at each office, what they own, and how
                they fit into bookkeeping operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-brand-secondary-0 opacity-80">
              <span className="rounded-full border border-border-subtle bg-surface-page px-3 py-1">
                {contacts.length} total
              </span>
              <span className="rounded-full border border-border-subtle bg-surface-page px-3 py-1">
                {manualCount} manual
              </span>
              <span className="rounded-full border border-border-subtle bg-surface-page px-3 py-1">
                {importedCount} sourced
              </span>
              {refreshing ? (
                <span className="rounded-full border border-border-subtle bg-surface-page px-3 py-1">
                  Refreshing...
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(14rem,18rem)_12rem]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-sm text-text-on-light placeholder:text-brand-secondary-0 focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
              placeholder="Search contacts, roles, offices, notes..."
            />
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
                  event.target.value as "all" | "manual" | "imported",
                )}
              className="rounded-xl border border-border-subtle bg-surface-page px-3 py-2.5 text-sm text-text-on-light focus:border-brand-accent-1 focus:outline-none focus:ring-2 focus:ring-brand-accent-1"
            >
              <option value="all">All sources</option>
              <option value="manual">Manual only</option>
              <option value="imported">Imported only</option>
            </select>
          </div>
        </div>
      </section>

      {canManageContacts ? (
        <section className="rounded-[24px] border border-border-subtle bg-surface-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text-on-light">
              Add Contact
            </h3>
            <p className="mt-1 text-sm text-brand-secondary-0 opacity-80">
              Create manual relationship records for the offices and people you
              work with regularly.
            </p>
          </div>
          <ContactEditor
            draft={createDraft}
            onChange={updateCreateDraft}
            onSubmit={handleCreate}
            submitLabel="Add contact"
            busy={submitting}
          />
        </section>
      ) : null}

      {filteredContacts.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredContacts.map((contact) => {
            const isEditing = editingId === contact.id;
            const draft = editDrafts[contact.id] ?? toDraft(contact);

            return (
              <article
                key={contact.id}
                className="rounded-[24px] border border-border-subtle bg-surface-card p-5 shadow-sm"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-text-on-light">
                          Edit contact
                        </div>
                        <div className="text-sm text-brand-secondary-0 opacity-80">
                          Manual records can be updated in place.
                        </div>
                      </div>
                      <SourceBadge contact={contact} />
                    </div>
                    <ContactEditor
                      draft={draft}
                      onChange={(field, value) =>
                        updateEditDraft(contact.id, field, value)}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSave(contact.id);
                      }}
                      onCancel={() => {
                        setEditDrafts((current) => ({
                          ...current,
                          [contact.id]: toDraft(contact),
                        }));
                        setEditingId(null);
                      }}
                      submitLabel="Save changes"
                      busy={savingId === contact.id}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-text-on-light">
                            {contact.name ?? contact.email ?? "Unnamed contact"}
                          </h3>
                          <span className="rounded-full bg-surface-nav px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-on-dark">
                            {contact.contact_role}
                          </span>
                          {contact.office_label ? (
                            <span className="rounded-full border border-border-subtle bg-surface-page px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-on-light">
                              {contact.office_label}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-secondary-0 opacity-80">
                          <SourceBadge contact={contact} />
                          <span>Last touched {formatDate(contact.last_seen_at)}</span>
                        </div>
                      </div>

                      {canManageContacts && contact.is_manual ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditDrafts((current) => ({
                                ...current,
                                [contact.id]: toDraft(contact),
                              }));
                              setEditingId(contact.id);
                            }}
                            className="inline-flex items-center rounded-full border border-border-subtle bg-surface-page px-3 py-1.5 text-sm font-semibold text-text-on-light transition hover:bg-surface-inset"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(contact)}
                            disabled={deletingId === contact.id}
                            className="inline-flex items-center rounded-full border border-brand-primary-2 px-3 py-1.5 text-sm font-semibold text-brand-primary-2 transition hover:bg-brand-primary-2 hover:text-text-on-dark disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === contact.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-3 text-sm text-text-on-light md:grid-cols-2">
                      <div className="rounded-2xl bg-surface-page p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary-0 opacity-70">
                          Email
                        </div>
                        <div className="mt-1 break-all">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-brand-primary-0 underline-offset-2 hover:underline"
                            >
                              {contact.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-surface-page p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary-0 opacity-70">
                          Phone
                        </div>
                        <div className="mt-1">
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-brand-primary-0 underline-offset-2 hover:underline"
                            >
                              {contact.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>

                    {contact.relationship_summary ? (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary-0 opacity-70">
                          Relationship
                        </div>
                        <p className="mt-1 text-sm leading-6 text-text-on-light">
                          {contact.relationship_summary}
                        </p>
                      </div>
                    ) : null}

                    {contact.notes ? (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary-0 opacity-70">
                          Notes
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-on-light">
                          {contact.notes}
                        </p>
                      </div>
                    ) : null}

                    {contact.tags.length ? (
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <span
                            key={`${contact.id}-${tag}`}
                            className="rounded-full bg-surface-nav px-2.5 py-1 text-xs font-semibold text-text-on-dark"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {!contact.is_manual && contact.source_url ? (
                      <div className="text-sm text-brand-secondary-0 opacity-80">
                        Imported from{" "}
                        <a
                          href={contact.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary-0 underline-offset-2 hover:underline"
                        >
                          source record
                        </a>
                        .
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-border-subtle bg-surface-card p-8 text-sm text-brand-secondary-0 shadow-sm">
          {contacts.length === 0
            ? canManageContacts
              ? "No contacts yet. Add the people you work with at each office so this workspace becomes your relationship directory."
              : "No contacts are available for this entity yet."
            : "No contacts match the current search and source filters."}
        </div>
      )}
    </div>
  );
}
