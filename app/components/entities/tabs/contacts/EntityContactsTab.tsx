"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import type {
  EntityContactSummary,
  EntityContactsResponse,
} from "@/domain/entities/entity-contacts-dto";

type Props = {
  entityId: string;
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

function ContactCard({ contact }: { contact: EntityContactSummary }) {
  return (
    <div className="rounded-md border border-brand-secondary-1 bg-brand-secondary-1/40 p-4">
      <div className="text-sm font-semibold text-brand-secondary-2">
        {contact.name ?? "Unnamed contact"}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-60">
        {contact.contact_role}
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <div>
          <span className="opacity-60">Email:</span>{" "}
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
        <div>
          <span className="opacity-60">Phone:</span>{" "}
          {contact.phone ?? "—"}
        </div>
        <div>
          <span className="opacity-60">Last seen:</span>{" "}
          {formatDate(contact.last_seen_at)}
        </div>
      </div>
    </div>
  );
}

export default function EntityContactsTab({ entityId }: Props) {
  const [data, setData] = useState<EntityContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/entities/${entityId}/contacts`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load contacts");
        }
        const json = (await res.json()) as EntityContactsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContacts();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  const contacts = useMemo(
    () => data?.contacts ?? [],
    [data?.contacts]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-brand-primary-2">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-brand-secondary-0 opacity-70">
        {contacts.length
          ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`
          : "No contacts found."}
      </div>
      {contacts.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-brand-secondary-1 bg-brand-secondary-2 p-6 text-sm text-brand-secondary-0">
          No contacts are available for this entity yet.
        </div>
      )}
    </div>
  );
}
