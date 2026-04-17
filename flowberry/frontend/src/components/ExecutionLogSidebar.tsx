import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecentLogs } from "../hooks/useRecentLogs";
import { useRecentWorkflows } from "../hooks/useRecentWorkflows";
import { useWorkflowLogs } from "../hooks/useWorkflow";
import type { RecentWorkflow, RecentWorkflowLog, WorkflowLog } from "../types";

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

function formatDay(ts: string) {
  try {
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function LogList({ logs }: { logs: WorkflowLog[] }) {
  return (
    <div className="space-y-2 text-sm">
      {logs.map((log) => (
        <div key={log.id} className="rounded border border-zinc-800 bg-zinc-950 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60">{formatTs(log.created_at)}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-white/70">{log.level}</span>
          </div>
          <p className="mt-1 text-xs text-white">{log.message}</p>
          {log.trace_id ? <p className="mt-1 text-[10px] text-white/50">trace: {log.trace_id}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default function ExecutionLogSidebar({
  open,
  onClose,
  currentWorkflowId,
}: {
  open: boolean;
  onClose: () => void;
  currentWorkflowId?: string;
}) {
  const navigate = useNavigate();
  const workflows = useRecentWorkflows({ limit: 80 });
  const liveFeed = useRecentLogs({ workflowId: "", limit: 140 });

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(() => {
    const raw = localStorage.getItem("flowberry_selected_workflow_id");
    return raw ? String(raw) : null;
  });

  useEffect(() => {
    if (selectedWorkflowId) localStorage.setItem("flowberry_selected_workflow_id", selectedWorkflowId);
  }, [selectedWorkflowId]);

  const selectedWorkflow: RecentWorkflow | undefined = useMemo(() => {
    const list = workflows.data ?? [];
    return list.find((w) => w.id === selectedWorkflowId);
  }, [selectedWorkflowId, workflows.data]);

  const selectedLogs = useWorkflowLogs(selectedWorkflowId ?? "");

  useEffect(() => {
    if (currentWorkflowId && !selectedWorkflowId) setSelectedWorkflowId(currentWorkflowId);
  }, [currentWorkflowId, selectedWorkflowId]);

  const groupedLiveFeed = useMemo(() => {
    const items = liveFeed.data ?? [];
    const map = new Map<string, { name: string; workflowId: string; status: string; logs: RecentWorkflowLog[] }>();
    for (const l of items) {
      const key = l.workflow_id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { name: l.workflow_name, workflowId: l.workflow_id, status: l.workflow_status, logs: [l] });
      } else {
        existing.logs.push(l);
      }
    }
    return Array.from(map.values());
  }, [liveFeed.data]);

  if (!open) return null;

  return (
    <aside className="hidden lg:block w-[380px] shrink-0">
      <div className="sticky top-4 rounded-lg border border-zinc-700 bg-zinc-900/70 backdrop-blur">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Execution Logs</p>
            {selectedWorkflow ? (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-white/70">Selected</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!currentWorkflowId}
              onClick={() => setSelectedWorkflowId(currentWorkflowId ?? null)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-40"
              title={!currentWorkflowId ? "Open a workflow to jump to its logs." : undefined}
            >
              Current
            </button>
            {selectedWorkflowId ? (
              <button
                onClick={() => setSelectedWorkflowId(null)}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-white/70 hover:text-white"
                title="Back to list"
              >
                Back
              </button>
            ) : null}
            <button onClick={onClose} className="rounded border border-zinc-700 px-2 py-1 text-xs text-white/70 hover:text-white">
              Hide
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-140px)] overflow-auto p-3">
          {selectedWorkflowId ? (
            <div className="space-y-3">
              <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{selectedWorkflow?.name ?? "Workflow"}</p>
                    <p className="mt-1 text-[11px] text-white/60">
                      {selectedWorkflow ? `${formatDay(selectedWorkflow.created_at)} • ${selectedWorkflow.status}` : selectedWorkflowId}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => navigate(`/workflows/${selectedWorkflowId}`)}
                      className="rounded border border-zinc-700 px-2 py-1 text-xs text-white hover:bg-zinc-800"
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>

              {selectedLogs.isLoading ? <p className="text-xs text-white/60">Loading logs...</p> : null}
              {selectedLogs.isError ? <p className="text-xs text-red-300">Failed to load logs.</p> : null}
              {(selectedLogs.data ?? []).length === 0 && !selectedLogs.isLoading && !selectedLogs.isError ? (
                <p className="text-xs text-white/60">No logs yet.</p>
              ) : null}
              <LogList logs={selectedLogs.data ?? []} />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-white/80">Your Recent Runs</p>
                <p className="mt-1 text-[11px] text-white/50">Open logs without remembering an ID.</p>
              </div>

              {workflows.isLoading ? <p className="text-xs text-white/60">Loading workflows...</p> : null}
              {workflows.isError ? <p className="text-xs text-red-300">Failed to load workflows.</p> : null}
              {(workflows.data ?? []).length === 0 && !workflows.isLoading && !workflows.isError ? (
                <p className="text-xs text-white/60">No workflows yet.</p>
              ) : null}

              <div className="space-y-2">
                {(workflows.data ?? []).slice(0, 24).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkflowId(w.id)}
                    className="w-full rounded border border-zinc-800 bg-zinc-950/30 p-3 text-left hover:border-zinc-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-medium text-white">{w.name}</p>
                      <span className="shrink-0 text-[10px] uppercase text-white/60">{w.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">{formatDay(w.created_at)}</p>
                  </button>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-semibold text-white/80">Live Feed</p>
                {liveFeed.isLoading ? <p className="text-xs text-white/60">Loading logs...</p> : null}
                {liveFeed.isError ? <p className="text-xs text-red-300">Failed to load logs.</p> : null}

                {groupedLiveFeed.slice(0, 6).map((g) => (
                  <div key={g.workflowId} className="mb-3 rounded border border-zinc-800 bg-zinc-950/40">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <button
                        onClick={() => setSelectedWorkflowId(g.workflowId)}
                        className="min-w-0 truncate text-xs font-medium text-white hover:text-white/80"
                        title="Open logs"
                      >
                        {g.name}
                      </button>
                      <span className="text-[10px] uppercase text-white/60">{g.status}</span>
                    </div>
                    <div className="space-y-2 px-3 py-2">
                      {g.logs.slice(-4).map((l) => (
                        <div key={l.id} className="rounded border border-zinc-800 bg-zinc-950 p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white/60">{formatTs(l.created_at)}</span>
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-white/70">
                              {l.level}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white">{l.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-white/50">
                  Live feed shows recent log messages across your runs. Click a name to open full logs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
