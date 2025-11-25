"use client";

import { useState } from "react";
import { NonprofitDTO } from "@/app/data/nonprofit-dto";
import LoadingSpinner from "@/app/components/loading-spinner";

interface NonprofitMetadataEditorProps {
  nonprofit: NonprofitDTO;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export default function NonprofitMetadataEditor({
  nonprofit,
  onSave,
  onCancel,
}: NonprofitMetadataEditorProps) {
  const [director, setDirector] = useState(
    nonprofit.foundation_metadata?.director ?? ""
  );
  const [endowment, setEndowment] = useState(
    nonprofit.foundation_metadata?.endowment_amount ?? ""
  );
  const [grantmakingFocus, setGrantmakingFocus] = useState(
    nonprofit.foundation_metadata?.grantmaking_focus ?? ""
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    nonprofit.foundation_metadata?.additional_info ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nonprofits/${nonprofit.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          director,
          endowment_amount: endowment === "" ? null : Number(endowment),
          grantmaking_focus: grantmakingFocus,
          additional_info: additionalInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update foundation metadata");
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
      <h2 className="font-semibold text-xl">Edit Foundation Metadata</h2>

      {error && (
        <p className="text-red-400">
          <strong>Error:</strong> {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {/* Director */}
        <div>
          <label className="block font-medium mb-1">Director</label>
          <input
            type="text"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Director name"
          />
        </div>

        {/* Endowment */}
        <div>
          <label className="block font-medium mb-1">Endowment Amount</label>
          <input
            type="number"
            value={endowment}
            onChange={(e) => setEndowment(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="0"
          />
        </div>

        {/* Grantmaking Focus */}
        <div>
          <label className="block font-medium mb-1">Grantmaking Focus</label>
          <input
            type="text"
            value={grantmakingFocus}
            onChange={(e) => setGrantmakingFocus(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="STEM programs, scholarships, teacher grants…"
          />
        </div>

        {/* Additional Info */}
        <div>
          <label className="block font-medium mb-1">Additional Info</label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            rows={4}
            placeholder="Any notes, restrictions, bylaws, etc."
          />
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
