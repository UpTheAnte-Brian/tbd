"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgType } from "@/app/lib/types/nonprofits";
import type { CreateNonprofitRequest } from "@/app/lib/types/nonprofit-onboarding";

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  external_charity: "External Charity",
  district_foundation: "District Foundation",
  up_the_ante: "Up The Ante (Self)",
};

export default function NewNonprofitForm({
  defaultDistrictEntityId,
  scopeId,
}: {
  defaultDistrictEntityId: string;
  scopeId?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("external_charity");
  const [ein, setEin] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [missionStatement, setMissionStatement] = useState("");
  const [districtEntityId, setDistrictEntityId] = useState(
    defaultDistrictEntityId,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!scopeId) return;
    const loadScope = async () => {
      try {
        const response = await fetch(
          `/api/admin/nonprofits/scope?id=${encodeURIComponent(scopeId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          id: string;
          label?: string | null;
          ein?: string | null;
          district_entity_id?: string | null;
        };
        if (data.label) setName(data.label);
        if (data.ein) setEin(data.ein);
        if (data.district_entity_id) {
          setDistrictEntityId(data.district_entity_id);
        }
        setScopeLabel(data.label ?? data.ein ?? null);
      } catch {
        // ignore scope preload errors
      }
    };
    loadScope();
  }, [scopeId]);

  const canSubmit = Boolean(name.trim() && orgType && districtEntityId.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    const payload: CreateNonprofitRequest = {
      name: name.trim(),
      org_type: orgType,
      ein: ein.trim() ? ein.trim() : null,
      website_url: websiteUrl.trim() ? websiteUrl.trim() : null,
      mission_statement: missionStatement.trim()
        ? missionStatement.trim()
        : null,
      district_entity_id: districtEntityId.trim(),
      scope_id: scopeId ?? null,
    };

    try {
      const response = await fetch("/api/admin/nonprofits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to create nonprofit");
      }

      const created = (await response.json()) as {
        entity_id: string;
      };

      router.push(`/admin/nonprofits/${created.entity_id}/onboarding`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create nonprofit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {scopeLabel ? (
        <div className="rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-xs uppercase tracking-wide text-brand-secondary-0">
          Scope row: {scopeLabel}
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Organization name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="Organization name"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Organization type
          <select
            value={orgType}
            onChange={(event) => setOrgType(event.target.value as OrgType)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
          >
            {Object.entries(ORG_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          District entity ID
          <input
            value={districtEntityId}
            onChange={(event) => setDistrictEntityId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="UUID"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          EIN (optional)
          <input
            value={ein}
            onChange={(event) => setEin(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="12-3456789"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Website URL (optional)
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="https://example.org"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Mission statement (optional)
          <textarea
            value={missionStatement}
            onChange={(event) => setMissionStatement(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            rows={4}
            placeholder="What is the mission?"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create & Continue"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/nonprofits")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:border-brand-primary hover:text-brand-primary"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
