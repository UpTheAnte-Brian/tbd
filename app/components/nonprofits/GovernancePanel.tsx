"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import { toast } from "react-hot-toast";
import {
  type BoardMember,
  type BoardMeeting,
  type GovernanceSnapshot,
  type MeetingMinutes,
  type Motion,
  type Vote,
} from "@/app/lib/types/governance";

interface GovernancePanelProps {
  nonprofitId: string;
}

interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const ROLE_OPTIONS: { value: BoardMember["role"]; label: string }[] = [
  { value: "chair", label: "Chair" },
  { value: "vice_chair", label: "Vice Chair" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "director", label: "Director" },
];

const STATUS_OPTIONS: { value: BoardMember["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "resigned", label: "Resigned" },
  { value: "removed", label: "Removed" },
];

export default function GovernancePanel({ nonprofitId }: GovernancePanelProps) {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<BoardMember["role"]>("director");
  const [selectedStatus, setSelectedStatus] = useState<BoardMember["status"]>("active");
  const [termStart, setTermStart] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [termEnd, setTermEnd] = useState("");
  const [meetingDraft, setMeetingDraft] = useState({
    meeting_type: "",
    scheduled_start: "",
    scheduled_end: "",
  });
  const [motionDrafts, setMotionDrafts] = useState<Record<string, Partial<Motion>>>({});
  const [minutesDrafts, setMinutesDrafts] = useState<Record<string, string>>({});
  const [voteDrafts, setVoteDrafts] = useState<
    Record<string, { board_member_id: string; vote: "yes" | "no" | "abstain" }>
  >({});
  const [approvalDrafts, setApprovalDrafts] = useState<
    Record<string, { board_member_id: string }>
  >({});

  const boardId = snapshot?.board.id;

  const activeMembers = useMemo(
    () => (snapshot?.members ?? []).filter((m) => m.status === "active"),
    [snapshot?.members]
  );

  const membersById = useMemo(() => {
    const map: Record<string, BoardMember> = {};
    (snapshot?.members ?? []).forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [snapshot?.members]);

  const motionsByMeeting = useMemo(() => {
    const map: Record<string, Motion[]> = {};
    (snapshot?.motions ?? []).forEach((motion) => {
      map[motion.meeting_id] = map[motion.meeting_id] ?? [];
      map[motion.meeting_id].push(motion);
    });
    return map;
  }, [snapshot?.motions]);

  const votesByMotion = useMemo(() => {
    const map: Record<string, Vote[]> = {};
    (snapshot?.votes ?? []).forEach((vote) => {
      map[vote.motion_id] = map[vote.motion_id] ?? [];
      map[vote.motion_id].push(vote);
    });
    return map;
  }, [snapshot?.votes]);

  const minutesByMeeting = useMemo(() => {
    const map: Record<string, MeetingMinutes> = {};
    (snapshot?.minutes ?? []).forEach((m) => {
      map[m.meeting_id] = m;
    });
    return map;
  }, [snapshot?.minutes]);

  async function loadSnapshot() {
    try {
      setLoading(true);
      const res = await fetch(`/api/nonprofits/${nonprofitId}/governance`);
      if (!res.ok) throw new Error("Failed to load governance");
      const json: GovernanceSnapshot = await res.json();
      setSnapshot(json);
      const minutesMap: Record<string, string> = {};
      (json.minutes ?? []).forEach((m) => {
        minutesMap[m.meeting_id] = m.content ?? "";
      });
      setMinutesDrafts(minutesMap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load governance";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSnapshot();
  }, [nonprofitId]);

  useEffect(() => {
    const controller = new AbortController();
    const doSearch = async () => {
      if (!searchText || searchText.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchText)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as ProfileSearchResult[];
        setSearchResults(json);
      } catch {
        // ignore
      }
    };
    const timer = setTimeout(doSearch, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText]);

  async function addMember() {
    if (!boardId) return;
    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }
    if (!termStart) {
      toast.error("Term start date is required");
      return;
    }
    try {
      setMemberLoading(true);
      const res = await fetch(`/api/governance/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: selectedRole,
          status: selectedStatus,
          term_start: termStart,
          term_end: termEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Could not add board member");
      toast.success("Board member added");
      setSelectedUserId("");
      setSearchText("");
      setTermStart(new Date().toISOString().slice(0, 10));
      setTermEnd("");
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add member";
      toast.error(message);
    } finally {
      setMemberLoading(false);
    }
  }

  async function updateMember(memberId: string, updates: Partial<BoardMember>) {
    try {
      const res = await fetch(`/api/governance/board-members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: updates.role,
          status: updates.status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update member");
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update member";
      toast.error(message);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this board member?")) return;
    try {
      const res = await fetch(`/api/governance/board-members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Removed");
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    }
  }

  async function createMeeting() {
    if (!boardId) return;
    try {
      setMeetingLoading(true);
      const res = await fetch(`/api/governance/boards/${boardId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingDraft),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      toast.success("Meeting scheduled");
      setMeetingDraft({ meeting_type: "", scheduled_start: "", scheduled_end: "" });
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create meeting";
      toast.error(message);
    } finally {
      setMeetingLoading(false);
    }
  }

  async function createMotion(meetingId: string) {
    const draft = motionDrafts[meetingId] ?? {};
    try {
      const res = await fetch(`/api/governance/meetings/${meetingId}/motions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create motion");
      toast.success("Motion added");
      setMotionDrafts((prev) => ({ ...prev, [meetingId]: {} }));
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create motion";
      toast.error(message);
    }
  }

  async function finalizeMotion(motionId: string) {
    try {
      const res = await fetch(`/api/governance/motions/${motionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "finalized",
          finalized_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to finalize motion");
      toast.success("Motion finalized");
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to finalize motion";
      toast.error(message);
    }
  }

  async function submitVote(motionId: string) {
    const draft = voteDrafts[motionId];
    if (!draft?.board_member_id) {
      toast.error("Choose a voter");
      return;
    }
    try {
      const res = await fetch(`/api/governance/motions/${motionId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to record vote");
      toast.success("Vote recorded");
      setVoteDrafts((prev) => ({ ...prev, [motionId]: { board_member_id: "", vote: "yes" } }));
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record vote";
      toast.error(message);
    }
  }

  async function saveMinutes(meetingId: string) {
    const content = minutesDrafts[meetingId] ?? "";
    const current = minutesByMeeting[meetingId];
    try {
      const res = await fetch(`/api/governance/meetings/${meetingId}/minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current?.id,
          content,
          meeting_id: meetingId,
        }),
      });
      if (!res.ok) throw new Error("Failed to save minutes");
      toast.success("Minutes saved");
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save minutes";
      toast.error(message);
    }
  }

  async function addApproval(entityId: string, entityType: "motion" | "minutes") {
    const draft = approvalDrafts[entityId];
    if (!draft?.board_member_id) {
      toast.error("Choose a signer");
      return;
    }
    try {
      const res = await fetch(`/api/governance/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_id: entityId,
          entity_type: entityType,
          board_member_id: draft.board_member_id,
        }),
      });
      if (!res.ok) throw new Error("Failed to record approval");
      toast.success("Approval recorded");
      setApprovalDrafts((prev) => ({ ...prev, [entityId]: { board_member_id: "" } }));
      await loadSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record approval";
      toast.error(message);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!snapshot || !boardId)
    return <p className="text-gray-400">No board found for this nonprofit.</p>;

  return (
    <div className="space-y-8 text-gray-100">
      <div>
        <h2 className="text-xl font-semibold">Board Roster</h2>
        <p className="text-sm text-gray-400">
          Governance is separate from operational roles. Only board members below can vote on
          motions and approve minutes.
        </p>

        <div className="mt-4 space-y-3">
          {(snapshot.members ?? []).length === 0 && (
            <p className="text-gray-400">No board members yet.</p>
          )}

          {snapshot.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-700 rounded p-3 bg-gray-900/60"
            >
              <div>
                <p className="font-semibold">
                  {member.profile?.full_name ?? member.user_id}
                </p>
                <p className="text-sm text-gray-400">
                  {member.role.replace("_", " ")} · {member.status}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateMember(member.id, { role: e.target.value as BoardMember["role"] })
                  }
                  className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={member.status}
                  onChange={(e) =>
                    updateMember(member.id, {
                      status: e.target.value as BoardMember["status"],
                    })
                  }
                  className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 border border-gray-700 rounded space-y-3 bg-gray-900/60">
          <h3 className="font-semibold text-lg">Add Board Member</h3>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search users by name"
            className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
          />
          {searchResults.length > 0 && (
            <div className="border border-gray-700 rounded divide-y divide-gray-800 bg-gray-950">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-2 text-gray-100 ${
                    selectedUserId === r.id ? "bg-gray-800" : "bg-gray-950"
                  }`}
                  onClick={() => {
                    setSelectedUserId(r.id);
                    setSearchText(r.full_name ?? "");
                    setSearchResults([]);
                  }}
                >
                  {r.full_name ?? "Unnamed User"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as BoardMember["role"])}
              className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as BoardMember["status"])}
              className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Term start</label>
              <input
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300">Term end (optional)</label>
              <input
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
              />
            </div>
          </div>

          <button
            onClick={addMember}
            disabled={memberLoading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
          >
            {memberLoading ? <LoadingSpinner /> : "Add Member"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Meetings, Motions & Votes</h2>
        <div className="p-4 border border-gray-700 rounded space-y-3 bg-gray-900/60">
          <h3 className="font-semibold">Schedule Meeting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={meetingDraft.meeting_type}
              onChange={(e) => setMeetingDraft((prev) => ({ ...prev, meeting_type: e.target.value }))}
              placeholder="Meeting type (regular, special...)"
              className="p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
            />
            <input
              type="datetime-local"
              value={meetingDraft.scheduled_start}
              onChange={(e) =>
                setMeetingDraft((prev) => ({ ...prev, scheduled_start: e.target.value }))
              }
              className="p-2 rounded bg-gray-950 border border-gray-700 text-gray-100"
            />
            <input
              type="datetime-local"
              value={meetingDraft.scheduled_end}
              onChange={(e) =>
                setMeetingDraft((prev) => ({ ...prev, scheduled_end: e.target.value }))
              }
              className="p-2 rounded bg-gray-950 border border-gray-700 text-gray-100"
            />
          </div>
          <button
            onClick={createMeeting}
            disabled={meetingLoading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
          >
            {meetingLoading ? <LoadingSpinner /> : "Create Meeting"}
          </button>
        </div>

        {(snapshot.meetings ?? []).length === 0 && (
          <p className="text-gray-400">No meetings scheduled.</p>
        )}

        {(snapshot.meetings ?? []).map((meeting: BoardMeeting) => {
          const meetingMotions = motionsByMeeting[meeting.id] ?? [];
          const minutes = minutesByMeeting[meeting.id];
          return (
            <div key={meeting.id} className="border border-gray-700 rounded p-4 space-y-4 bg-gray-900/60">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {meeting.meeting_type ?? "Meeting"} ·{" "}
                    {meeting.scheduled_start
                      ? new Date(meeting.scheduled_start).toLocaleString()
                      : "Unscheduled"}
                  </p>
                  <p className="text-sm text-gray-400">Status: {meeting.status ?? "draft"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Motions</h4>
                {meetingMotions.length === 0 && (
                  <p className="text-sm text-gray-400">No motions yet.</p>
                )}

                {meetingMotions.map((motion) => {
                  const votes = votesByMotion[motion.id] ?? [];
                  const approvals = (snapshot.approvals ?? []).filter(
                    (a) => a.entity_id === motion.id && a.entity_type === "motion"
                  );
                  return (
                    <div
                      key={motion.id}
                      className="border border-gray-700 rounded p-3 space-y-2 bg-gray-950/60"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {motion.title ?? "Motion"} ({motion.status ?? "draft"})
                          </p>
                          {motion.description && (
                            <p className="text-sm text-gray-300">{motion.description}</p>
                          )}
                        </div>
                        {motion.status !== "finalized" && (
                          <button
                            onClick={() => finalizeMotion(motion.id)}
                            className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-500"
                          >
                            Finalize
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">
                          Votes ({votes.length}):{" "}
                          {votes
                            .map(
                              (v) =>
                                `${v.vote} by ${
                                  membersById[v.board_member_id]?.profile?.full_name ??
                                  membersById[v.board_member_id]?.user_id ??
                                  v.board_member_id
                                }`
                            )
                            .join(", ")}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <select
                            value={voteDrafts[motion.id]?.board_member_id ?? ""}
                            onChange={(e) =>
                              setVoteDrafts((prev) => ({
                                ...prev,
                                [motion.id]: {
                                  board_member_id: e.target.value,
                                  vote: prev[motion.id]?.vote ?? "yes",
                                },
                              }))
                            }
                            className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                          >
                            <option value="">Select voter</option>
                            {activeMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.profile?.full_name ?? m.user_id}
                              </option>
                            ))}
                          </select>

                          <select
                            value={voteDrafts[motion.id]?.vote ?? "yes"}
                            onChange={(e) =>
                              setVoteDrafts((prev) => ({
                                ...prev,
                                [motion.id]: {
                                  board_member_id: prev[motion.id]?.board_member_id ?? "",
                                  vote: e.target.value as "yes" | "no" | "abstain",
                                },
                              }))
                            }
                            className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="abstain">Abstain</option>
                          </select>

                          <button
                            onClick={() => submitVote(motion.id)}
                            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500"
                          >
                            Record Vote
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <select
                            value={approvalDrafts[motion.id]?.board_member_id ?? ""}
                            onChange={(e) =>
                              setApprovalDrafts((prev) => ({
                                ...prev,
                                [motion.id]: { board_member_id: e.target.value },
                              }))
                            }
                            className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                          >
                            <option value="">Approval signer</option>
                            {activeMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.profile?.full_name ?? m.user_id}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => addApproval(motion.id, "motion")}
                            className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-500"
                          >
                            Record Motion Approval ({approvals.length})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Add Motion</h4>
                <input
                  value={motionDrafts[meeting.id]?.title ?? ""}
                  onChange={(e) =>
                    setMotionDrafts((prev) => ({
                      ...prev,
                      [meeting.id]: { ...(prev[meeting.id] ?? {}), title: e.target.value },
                    }))
                  }
                  placeholder="Motion title"
                  className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
                />
                <textarea
                  value={motionDrafts[meeting.id]?.description ?? ""}
                  onChange={(e) =>
                    setMotionDrafts((prev) => ({
                      ...prev,
                      [meeting.id]: { ...(prev[meeting.id] ?? {}), description: e.target.value },
                    }))
                  }
                  placeholder="Description"
                  className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={motionDrafts[meeting.id]?.moved_by ?? ""}
                    onChange={(e) =>
                      setMotionDrafts((prev) => ({
                        ...prev,
                        [meeting.id]: { ...(prev[meeting.id] ?? {}), moved_by: e.target.value },
                      }))
                    }
                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                  >
                    <option value="">Moved by</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profile?.full_name ?? m.user_id}
                      </option>
                    ))}
                  </select>
                  <select
                    value={motionDrafts[meeting.id]?.seconded_by ?? ""}
                    onChange={(e) =>
                      setMotionDrafts((prev) => ({
                        ...prev,
                        [meeting.id]: { ...(prev[meeting.id] ?? {}), seconded_by: e.target.value },
                      }))
                    }
                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                  >
                    <option value="">Seconded by</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profile?.full_name ?? m.user_id}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => createMotion(meeting.id)}
                  className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
                >
                  Add Motion
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Minutes</h4>
                <textarea
                  value={minutesDrafts[meeting.id] ?? ""}
                  onChange={(e) =>
                    setMinutesDrafts((prev) => ({ ...prev, [meeting.id]: e.target.value }))
                  }
                  className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
                  placeholder="Meeting minutes..."
                  rows={4}
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <button
                    onClick={() => saveMinutes(meeting.id)}
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                  >
                    Save Minutes
                  </button>

                  <select
                    value={minutes?.id ? approvalDrafts[minutes.id]?.board_member_id ?? "" : ""}
                    onChange={(e) =>
                      setApprovalDrafts((prev) => ({
                        ...prev,
                        ...(minutes?.id
                          ? { [minutes.id]: { board_member_id: e.target.value } }
                          : {}),
                      }))
                    }
                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100 disabled:opacity-50"
                    disabled={!minutes}
                  >
                    <option value="">Chair/Admin signer</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profile?.full_name ?? m.user_id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => minutes?.id && addApproval(minutes.id, "minutes")}
                    className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-500 disabled:opacity-50"
                    disabled={!minutes}
                  >
                    Record Minutes Approval
                  </button>
                  {!minutes && (
                    <span className="text-xs text-gray-400">
                      Save minutes before recording approvals.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
