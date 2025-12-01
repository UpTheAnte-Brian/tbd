"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import { SmallAvatar } from "@/app/components/ui/avatar";
import { toast } from "react-hot-toast";

interface NonprofitUser {
  id: string;
  nonprofit_id: string;
  user_id: string;
  role: string;
  board_role: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface NonprofitUserAssignmentsPanelProps {
  nonprofitId: string;
}

export default function NonprofitUserAssignmentsPanel({
  nonprofitId,
}: NonprofitUserAssignmentsPanelProps) {
  const [users, setUsers] = useState<NonprofitUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New user fields
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [newBoardRole, setNewBoardRole] = useState<string | null>(null);
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
      const res = await fetch(`/api/nonprofit-users`);
      if (!res.ok) throw new Error("Failed to fetch nonprofit users");
      const json = await res.json();

      setUsers(
        json.filter((u: NonprofitUser) => u.nonprofit_id === nonprofitId)
      );
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
  }, [nonprofitId]);

  async function addUser() {
    try {
      setAdding(true);
      // Prevent adding duplicate user assignments
      if (users.some((u) => u.user_id === newUserId)) {
        toast.error("User is already assigned to this nonprofit");
        alert("User is already assigned to this nonprofit");
        setAdding(false);
        return;
      }
      const res = await fetch(`/api/nonprofit-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonprofit_id: nonprofitId,
          user_id: newUserId,
          role: newRole,
          board_role: newBoardRole,
        }),
      });

      if (!res.ok) throw new Error("Failed to add user");
      toast.success("User added");
      setNewUserId("");
      setNewRole("viewer");
      setNewBoardRole(null);
      setSearchText("");
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add user";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function updateUser(id: string, updates: Partial<NonprofitUser>) {
    try {
      const res = await fetch(`/api/nonprofit-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
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

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`/api/nonprofit-users/${id}`, {
        method: "DELETE",
      });

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
      <h2 className="text-xl font-semibold">Board & User Assignments</h2>

      {/* ADD USER */}
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
            <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded mt-1 max-h-60 overflow-y-auto">
              {searchResults.map((u, index) => {
                const alreadyAssigned = users.some(
                  (usr) => usr.user_id === u.id
                );

                return (
                  <div
                    key={u.id}
                    className={`px-3 py-2 cursor-pointer ${
                      highlightIndex === index
                        ? "bg-gray-600"
                        : alreadyAssigned
                        ? "opacity-60 bg-gray-800"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => {
                      if (alreadyAssigned) return;
                      setNewUserId(u.id);
                      setSearchText(u.full_name ?? "");
                      setSearchResults([]);
                      setDropdownOpen(false);
                      setHighlightIndex(-1);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SmallAvatar
                          name={u.full_name}
                          url={u.avatar_url}
                          size={28}
                        />
                        <p className="font-medium">
                          {u.full_name ?? "Unnamed User"}
                        </p>
                      </div>
                      {alreadyAssigned && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          Assigned
                        </span>
                      )}
                    </div>
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
          </select>
        </div>

        <div>
          <label className="block mb-1">Board Role (optional)</label>
          <select
            value={newBoardRole ?? ""}
            onChange={(e) =>
              setNewBoardRole(e.target.value === "" ? null : e.target.value)
            }
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="">None</option>
            <option value="president">President</option>
            <option value="vice_president">Vice President</option>
            <option value="treasurer">Treasurer</option>
            <option value="secretary">Secretary</option>
            <option value="board_member">Board Member</option>
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

      {/* LIST USERS */}
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
                    name={u.profiles?.full_name ?? null}
                    url={u.profiles?.avatar_url ?? null}
                    size={32}
                  />
                  <div>
                    <p className="font-semibold">
                      {u.profiles?.full_name ?? u.user_id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  value={u.role}
                  onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Board Role</label>
                <select
                  value={u.board_role ?? ""}
                  onChange={(e) =>
                    updateUser(u.id, {
                      board_role: e.target.value === "" ? null : e.target.value,
                    })
                  }
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                >
                  <option value="">None</option>
                  <option value="president">President</option>
                  <option value="vice_president">Vice President</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="secretary">Secretary</option>
                  <option value="board_member">Board Member</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
