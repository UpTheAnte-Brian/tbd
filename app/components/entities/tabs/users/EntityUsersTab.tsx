"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import { SmallAvatar } from "@/app/components/ui/avatar";
import { toast } from "react-hot-toast";
import type { EntityUser } from "@/app/lib/types/types";

interface Props {
  entityId: string;
}

export default function EntityUsersTab({ entityId }: Props) {
  const [users, setUsers] = useState<EntityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const DEBOUNCE_MS = 250;
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch(`/api/entities/${entityId}/users`);
      if (!res.ok) throw new Error("Failed to fetch entity users");
      const json = await res.json();
      setUsers(json ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load users";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [entityId]);

  async function addUser() {
    try {
      setAdding(true);
      if (users.some((u) => u.user_id === newUserId)) {
        toast.error("User is already assigned to this entity");
        setAdding(false);
        return;
      }
      const res = await fetch(`/api/entities/${entityId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          role: newRole,
        }),
      });

      if (!res.ok) throw new Error("Failed to add user");
      toast.success("User added");
      setNewUserId("");
      setNewRole("viewer");
      setSearchText("");
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add user";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function updateUser(userId: string, role: string) {
    try {
      const res = await fetch(`/api/entities/${entityId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) throw new Error("Failed to update user");
      toast.success("Updated");
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    }
  }

  async function searchProfiles(q: string) {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setSearchResults(json);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function deleteUser(userId: string) {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/users?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete user");
      toast.success("Removed");
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">User Assignments</h2>
      <p className="text-sm text-gray-400">
        Governance roles are managed separately. Use this list for operational
        access (admin, editor, viewer, employee).
      </p>

      <div className="p-4 border rounded bg-gray-900 space-y-4">
        <h3 className="font-semibold text-lg">Add User</h3>

        <div className="relative">
          <input
            value={searchText}
            onChange={(e) => {
              const value = e.target.value;
              setSearchText(value);

              if (debounceTimer) clearTimeout(debounceTimer);

              const timer = setTimeout(() => {
                searchProfiles(value);
              }, DEBOUNCE_MS);

              setDebounceTimer(timer);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => {
              if (!dropdownOpen || searchResults.length === 0) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev < searchResults.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  prev > 0 ? prev - 1 : searchResults.length - 1
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                const sel = searchResults[highlightIndex];
                if (sel) {
                  setNewUserId(sel.id);
                  setSearchText(sel.full_name ?? "");
                  setSearchResults([]);
                  setDropdownOpen(false);
                  setHighlightIndex(-1);
                }
              } else if (e.key === "Escape") {
                setDropdownOpen(false);
                setHighlightIndex(-1);
              }
            }}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Search users by name..."
          />

          {searchLoading && (
            <div className="absolute right-3 top-2.5">
              <LoadingSpinner />
            </div>
          )}

          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-10 w-full bg-gray-900 border border-gray-700 rounded mt-1 max-h-56 overflow-y-auto">
              {searchResults.map((u, idx) => {
                const alreadyAssigned = users.some(
                  (user) => user.user_id === u.id
                );
                const active = idx === highlightIndex;
                return (
                  <div
                    key={u.id}
                    className={`px-3 py-2 flex items-center gap-3 cursor-pointer ${
                      active ? "bg-gray-700" : "hover:bg-gray-800"
                    }`}
                    onClick={() => {
                      setNewUserId(u.id);
                      setSearchText(u.full_name ?? "");
                      setSearchResults([]);
                      setDropdownOpen(false);
                      setHighlightIndex(-1);
                    }}
                  >
                    <SmallAvatar
                      name={u.full_name ?? null}
                      url={u.avatar_url ?? null}
                      size={32}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{u.full_name ?? u.id}</p>
                    </div>
                    {alreadyAssigned && (
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        Assigned
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block mb-1">Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <button
          onClick={addUser}
          disabled={adding || !newUserId}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
        >
          {adding ? <LoadingSpinner /> : "Add User"}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <p className="text-gray-400">No users assigned.</p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="p-4 border rounded bg-gray-900 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <SmallAvatar
                    name={u.profile?.full_name ?? null}
                    url={u.profile?.avatar_url ?? null}
                    size={32}
                  />
                  <div>
                    <p className="font-semibold">
                      {u.profile?.full_name ?? u.user_id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteUser(u.user_id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.user_id, e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
