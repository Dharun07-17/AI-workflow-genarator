import { useSearchParams } from "react-router-dom";
import LogViewer from "../components/LogViewer";
import { useWorkflowLogs } from "../hooks/useWorkflow";

export default function WorkflowLogsPage() {
  const [params] = useSearchParams();
  const workflowId = params.get("workflowId") ?? "";
  const logs = useWorkflowLogs(workflowId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Workflow Logs</h2>
      <p className="text-sm text-zinc-400">Add ?workflowId=&lt;id&gt; to view a workflow trace.</p>
      <LogViewer logs={logs.data ?? []} />
    </div>
  );
}
