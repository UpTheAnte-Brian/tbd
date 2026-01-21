"use client";

import type { MinutesDTO } from "./types";

export function VersionHistory(props: {
    versions: MinutesDTO[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const { versions, selectedId, onSelect } = props;

    return (
        <div className="border rounded p-3">
            <div className="font-semibold mb-2">Minutes Versions</div>
            <ul className="space-y-1">
                {versions.map((version) => {
                    const active = version.id === selectedId;
                    return (
                        <li key={version.id}>
                            <button
                                className={`w-full text-left px-2 py-2 rounded ${
                                    active
                                        ? "bg-brand-secondary-1 text-brand-primary-1"
                                        : "bg-brand-secondary-2"
                                }`}
                                onClick={() => onSelect(version.id)}
                            >
                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        {version.status}
                                    </span>
                                    <span className="text-xs opacity-80">
                                        {version.created_at
                                            ? new Date(
                                                  version.created_at,
                                              ).toLocaleString()
                                            : "Unknown"}
                                    </span>
                                </div>
                                {version.amended_from_minutes_id && (
                                    <div className="text-xs opacity-80 truncate">
                                        Amends:{" "}
                                        {version.amended_from_minutes_id}
                                    </div>
                                )}
                            </button>
                        </li>
                    );
                })}
                {versions.length === 0 && (
                    <li className="text-sm text-brand-secondary-0">
                        No minutes yet
                    </li>
                )}
            </ul>
        </div>
    );
}
