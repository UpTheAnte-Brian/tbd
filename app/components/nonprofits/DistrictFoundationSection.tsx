"use client";

import { useState } from "react";
import { NonprofitDTO } from "@/app/data/nonprofit-dto";
import LoadingSpinner from "@/app/components/loading-spinner";

interface DistrictFoundationSectionProps {
  nonprofit: NonprofitDTO;
  reload: () => void;
}

/**
 * District-specific configuration section.
 * This appears ONLY when org_type === "district_foundation".
 */
export default function DistrictFoundationSection({
  nonprofit,
  reload,
}: DistrictFoundationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [restrictedFundsEnabled, setRestrictedFundsEnabled] = useState<boolean>(
    nonprofit.foundation_metadata?.additional_info?.includes(
      "restrictedFunds=true"
    ) ?? false
  );

  const [grantApprovalRequired, setGrantApprovalRequired] = useState<boolean>(
    nonprofit.foundation_metadata?.additional_info?.includes(
      "grantApprovalRequired=true"
    ) ?? false
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const additionalInfo = JSON.stringify({
        restrictedFunds: restrictedFundsEnabled,
        grantApprovalRequired,
      });

      const response = await fetch(`/api/nonprofits/${nonprofit.id}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additional_info: additionalInfo,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save district-specific settings.");
      }

      await reload();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 mt-6 border rounded bg-gray-900 space-y-4">
      <h2 className="font-semibold text-xl">District-Specific Configuration</h2>

      {error && (
        <p className="text-red-400">
          <strong>Error:</strong> {error}
        </p>
      )}

      {!isEditing && (
        <div className="space-y-2">
          <p>
            <strong>Restricted Funds Enabled:</strong>{" "}
            {restrictedFundsEnabled ? "Yes" : "No"}
          </p>
          <p>
            <strong>Grant Approval Required:</strong>{" "}
            {grantApprovalRequired ? "Yes" : "No"}
          </p>

          <button
            className="mt-3 px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
            onClick={() => setIsEditing(true)}
          >
            Edit Configuration
          </button>
        </div>
      )}

      {isEditing && (
        <div className="space-y-4">
          {/* Restricted funds */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={restrictedFundsEnabled}
              onChange={(e) => setRestrictedFundsEnabled(e.target.checked)}
            />
            <label className="font-medium">
              Enable Restricted Funds Tracking
            </label>
          </div>

          {/* Grant approval required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={grantApprovalRequired}
              onChange={(e) => setGrantApprovalRequired(e.target.checked)}
            />
            <label className="font-medium">
              Require Approval for Teacher Grants
            </label>
          </div>

          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
            >
              {loading ? <LoadingSpinner /> : "Save Settings"}
            </button>

            <button
              disabled={loading}
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
