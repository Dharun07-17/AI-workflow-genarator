import type { WorkflowLog } from "../types";

export default function LogViewer({ logs }: { logs: WorkflowLog[] }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">Execution Logs</h3>
      <div className="space-y-2 text-sm">
        {logs.map((log) => (
          <div key={log.id} className="rounded border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">{new Date(log.created_at).toLocaleString()}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] uppercase">{log.level}</span>
            </div>
            <p className="mt-2 text-white">{log.message}</p>
            {log.trace_id ? <p className="mt-1 text-xs text-white/60">trace: {log.trace_id}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
