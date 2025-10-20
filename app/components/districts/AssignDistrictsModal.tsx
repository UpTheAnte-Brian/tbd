import DistrictMultiSelectSearch from "@/app/components/districts/district-multi-select-search";
import {
  DistrictUserRow,
  DistrictWithFoundation,
  Profile,
} from "@/app/lib/types";
import React, { useEffect, useState } from "react";

type Feature = DistrictWithFoundation; // Replace with actual Feature type

interface AssignDistrictsModalProps {
  setAssignToId: (assignToId: string | null) => void;
  assignToId: string;
  handleSaveAssignments: () => void;
  users: Profile[];
  features: Feature[];
  setUsers: React.Dispatch<React.SetStateAction<Profile[]>>;
  onClose: () => void;
}

const AssignDistrictsModal: React.FC<AssignDistrictsModalProps> = ({
  setAssignToId,
  assignToId,
  handleSaveAssignments,
  users,
  features,
  setUsers,
  onClose,
}) => {
  const [localUsers, setLocalUsers] = useState<Profile[]>(() => [...users]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[500px] relative flex flex-col">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-black"
          onClick={() => setAssignToId(null)}
        >
          ✕
        </button>

        <div className="w-full mb-2">
          <h2 className="text-black text-lg font-bold">Assign District</h2>
        </div>

        <div className="w-full">
          <DistrictMultiSelectSearch
            features={features}
            selectedIds={
              localUsers
                .find((u) => u.id === assignToId)
                ?.district_users.map((d: DistrictUserRow) => d.district_id) ||
              []
            }
            onChange={(newSelectedIds) => {
              setLocalUsers((prev) =>
                prev.map((u) =>
                  u.id === assignToId
                    ? {
                        ...u,
                        district_users: newSelectedIds.map((id) => {
                          const f = features.find((ft) => ft.id === id);
                          return {
                            district_id: id,
                            user_id: u.id,
                            role: "member",
                            district: {
                              id: id,
                              sdorgid: id,
                              shortname: f ? f.shortname : "Unknown",
                            },
                          };
                        }),
                      }
                    : u
                )
              );
            }}
          />
        </div>

        <div className="flex w-full mt-4">
          <div className="w-4/5">
            {localUsers.find((u) => u.id === assignToId)?.district_users
              .length ? (
              <div>
                <h3 className="font-semibold text-sm text-gray-700">
                  Currently Assigned:
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-900">
                  {localUsers
                    .find((u) => u.id === assignToId)
                    ?.district_users.map((d) =>
                      "district" in d ? (
                        <li className="text-gray-900" key={d.district_id}>
                          {d.district.shortname}
                        </li>
                      ) : null
                    )}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No districts assigned
              </div>
            )}
          </div>
          <button
            className="w-1/5 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 ml-2"
            onClick={() => {
              setUsers(localUsers);
              handleSaveAssignments();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignDistrictsModal;
