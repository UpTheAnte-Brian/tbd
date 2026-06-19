"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateBusinessRequest } from "@/app/lib/types/business-admin";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "inactive", label: "Inactive" },
] as const;

type BusinessStatus = (typeof STATUS_OPTIONS)[number]["value"];

export default function NewBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [types, setTypes] = useState("");
  const [status, setStatus] = useState<BusinessStatus>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(name.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    const payload: CreateBusinessRequest = {
      name: name.trim(),
      website: website.trim() || null,
      address: address.trim() || null,
      phone_number: phoneNumber.trim() || null,
      place_id: placeId.trim() || null,
      types: types
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      status,
    };

    try {
      const response = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to create business");
      }

      const created = (await response.json()) as { entity_id: string };
      router.push(`/entities/${created.entity_id}?tab=branding`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Business name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="Business name"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as BusinessStatus)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Website URL
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="https://example.com"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Address
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="123 Main St, Minneapolis, MN"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Phone number
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="(555) 555-5555"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Google Place ID
          <input
            value={placeId}
            onChange={(event) => setPlaceId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="ChIJ..."
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-text-on-light">
          Types
          <input
            value={types}
            onChange={(event) => setTypes(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-on-light shadow-sm focus:border-brand-primary focus:outline-none"
            placeholder="restaurant, coffee_shop"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create & Open"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/businesses")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-on-light shadow-sm transition hover:border-brand-primary hover:text-brand-primary"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
