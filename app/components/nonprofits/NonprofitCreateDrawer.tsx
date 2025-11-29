"use client";

import { useState } from "react";
import { Nonprofit, OrgType } from "@/app/lib/types/nonprofits";
import LoadingSpinner from "@/app/components/loading-spinner";

interface NonprofitCreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreateSuccess: () => Promise<void>;
}

export default function NonprofitCreateDrawer({
  open,
  onClose,
  onCreateSuccess,
}: NonprofitCreateDrawerProps) {
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("external_charity");
  const [districtId, setDistrictId] = useState("");
  const [website, setWebsite] = useState("");
  const [mission, setMission] = useState("");
  const [ein, setEin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDistrictFoundation = orgType === "district_foundation";

  async function handleCreate() {
    setLoading(true);
    setError(null);

    try {
      const body: Partial<Nonprofit> = {
        name,
        org_type: orgType,
        website_url: website || null,
        mission_statement: mission || null,
        ein: ein || null,
        district_id: null,
        active: false,
      };

      if (isDistrictFoundation) {
        if (!districtId) {
          setError("District is required for district foundations.");
          setLoading(false);
          return;
        }
        body.district_id = districtId;
      }

      const res = await fetch("/api/nonprofits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to create nonprofit.");

      await onCreateSuccess();
      onClose();

      // reset
      setName("");
      setOrgType("external_charity");
      setDistrictId("");
      setWebsite("");
      setMission("");
      setEin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 transition-opacity z-40 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-700 z-50
          transform transition-transform
          w-full sm:w-96
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Add New Nonprofit</h2>
            <button
              className="text-gray-400 hover:text-white"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {error && (
            <p className="text-red-400 mb-3">
              <strong>Error:</strong> {error}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block mb-1 font-medium">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                placeholder="Organization name"
              />
            </div>

            {/* Org Type */}
            <div>
              <label className="block mb-1 font-medium">
                Organization Type *
              </label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as OrgType)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              >
                <option value="external_charity">External Charity</option>
                <option value="district_foundation">District Foundation</option>
                <option value="up_the_ante">Up The Ante (Self)</option>
              </select>
            </div>

            {/* District (only when org_type = district_foundation) */}
            {isDistrictFoundation && (
              <div>
                <label className="block mb-1 font-medium">District ID *</label>
                <input
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                  placeholder="District UUID"
                />
              </div>
            )}

            {/* EIN */}
            <div>
              <label className="block mb-1 font-medium">EIN</label>
              <input
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                placeholder="12-3456789"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block mb-1 font-medium">Website</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                placeholder="https://example.org"
              />
            </div>

            {/* Mission */}
            <div>
              <label className="block mb-1 font-medium">
                Mission Statement
              </label>
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                rows={3}
                placeholder="What is the mission?"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={loading}
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
            >
              {loading ? <LoadingSpinner /> : "Create"}
            </button>

            <button
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
