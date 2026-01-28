"use client";

import { useEffect, useState } from "react";

type EntityContact = {
    id: string;
    contact_role: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    source_system: string;
    source_formid: string;
    source_url: string;
    first_seen_at: string;
    last_seen_at: string;
};

type ContactsResponse = {
    entity_id: string;
    role: string | null;
    contacts: EntityContact[];
};

type Props = {
    entityId: string;
};

function formatDate(value: string | null): string {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatSourceLabel(source: string): string {
    if (!source) return "Source";
    return source.toUpperCase();
}

export default function LeadershipSection({ entityId }: Props) {
    const [contacts, setContacts] = useState<EntityContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadContacts = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/entities/${entityId}/contacts?role=superintendent`,
                    { cache: "no-store" },
                );
                if (response.status === 401) {
                    throw new Error("Sign in to view leadership information.");
                }
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to load leadership");
                }
                const data = (await response.json()) as ContactsResponse;
                if (!cancelled) {
                    setContacts(data.contacts ?? []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Error");
                    setContacts([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadContacts();
        return () => {
            cancelled = true;
        };
    }, [entityId]);

    return (
        <section className="rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-4 text-brand-secondary-0">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Leadership</h2>
                <span className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-60">
                    Superintendent
                </span>
            </div>

            {loading ? (
                <div className="text-sm opacity-70">Loading leadership…</div>
            ) : null}

            {!loading && error ? (
                <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            {!loading && !error && contacts.length === 0 ? (
                <div className="text-sm opacity-70">
                    No superintendent contact on file yet.
                </div>
            ) : null}

            {!loading && !error && contacts.length > 0 ? (
                <div className="space-y-3">
                    {contacts.map((contact) => (
                        <div
                            key={contact.id}
                            className="rounded-md border border-brand-secondary-1 bg-brand-secondary-1/30 p-3"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-base font-semibold">
                                    {contact.name ?? "Unknown"}
                                </div>
                                <span className="rounded-full bg-brand-secondary-1 px-2 py-0.5 text-xs uppercase text-brand-secondary-0">
                                    {formatSourceLabel(contact.source_system)}
                                </span>
                                {contact.source_url ? (
                                    <a
                                        href={contact.source_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-brand-primary-2 underline underline-offset-2"
                                    >
                                        Source
                                    </a>
                                ) : null}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                <div>
                                    <div className="text-xs uppercase opacity-60">
                                        Email
                                    </div>
                                    {contact.email ? (
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="text-brand-primary-2 underline underline-offset-2"
                                        >
                                            {contact.email}
                                        </a>
                                    ) : (
                                        <span className="opacity-70">—</span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs uppercase opacity-60">
                                        Phone
                                    </div>
                                    {contact.phone ? (
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="text-brand-primary-2 underline underline-offset-2"
                                        >
                                            {contact.phone}
                                        </a>
                                    ) : (
                                        <span className="opacity-70">—</span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs uppercase opacity-60">
                                        Last verified
                                    </div>
                                    <div>{formatDate(contact.last_seen_at)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
