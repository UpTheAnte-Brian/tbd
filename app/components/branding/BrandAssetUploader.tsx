"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";
import {
  BRANDING_LOGO_CATEGORIES,
  BRANDING_LOGO_CATEGORY_LABELS,
} from "@/app/lib/types/types";

interface Props {
  entityId: string;
  entityType?: string;
  targetLogoId?: string;
  onUploaded?: () => void;
  defaultCategory?: string;
  defaultSubcategory?: string;
  onCancel?: () => void;
}

export function BrandAssetUploader({
  entityId,
  entityType = "district",
  targetLogoId,
  onUploaded,
  defaultCategory = "",
  defaultSubcategory = "",
  onCancel,
}: Props) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [subcategory, setSubcategory] = useState<string>(defaultSubcategory);
  const [uploading, setUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null
  );

  // Submit files to API route
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setStatusMessage(null);
    setStatusType(null);

    try {
      const file = selectedFiles[0]; // one at a time for now

      const formData = new FormData();
      formData.append("file", file);
      if (category) formData.append("category", category);
      if (subcategory) formData.append("subcategory", subcategory);
      formData.append("logoId", targetLogoId ?? "");
      if (entityType) formData.append("entityType", entityType);

      const res = await fetch(`/api/districts/${entityId}/branding/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      setSelectedFiles(null);
      setStatusMessage(`Uploaded ${file.name} successfully`);
      setStatusType("success");
      if (onUploaded) onUploaded();
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage(err instanceof Error ? err.message : "");
      setStatusType("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-white shadow-sm space-y-6">
      <h2 className="text-xl font-semibold">Upload Brand Assets</h2>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Category
          </label>
          <select
            className="border rounded p-2 w-full bg-gray-50 text-gray-700"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {BRANDING_LOGO_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {BRANDING_LOGO_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Subcategory
          </label>
          <input
            className="border rounded p-2 w-full bg-gray-50 text-gray-700"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="e.g. stacked, primary, full_color"
          />
        </div>
      </div>

      {/* File Selector */}
      <div
        className={clsx(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50",
          selectedFiles ? "border-blue-400" : "border-gray-300"
        )}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <UploadCloud className="mx-auto  bg-gray-50 text-gray-700" size={36} />
        <p className="mt-2 text-gray-600 border-1 rounded-md">
          {selectedFiles
            ? `${selectedFiles[0].name}`
            : "Click to choose a file"}
        </p>

        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={(e) => setSelectedFiles(e.target.files)}
        />
      </div>

      {/* Upload Button */}
      <div className="flex gap-2">
        <button
          disabled={!selectedFiles || uploading || !category}
          onClick={handleUpload}
          className={clsx(
            "w-full py-2 rounded text-white font-semibold",
            uploading || !selectedFiles || !category
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {uploading ? "Uploading..." : "Upload Asset"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-300 text-white bg-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={clsx(
            "flex items-center gap-2 p-3 rounded",
            statusType === "success" && "bg-green-100 text-green-800",
            statusType === "error" && "bg-red-100 text-red-800"
          )}
        >
          {statusType === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <XCircle size={18} />
          )}
          {statusMessage}
        </div>
      )}
    </div>
  );
}
