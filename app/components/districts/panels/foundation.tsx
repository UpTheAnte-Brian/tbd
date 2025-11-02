import React, { useState } from "react";
import FoundationEditor from "@/app/components/districts/foundation-editor";
import { DistrictWithFoundation, Profile } from "@/app/lib/types";

export default function DistrictFoundation({
  user,
  district,
  reloadFoundation,
}: {
  user: Profile | null;
  district: DistrictWithFoundation;
  reloadFoundation: () => void;
}) {
  const foundation = district.foundation?.id
    ? district.foundation
    : {
        name: "",
        contact: "",
        website: "",
        founding_year: 0,
        average_class_size: 0,
        balance_sheet: 0,
        district_id: district.sdorgid,
      };
  const [editing, setEditing] = useState(false);

  const isAdmin = user?.global_role === "admin";

  if (!foundation) {
    return <div>Loading foundation...</div>;
  }

  if (editing && !isAdmin) {
    return <div>You do not have permission to edit this foundation.</div>;
  }

  if (editing) {
    return (
      <FoundationEditor
        key={foundation?.district_id} // 👈 force remount on ID change
        foundation={foundation}
        onSave={async (updated) => {
          console.log("saving foundation: ", updated);
          try {
            if (!updated.district_id) {
              throw new Error("Missing district_id for foundation update");
            }

            const response = await fetch(
              `/api/foundations/${updated.district_id}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
              }
            );

            if (!response.ok) {
              throw new Error(
                `Failed to save foundation: ${response.statusText}`
              );
            }

            reloadFoundation(); // 🔄 refresh parent state
            setEditing(false);
          } catch (error) {
            console.error("Error saving foundation data:", error);
          }
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (!foundation.id) {
    return (
      <div>
        <p className="text-black">No Foundation has been identified yet. </p>
        {isAdmin && (
          <button onClick={() => setEditing(true)}>Edit Foundation</button>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="text-black">Name: {foundation.name}</p>
      <p className="text-black">Contact: {foundation.contact}</p>
      <p className="text-black">
        Website:{" "}
        {foundation.website && (
          <a
            href={foundation.website}
            className="text-black"
            target="_blank"
            rel="noopener noreferrer"
          >
            {foundation.website}
          </a>
        )}
      </p>
      {/* Add other foundation details as needed */}
      {isAdmin && (
        <button onClick={() => setEditing(true)}>Edit Foundation</button>
      )}
    </div>
  );
}
