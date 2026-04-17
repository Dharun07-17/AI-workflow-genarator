import { PropsWithChildren, useEffect, useState } from "react";
import { Link, useMatch } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import ExecutionLogSidebar from "../components/ExecutionLogSidebar";

export default function AppLayout({ children }: PropsWithChildren) {
  const { role, clear } = useAuthStore();
  const workflowMatch = useMatch("/workflows/:id");
  const currentWorkflowId = workflowMatch?.params?.id;

  const [logsOpen, setLogsOpen] = useState<boolean>(() => {
    const raw = localStorage.getItem("flowberry_logs_sidebar_open");
    if (raw === null) return true;
    return raw === "true";
  });

  useEffect(() => {
    localStorage.setItem("flowberry_logs_sidebar_open", String(logsOpen));
  }, [logsOpen]);

  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-zinc-700 bg-zinc-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/workflows" className="flex items-center gap-3">
            <img
              src="/flowberry.ico"
              alt="Flowberry"
              className="h-9 w-9 rounded bg-zinc-950/40 ring-1 ring-zinc-700"
            />
            <div>
              <p className="text-lg font-bold text-[color:var(--fb-accent)]">Flowberry</p>
              <p className="text-xs text-white/70">Fizz AI Workflow Automation</p>
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/workflows" className="text-white hover:text-white/80">Workflows</Link>
            <Link to="/integrations" className="text-white hover:text-white/80">Integrations</Link>
            <button
              onClick={() => setLogsOpen((v) => !v)}
              className="text-white hover:text-white/80"
              title="Toggle execution logs"
            >
              Logs
            </button>
            <Link to="/settings" className="text-white hover:text-white/80">Settings</Link>
            {role === "admin" ? <Link to="/admin" className="text-white hover:text-white/80">Admin</Link> : null}
            <button onClick={clear} className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800">Logout</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <ExecutionLogSidebar
          open={logsOpen}
          onClose={() => setLogsOpen(false)}
          currentWorkflowId={currentWorkflowId}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
