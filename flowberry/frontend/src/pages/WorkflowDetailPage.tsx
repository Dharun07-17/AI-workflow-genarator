import { useParams } from "react-router-dom";
import StepTimeline from "../components/StepTimeline";
import { useWorkflow, useWorkflowSteps } from "../hooks/useWorkflow";

export default function WorkflowDetailPage() {
  const { id = "" } = useParams();
  const workflow = useWorkflow(id);
  const steps = useWorkflowSteps(id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Workflow Detail</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
        <p>ID: {workflow.data?.id}</p>
        <p>Status: <span className="text-berry-700">{workflow.data?.status}</span></p>
        <p className="text-sm text-zinc-400">Intent: {workflow.data?.intent_summary}</p>
      </div>
      <StepTimeline steps={steps.data ?? []} />
    </div>
  );
}
