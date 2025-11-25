"use client";

import { useState } from "react";
import { NonprofitDTO } from "@/app/data/nonprofit-dto";
import NonprofitMetadataEditor from "@/app/components/nonprofits/NonprofitMetadataEditor";
import NonprofitDetailsEditor from "@/app/components/nonprofits/NonprofitDetailsEditor";
import DistrictFoundationSection from "@/app/components/nonprofits/DistrictFoundationSection";
import NonprofitUserAssignmentsPanel from "@/app/components/nonprofits/NonprofitUserAssignmentsPanel";

interface NonprofitPanelsProps {
  nonprofit: NonprofitDTO;
  //   user: any; // can refine later
  reloadNonprofit: () => void;
}

export default function NonprofitPanels({
  nonprofit,
  //   user,
  reloadNonprofit,
}: NonprofitPanelsProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "details" | "metadata" | "users"
  >("overview");

  const isDistrictFoundation = nonprofit.org_type === "district_foundation";

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b pb-2 mb-4">
        <button
          className={`pb-2 ${
            activeTab === "overview" ? "font-semibold border-b-2" : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={`pb-2 ${
            activeTab === "details" ? "font-semibold border-b-2" : ""
          }`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>

        {isDistrictFoundation && (
          <button
            className={`pb-2 ${
              activeTab === "metadata" ? "font-semibold border-b-2" : ""
            }`}
            onClick={() => setActiveTab("metadata")}
          >
            Foundation Metadata
          </button>
        )}
        <button
          className={`pb-2 ${
            activeTab === "users" ? "font-semibold border-b-2" : ""
          }`}
          onClick={() => setActiveTab("users")}
        >
          Board & Users
        </button>
      </div>

      {/* Panels */}
      {activeTab === "overview" && <OverviewPanel nonprofit={nonprofit} />}

      {activeTab === "details" && (
        <DetailsPanel nonprofit={nonprofit} reload={reloadNonprofit} />
      )}

      {activeTab === "metadata" && isDistrictFoundation && (
        <MetadataPanel nonprofit={nonprofit} reload={reloadNonprofit} />
      )}
      {activeTab === "users" && (
        <NonprofitUserAssignmentsPanel nonprofitId={nonprofit.id} />
      )}
      {isDistrictFoundation && (
        <DistrictFoundationSection
          nonprofit={nonprofit}
          reload={reloadNonprofit}
        />
      )}
    </div>
  );
}

/* --- Overview Panel --- */
function OverviewPanel({ nonprofit }: { nonprofit: NonprofitDTO }) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Overview</h2>

      <div>
        <p>
          <strong>Name:</strong> {nonprofit.name}
        </p>
        <p>
          <strong>Type:</strong> {nonprofit.org_type}
        </p>
        {nonprofit.website_url && (
          <p>
            <strong>Website:</strong>{" "}
            <a
              href={nonprofit.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              {nonprofit.website_url}
            </a>
          </p>
        )}
      </div>

      {nonprofit.mission_statement && (
        <div>
          <h3 className="font-semibold">Mission</h3>
          <p className="whitespace-pre-line">{nonprofit.mission_statement}</p>
        </div>
      )}
    </div>
  );
}

/* --- Details Panel --- */
function DetailsPanel({
  nonprofit,
  reload,
}: {
  nonprofit: NonprofitDTO;
  reload: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <NonprofitDetailsEditor
        nonprofit={nonprofit}
        onSave={async () => {
          await reload();
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Details</h2>

      <div className="space-y-1">
        <p>
          <strong>EIN:</strong> {nonprofit.ein ?? "—"}
        </p>
        <p>
          <strong>Address:</strong> {nonprofit.address ?? "—"}
        </p>
        <p>
          <strong>Contact Email:</strong> {nonprofit.contact_email ?? "—"}
        </p>
        <p>
          <strong>Contact Phone:</strong> {nonprofit.contact_phone ?? "—"}
        </p>
        <p>
          <strong>Active:</strong> {nonprofit.active ? "Yes" : "No"}
        </p>
      </div>

      <button
        className="mt-3 px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
        onClick={() => setIsEditing(true)}
      >
        Edit Details
      </button>
    </div>
  );
}

/* --- Foundation Metadata Panel --- */
function MetadataPanel({
  nonprofit,
  reload,
}: {
  nonprofit: NonprofitDTO;
  reload: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const metadata = nonprofit.foundation_metadata;

  if (isEditing) {
    return (
      <NonprofitMetadataEditor
        nonprofit={nonprofit}
        onSave={async () => {
          await reload();
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  if (!metadata) {
    return (
      <div>
        <p>No foundation metadata found.</p>
        <button
          className="mt-3 px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
          onClick={() => setIsEditing(true)}
        >
          Create Metadata
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Foundation Metadata</h2>

      <div className="space-y-1">
        <p>
          <strong>Director:</strong> {metadata.director ?? "—"}
        </p>
        <p>
          <strong>Endowment Amount:</strong> {metadata.endowment_amount ?? "—"}
        </p>
        <p>
          <strong>Grantmaking Focus:</strong>{" "}
          {metadata.grantmaking_focus ?? "—"}
        </p>
        <p>
          <strong>Additional Info:</strong>
        </p>
        <pre className="whitespace-pre-line bg-gray-800 p-2 rounded">
          {metadata.additional_info ?? "—"}
        </pre>
      </div>

      <button
        className="mt-3 px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
        onClick={() => setIsEditing(true)}
      >
        Edit Metadata
      </button>
    </div>
  );
}
