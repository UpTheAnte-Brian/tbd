"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import LoadingSpinner from "@/app/components/loading-spinner";
import BoardOfDirectors from "@/app/components/nonprofits/BoardOfDirectors";
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

const MINUTES_TEMPLATE = `## Meeting Information
- **Date:** {{meeting_date}}
- **Time:** {{start_time}} - {{end_time}}
- **Type:** {{regular | special}}
- **Location / Medium:** {{in person | virtual | hybrid}}

## Attendance
The following board members were present:
- {{Name}}

The following board members were absent:
- {{Name}}

A quorum was [ ] present [ ] not present.

## Call to Order
The meeting was called to order by {{Chair Name}} at {{time}}.

## Approval of Previous Minutes
The minutes of the previous meeting were [ ] approved [ ] approved as amended.

## Motions and Actions
1. **Motion:** {{Motion title or description}}
   - Moved by: {{Name}}
   - Seconded by: {{Name}}
   - Vote: {{Approved | Rejected | Tabled}}
   - Result: {{# Yes}} Yes, {{# No}} No, {{# Abstain}} Abstain

## Reports (if any)
- {{Treasurer's report accepted}}
- {{Committee updates}}

## New Business
- {{Brief summary of actions taken}}

## Adjournment
The meeting was adjourned at {{time}}.

---

**Submitted by:** {{Secretary Name}}`;
export default function GovernancePanel({ nonprofitId }: GovernancePanelProps) {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileSearchResult | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState<BoardMember["role"]>(
    "director",
  );
  const [selectedStatus, setSelectedStatus] = useState<BoardMember["status"]>(
    "active",
  );
  const [termStart, setTermStart] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [termEnd, setTermEnd] = useState("");
  const [meetingDraft, setMeetingDraft] = useState({
    title: "",
    meeting_type: "",
    scheduled_start: "",
    scheduled_end: "",
  });
  const [motionDrafts, setMotionDrafts] = useState<
    Record<string, Partial<Motion>>
  >({});
  const [minutesDrafts, setMinutesDrafts] = useState<Record<string, string>>(
    {},
  );
  const [voteDrafts, setVoteDrafts] = useState<
    Record<string, { board_member_id: string; vote: "yes" | "no" | "abstain" }>
  >({});
  const [approvalDrafts, setApprovalDrafts] = useState<
    Record<string, { board_member_id: string }>
  >({});

  const boardId = snapshot?.board.id;

  const activeMembers = useMemo(
    () => (snapshot?.members ?? []).filter((m) => m.status === "active"),
    [snapshot?.members],
  );

  const selectedUserAlreadyMember = useMemo(() => {
    if (!selectedUser?.id) return false;
    return (snapshot?.members ?? []).some(
      (member) => member.user_id === selectedUser.id,
    );
  }, [snapshot?.members, selectedUser]);

  const membersById = useMemo(() => {
    const map: Record<string, BoardMember> = {};
    (snapshot?.members ?? []).forEach((member) => {
      map[member.id] = member;
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
    (snapshot?.minutes ?? []).forEach((minute) => {
      map[minute.meeting_id] = minute;
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
      (json.minutes ?? []).forEach((minute) => {
        minutesMap[minute.meeting_id] = minute.content ?? "";
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
      if (selectedUser && searchText === selectedUser.full_name) {
        setSearchResults([]);
        return;
      }
      if (!searchText || searchText.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/profiles/search?q=${encodeURIComponent(searchText)}`,
          {
            signal: controller.signal,
          },
        );
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
  }, [searchText, selectedUser]);

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setSearchText("");
    setSearchResults([]);
  };

  async function addMember() {
    if (!boardId) return;
    if (!selectedUser?.id) {
      toast.error("Select a user first");
      return;
    }
    if (selectedUserAlreadyMember) {
      toast.error("This user is already on the board. Update the existing entry instead.");
      return;
    }
    if (!termStart) {
      toast.error("Term start date is required");
      return;
    }
    const duplicate = snapshot?.members?.some(
      (member) => member.user_id === selectedUser.id && member.term_start === termStart,
    );
    if (duplicate) {
      toast.error("This user already has a term starting on that date.");
      return;
    }
    try {
      setMemberLoading(true);
      const res = await fetch(`/api/governance/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          role: selectedRole,
          status: selectedStatus,
          term_start: termStart,
          term_end: termEnd || null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMessage =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Could not add board member";
        if (
          errorMessage.includes("board_members_board_id_user_id_term_start_key") ||
          errorMessage.includes("duplicate key value")
        ) {
          toast.error("This user already has a term starting on that date.");
          return;
        }
        throw new Error(errorMessage);
      }
      toast.success("Board member added");
      clearSelectedUser();
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
    if (!meetingDraft.title || meetingDraft.title.trim().length === 0) {
      toast.error("Meeting title is required");
      return;
    }
    if (!meetingDraft.meeting_type.trim()) {
      toast.error("Meeting type is required");
      return;
    }
    if (!meetingDraft.scheduled_start || !meetingDraft.scheduled_end) {
      toast.error("Start and end date/time are required");
      return;
    }
    try {
      setMeetingLoading(true);
      const res = await fetch(`/api/governance/boards/${boardId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...meetingDraft,
          title: meetingDraft.title.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      toast.success("Meeting scheduled");
      setMeetingDraft({
        title: "",
        meeting_type: "",
        scheduled_start: "",
        scheduled_end: "",
      });
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
      setVoteDrafts((prev) => ({
        ...prev,
        [motionId]: { board_member_id: "", vote: "yes" },
      }));
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

  const membersCount = snapshot.members?.length ?? 0;
  const meetingsCount = snapshot.meetings?.length ?? 0;
  const motionsCount = snapshot.motions?.length ?? 0;
  const votesCount = snapshot.votes?.length ?? 0;

  return (
    <div className="space-y-8 text-gray-100">
      <div>
        <p className="text-sm text-gray-400">
          Governance is separate from operational roles. Only board members below can vote on
          motions and approve minutes.
        </p>
        <div className="mt-4">
          <BoardOfDirectors
            nonprofitId={nonprofitId}
            members={snapshot.members ?? []}
          />
        </div>
      </div>

      <div className="space-y-4">
        <AccordionSection title={`Meetings (${meetingsCount})`} defaultOpen>
          <MeetingsSection
            meetings={snapshot.meetings ?? []}
            meetingDraft={meetingDraft}
            onMeetingDraftChange={(draft) => setMeetingDraft(draft)}
            onCreateMeeting={createMeeting}
            meetingLoading={meetingLoading}
            minutesByMeeting={minutesByMeeting}
            minutesDrafts={minutesDrafts}
            onMinutesChange={(meetingId, value) =>
              setMinutesDrafts((prev) => ({ ...prev, [meetingId]: value }))
            }
            onSaveMinutes={saveMinutes}
            approvalDrafts={approvalDrafts}
            onApprovalDraftChange={(entityId, boardMemberId) =>
              setApprovalDrafts((prev) => ({
                ...prev,
                [entityId]: { board_member_id: boardMemberId },
              }))
            }
            activeMembers={activeMembers}
            onAddMinutesApproval={(entityId) => addApproval(entityId, "minutes")}
          />
        </AccordionSection>

        <AccordionSection title={`Motions (${motionsCount})`}>
          <MotionsSection
            meetings={snapshot.meetings ?? []}
            motionsByMeeting={motionsByMeeting}
            motionDrafts={motionDrafts}
            onMotionDraftChange={(meetingId, updates) =>
              setMotionDrafts((prev) => ({
                ...prev,
                [meetingId]: { ...(prev[meetingId] ?? {}), ...updates },
              }))
            }
            activeMembers={activeMembers}
            onCreateMotion={createMotion}
            onFinalizeMotion={finalizeMotion}
          />
        </AccordionSection>

        <AccordionSection title={`Votes (${votesCount})`}>
          <VotesSection
            meetings={snapshot.meetings ?? []}
            motionsByMeeting={motionsByMeeting}
            votesByMotion={votesByMotion}
            voteDrafts={voteDrafts}
            onVoteDraftChange={(motionId, updates) =>
              setVoteDrafts((prev) => ({
                ...prev,
                [motionId]: { ...(prev[motionId] ?? {}), ...updates },
              }))
            }
            activeMembers={activeMembers}
            membersById={membersById}
            onSubmitVote={submitVote}
            approvals={snapshot.approvals ?? []}
            approvalDrafts={approvalDrafts}
            onApprovalDraftChange={(entityId, boardMemberId) =>
              setApprovalDrafts((prev) => ({
                ...prev,
                [entityId]: { board_member_id: boardMemberId },
              }))
            }
            onAddMotionApproval={(entityId) => addApproval(entityId, "motion")}
          />
        </AccordionSection>

        <AccordionSection title={`Board Management (${membersCount})`}>
          <BoardManagementSection
            nonprofitId={nonprofitId}
            members={snapshot.members ?? []}
            selectedUser={selectedUser}
            searchText={searchText}
            onSearchTextChange={(value) => {
              if (selectedUser) {
                setSelectedUser(null);
              }
              setSearchText(value);
            }}
            searchResults={searchResults}
            onSelectUser={(user) => {
              setSelectedUser(user);
              setSearchText(user.full_name ?? "");
              setSearchResults([]);
            }}
            onClearUser={clearSelectedUser}
            selectedUserAlreadyMember={selectedUserAlreadyMember}
            selectedRole={selectedRole}
            onRoleChange={(value) => setSelectedRole(value)}
            selectedStatus={selectedStatus}
            onStatusChange={(value) => setSelectedStatus(value)}
            termStart={termStart}
            termEnd={termEnd}
            onTermStartChange={(value) => setTermStart(value)}
            onTermEndChange={(value) => setTermEnd(value)}
            onAddMember={addMember}
            memberLoading={memberLoading}
            onUpdateMember={updateMember}
            onRemoveMember={removeMember}
          />
        </AccordionSection>
      </div>
    </div>
  );
}

interface AccordionSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function AccordionSection({
  title,
  description,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  return (
    <details
      className="border border-gray-700 rounded bg-gray-900/60"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-4 py-3 font-semibold text-lg text-gray-100">
        <span>{title}</span>
        {description && (
          <span className="block text-sm text-gray-400 font-normal">{description}</span>
        )}
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-4">{children}</div>
    </details>
  );
}

interface BoardManagementSectionProps {
  nonprofitId: string;
  members: BoardMember[];
  selectedUser: ProfileSearchResult | null;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  searchResults: ProfileSearchResult[];
  onSelectUser: (user: ProfileSearchResult) => void;
  onClearUser: () => void;
  selectedUserAlreadyMember: boolean;
  selectedRole: BoardMember["role"];
  onRoleChange: (value: BoardMember["role"]) => void;
  selectedStatus: BoardMember["status"];
  onStatusChange: (value: BoardMember["status"]) => void;
  termStart: string;
  termEnd: string;
  onTermStartChange: (value: string) => void;
  onTermEndChange: (value: string) => void;
  onAddMember: () => void;
  memberLoading: boolean;
  onUpdateMember: (memberId: string, updates: Partial<BoardMember>) => void;
  onRemoveMember: (memberId: string) => void;
}

function BoardManagementSection({
  nonprofitId,
  members,
  selectedUser,
  searchText,
  onSearchTextChange,
  searchResults,
  onSelectUser,
  onClearUser,
  selectedUserAlreadyMember,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  termStart,
  termEnd,
  onTermStartChange,
  onTermEndChange,
  onAddMember,
  memberLoading,
  onUpdateMember,
  onRemoveMember,
}: BoardManagementSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-700 bg-gray-950/60 p-4">
        <BoardOfDirectors
          nonprofitId={nonprofitId}
          members={members}
        />
      </div>

      <div className="space-y-3">
        {members.length === 0 && (
          <p className="text-gray-400">No board members yet.</p>
        )}

        {members.map((member) => (
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
                  onUpdateMember(member.id, {
                    role: e.target.value as BoardMember["role"],
                  })
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
                  onUpdateMember(member.id, {
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
                onClick={() => onRemoveMember(member.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border border-gray-700 rounded space-y-3 bg-gray-900/60">
        <h3 className="font-semibold text-lg">Add Board Member</h3>
        <div className="rounded border border-gray-700 bg-gray-950">
          <div className="relative">
            <input
              value={selectedUser?.full_name ?? searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              placeholder="Search users by name"
              className="w-full p-2 rounded bg-transparent text-gray-100 placeholder:text-gray-400 focus:outline-none"
            />
            {selectedUser && (
              <button
                type="button"
                onClick={onClearUser}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-300 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          {searchResults.length > 0 && !selectedUser && (
            <div className="border-t border-gray-800">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full text-left px-3 py-2 text-gray-100 hover:bg-gray-900"
                  onClick={() => onSelectUser(result)}
                >
                  {result.full_name ?? "Unnamed User"}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedUserAlreadyMember && (
          <p className="text-sm text-amber-300">
            This user already has a board entry. Update the existing record instead of adding
            another term.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value as BoardMember["role"])}
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
            onChange={(e) => onStatusChange(e.target.value as BoardMember["status"])}
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
              onChange={(e) => onTermStartChange(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Term end (optional)</label>
            <input
              type="date"
              value={termEnd}
              onChange={(e) => onTermEndChange(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded px-2 py-2 text-gray-100"
            />
          </div>
        </div>

        <button
          onClick={onAddMember}
          disabled={memberLoading || selectedUserAlreadyMember}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
        >
          {memberLoading ? <LoadingSpinner /> : "Add Member"}
        </button>
      </div>
    </div>
  );
}

interface MeetingsSectionProps {
  meetings: BoardMeeting[];
  meetingDraft: {
    title: string;
    meeting_type: string;
    scheduled_start: string;
    scheduled_end: string;
  };
  onMeetingDraftChange: (draft: MeetingsSectionProps["meetingDraft"]) => void;
  onCreateMeeting: () => void;
  meetingLoading: boolean;
  minutesByMeeting: Record<string, MeetingMinutes>;
  minutesDrafts: Record<string, string>;
  onMinutesChange: (meetingId: string, value: string) => void;
  onSaveMinutes: (meetingId: string) => void;
  approvalDrafts: Record<string, { board_member_id: string }>;
  onApprovalDraftChange: (entityId: string, boardMemberId: string) => void;
  activeMembers: BoardMember[];
  onAddMinutesApproval: (entityId: string) => void;
}

function MeetingsSection({
  meetings,
  meetingDraft,
  onMeetingDraftChange,
  onCreateMeeting,
  meetingLoading,
  minutesByMeeting,
  minutesDrafts,
  onMinutesChange,
  onSaveMinutes,
  approvalDrafts,
  onApprovalDraftChange,
  activeMembers,
  onAddMinutesApproval,
}: MeetingsSectionProps) {
  const [approvalModal, setApprovalModal] = useState<{
    entityId: string;
    meetingTitle: string;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const applyTemplate = (meetingId: string, meeting: BoardMeeting) => {
    const date = meeting.scheduled_start
      ? new Date(meeting.scheduled_start).toLocaleDateString()
      : "{{meeting_date}}";
    const start = meeting.scheduled_start
      ? new Date(meeting.scheduled_start).toLocaleTimeString()
      : "{{start_time}}";
    const end = meeting.scheduled_end
      ? new Date(meeting.scheduled_end).toLocaleTimeString()
      : "{{end_time}}";

    const templated = MINUTES_TEMPLATE.replace("{{meeting_date}}", date)
      .replace("{{start_time}}", start)
      .replace("{{end_time}}", end)
      .replace("{{regular | special}}", meeting.meeting_type ?? "regular");

    onMinutesChange(meetingId, templated);
  };

  const closeModal = () => {
    setApprovalModal(null);
    setAcknowledged(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border-2 border-gray-600 rounded space-y-3 bg-gray-900/70 shadow-sm">
        <h3 className="font-semibold">Schedule Meeting</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Title</label>
            <input
              value={meetingDraft.title}
              onChange={(e) =>
                onMeetingDraftChange({
                  ...meetingDraft,
                  title: e.target.value,
                })
              }
              placeholder="Meeting title"
              className="p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Type</label>
            <input
              value={meetingDraft.meeting_type}
              onChange={(e) =>
                onMeetingDraftChange({
                  ...meetingDraft,
                  meeting_type: e.target.value,
                })
              }
              placeholder="Meeting type (regular, special...)"
              className="p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">Start</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={meetingDraft.scheduled_start}
                onChange={(e) =>
                  onMeetingDraftChange({
                    ...meetingDraft,
                    scheduled_start: e.target.value,
                  })
                }
                className="w-full p-2 pr-10 rounded bg-gray-950 border border-gray-700 text-gray-100"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                📅
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300">End</label>
            <div className="relative">
              <input
                type="datetime-local"
                value={meetingDraft.scheduled_end}
                onChange={(e) =>
                  onMeetingDraftChange({
                    ...meetingDraft,
                    scheduled_end: e.target.value,
                  })
                }
                className="w-full p-2 pr-10 rounded bg-gray-950 border border-gray-700 text-gray-100"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                📅
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onCreateMeeting}
          disabled={meetingLoading}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-gray-700"
        >
          {meetingLoading ? <LoadingSpinner /> : "Create Meeting"}
        </button>
      </div>

      {meetings.length === 0 && (
        <p className="text-gray-400">No meetings scheduled.</p>
      )}

      {meetings.map((meeting) => {
        const minutes = minutesByMeeting[meeting.id];
        return (
          <div
            key={meeting.id}
            className="border border-gray-700 rounded p-4 space-y-4 bg-gray-900/60"
          >
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

            <div className="space-y-2">
              <h4 className="font-semibold">Minutes</h4>
              {minutes?.approved_at ? (
                <div className="space-y-2">
                  <div className="text-xs text-green-300">
                    Approved on {new Date(minutes.approved_at).toLocaleString()}
                  </div>
                  <div className="rounded border border-gray-700 bg-gray-950/70 p-3 whitespace-pre-line text-gray-100">
                    {minutes.content ?? "No minutes content."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <button
                      onClick={() => applyTemplate(meeting.id, meeting)}
                      className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 text-sm"
                    >
                      Insert Standard Minutes Template
                    </button>
                  </div>
                  <textarea
                    value={minutesDrafts[meeting.id] ?? ""}
                    onChange={(e) => onMinutesChange(meeting.id, e.target.value)}
                    className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
                    placeholder="Meeting minutes..."
                    rows={8}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <button
                      onClick={() => onSaveMinutes(meeting.id)}
                      className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                    >
                      Save Minutes
                    </button>

                    <select
                      value={minutes?.id ? approvalDrafts[minutes.id]?.board_member_id ?? "" : ""}
                      onChange={(e) =>
                        minutes?.id && onApprovalDraftChange(minutes.id, e.target.value)
                      }
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100 disabled:opacity-50"
                      disabled={!minutes}
                    >
                      <option value="">Chair/Admin signer</option>
                      {activeMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.profile?.full_name ?? member.user_id}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        minutes?.id && setApprovalModal({
                          entityId: minutes.id,
                          meetingTitle: meeting.meeting_type ?? "Meeting",
                        })
                      }
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
                </>
              )}
            </div>
          </div>
        );
      })}

      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded p-5 space-y-4">
            <h4 className="text-lg font-semibold text-gray-100">Approval is Final</h4>
            <p className="text-sm text-gray-300">
              Once approved, these minutes become the official and permanent record of the
              organization and cannot be edited.
            </p>
            <p className="text-sm text-gray-300">
              Meeting: {approvalModal.meetingTitle}
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-100">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I understand and approve these minutes as final.
            </label>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-3 py-1 rounded border border-gray-600 text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!acknowledged) return;
                  onAddMinutesApproval(approvalModal.entityId);
                  closeModal();
                }}
                disabled={!acknowledged}
                className="px-3 py-1 rounded bg-purple-600 text-white disabled:bg-gray-700"
              >
                Approve Minutes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MotionsSectionProps {
  meetings: BoardMeeting[];
  motionsByMeeting: Record<string, Motion[]>;
  motionDrafts: Record<string, Partial<Motion>>;
  onMotionDraftChange: (meetingId: string, updates: Partial<Motion>) => void;
  activeMembers: BoardMember[];
  onCreateMotion: (meetingId: string) => void;
  onFinalizeMotion: (motionId: string) => void;
}

function MotionsSection({
  meetings,
  motionsByMeeting,
  motionDrafts,
  onMotionDraftChange,
  activeMembers,
  onCreateMotion,
  onFinalizeMotion,
}: MotionsSectionProps) {
  if (meetings.length === 0) {
    return <p className="text-gray-400">Schedule a meeting to add motions.</p>;
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const meetingMotions = motionsByMeeting[meeting.id] ?? [];
        return (
          <div
            key={meeting.id}
            className="border border-gray-700 rounded p-4 space-y-4 bg-gray-900/60"
          >
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

              {meetingMotions.map((motion) => (
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
                        onClick={() => onFinalizeMotion(motion.id)}
                        className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-500"
                      >
                        Finalize
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Add Motion</h4>
              <input
                value={motionDrafts[meeting.id]?.title ?? ""}
                onChange={(e) =>
                  onMotionDraftChange(meeting.id, { title: e.target.value })
                }
                placeholder="Motion title"
                className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
              />
              <textarea
                value={motionDrafts[meeting.id]?.description ?? ""}
                onChange={(e) =>
                  onMotionDraftChange(meeting.id, { description: e.target.value })
                }
                placeholder="Description"
                className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-gray-100 placeholder:text-gray-400"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={motionDrafts[meeting.id]?.moved_by ?? ""}
                  onChange={(e) =>
                    onMotionDraftChange(meeting.id, { moved_by: e.target.value })
                  }
                  className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                >
                  <option value="">Moved by</option>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.profile?.full_name ?? member.user_id}
                    </option>
                  ))}
                </select>
                <select
                  value={motionDrafts[meeting.id]?.seconded_by ?? ""}
                  onChange={(e) =>
                    onMotionDraftChange(meeting.id, { seconded_by: e.target.value })
                  }
                  className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                >
                  <option value="">Seconded by</option>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.profile?.full_name ?? member.user_id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onCreateMotion(meeting.id)}
                className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                Add Motion
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface VotesSectionProps {
  meetings: BoardMeeting[];
  motionsByMeeting: Record<string, Motion[]>;
  votesByMotion: Record<string, Vote[]>;
  voteDrafts: Record<
    string,
    { board_member_id: string; vote: "yes" | "no" | "abstain" }
  >;
  onVoteDraftChange: (
    motionId: string,
    updates: Partial<{
      board_member_id: string;
      vote: "yes" | "no" | "abstain";
    }>,
  ) => void;
  activeMembers: BoardMember[];
  membersById: Record<string, BoardMember>;
  onSubmitVote: (motionId: string) => void;
  approvals: GovernanceSnapshot["approvals"];
  approvalDrafts: Record<string, { board_member_id: string }>;
  onApprovalDraftChange: (entityId: string, boardMemberId: string) => void;
  onAddMotionApproval: (entityId: string) => void;
}

function VotesSection({
  meetings,
  motionsByMeeting,
  votesByMotion,
  voteDrafts,
  onVoteDraftChange,
  activeMembers,
  membersById,
  onSubmitVote,
  approvals,
  approvalDrafts,
  onApprovalDraftChange,
  onAddMotionApproval,
}: VotesSectionProps) {
  const hasMotions = meetings.some(
    (meeting) => (motionsByMeeting[meeting.id] ?? []).length > 0,
  );

  if (!hasMotions) {
    return <p className="text-gray-400">No motions available for voting yet.</p>;
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const meetingMotions = motionsByMeeting[meeting.id] ?? [];
        if (meetingMotions.length === 0) return null;
        return (
          <div
            key={meeting.id}
            className="border border-gray-700 rounded p-4 space-y-4 bg-gray-900/60"
          >
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
              {meetingMotions.map((motion) => {
                const votes = votesByMotion[motion.id] ?? [];
                const motionApprovals = approvals.filter(
                  (approval) =>
                    approval.entity_id === motion.id && approval.entity_type === "motion",
                );
                return (
                  <div
                    key={motion.id}
                    className="border border-gray-700 rounded p-3 space-y-2 bg-gray-950/60"
                  >
                    <div>
                      <p className="font-semibold">
                        {motion.title ?? "Motion"} ({motion.status ?? "draft"})
                      </p>
                      {motion.description && (
                        <p className="text-sm text-gray-300">{motion.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Votes ({votes.length}):{" "}
                        {votes
                          .map(
                            (vote) =>
                              `${vote.vote} by ${
                                membersById[vote.board_member_id]?.profile?.full_name ??
                                membersById[vote.board_member_id]?.user_id ??
                                vote.board_member_id
                              }`,
                          )
                          .join(", ")}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <select
                          value={voteDrafts[motion.id]?.board_member_id ?? ""}
                          onChange={(e) =>
                            onVoteDraftChange(motion.id, {
                              board_member_id: e.target.value,
                              vote: voteDrafts[motion.id]?.vote ?? "yes",
                            })
                          }
                          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                        >
                          <option value="">Select voter</option>
                          {activeMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.profile?.full_name ?? member.user_id}
                            </option>
                          ))}
                        </select>

                        <select
                          value={voteDrafts[motion.id]?.vote ?? "yes"}
                          onChange={(e) =>
                            onVoteDraftChange(motion.id, {
                              board_member_id: voteDrafts[motion.id]?.board_member_id ?? "",
                              vote: e.target.value as "yes" | "no" | "abstain",
                            })
                          }
                          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="abstain">Abstain</option>
                        </select>

                        <button
                          onClick={() => onSubmitVote(motion.id)}
                          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500"
                        >
                          Record Vote
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <select
                          value={approvalDrafts[motion.id]?.board_member_id ?? ""}
                          onChange={(e) =>
                            onApprovalDraftChange(motion.id, e.target.value)
                          }
                          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-100"
                        >
                          <option value="">Approval signer</option>
                          {activeMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.profile?.full_name ?? member.user_id}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onAddMotionApproval(motion.id)}
                          className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-500"
                        >
                          Record Motion Approval ({motionApprovals.length})
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
