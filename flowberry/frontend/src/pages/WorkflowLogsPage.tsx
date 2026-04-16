import { useSearchParams } from "react-router-dom";
import StepTimeline from "../components/StepTimeline";
import { useWorkflowSteps } from "../hooks/useWorkflow";

export default function WorkflowLogsPage() {
  const [params] = useSearchParams();
  const workflowId = params.get("workflowId") ?? "";
  const steps = useWorkflowSteps(workflowId);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Workflow Logs</h2>
      <p className="text-sm text-zinc-400">Add ?workflowId=&lt;id&gt; to view module status.</p>
      {workflowId ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-300">Module Status</h3>
          <StepTimeline steps={steps.data ?? []} />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-400">
          Provide a workflow id to see module status. Outputs are hidden on this page.
        </div>
      )}
    </div>
  );
}
