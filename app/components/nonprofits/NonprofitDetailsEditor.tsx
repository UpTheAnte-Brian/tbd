"use client";

import { useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import { NonprofitDTO } from "@/app/data/nonprofit-dto";

interface NonprofitDetailsEditorProps {
  nonprofit: NonprofitDTO;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export default function NonprofitDetailsEditor({
  nonprofit,
  onSave,
  onCancel,
}: NonprofitDetailsEditorProps) {
  const [name, setName] = useState(nonprofit.name);
  const [ein, setEin] = useState(nonprofit.ein ?? "");
  const [address, setAddress] = useState(nonprofit.address ?? "");
  const [contactEmail, setContactEmail] = useState(
    nonprofit.contact_email ?? ""
  );
  const [contactPhone, setContactPhone] = useState(
    nonprofit.contact_phone ?? ""
  );
  const [website, setWebsite] = useState(nonprofit.website_url ?? "");
  const [mission, setMission] = useState(nonprofit.mission_statement ?? "");
  const [active, setActive] = useState(nonprofit.active);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nonprofits/${nonprofit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ein: ein === "" ? null : ein,
          address: address === "" ? null : address,
          contact_email: contactEmail === "" ? null : contactEmail,
          contact_phone: contactPhone === "" ? null : contactPhone,
          website_url: website === "" ? null : website,
          mission_statement: mission === "" ? null : mission,
          active,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update nonprofit details");
      }

      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded space-y-4 bg-gray-900">
      <h2 className="font-semibold text-xl">Edit Nonprofit Details</h2>

      {error && (
        <p className="text-red-400">
          <strong>Error:</strong> {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="block font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        {/* EIN */}
        <div>
          <label className="block font-medium mb-1">EIN</label>
          <input
            type="text"
            value={ein}
            onChange={(e) => setEin(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="12-3456789"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block font-medium mb-1">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            rows={2}
            placeholder="123 Main St, City, State"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label className="block font-medium mb-1">Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block font-medium mb-1">Contact Phone</label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block font-medium mb-1">Website</label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="https://example.org"
          />
        </div>

        {/* Mission */}
        <div>
          <label className="block font-medium mb-1">Mission Statement</label>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            rows={4}
            placeholder="Describe the mission..."
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <label className="font-medium">Active</label>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          disabled={loading}
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
        >
          {loading ? <LoadingSpinner /> : "Save"}
        </button>

        <button
          disabled={loading}
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
