// /app/admin/districts/page.tsx
import React from "react";
import DistrictMetadataEditor from "../../components/districts/districtMetadataEditor"; // adjust path as needed

export default function DistrictsAdminPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">District Metadata Editor</h1>
      <DistrictMetadataEditor />
    </main>
  );
}
