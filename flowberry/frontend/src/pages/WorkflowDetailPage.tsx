import { useParams } from "react-router-dom";
import StepTimeline from "../components/StepTimeline";
import { useWorkflow, useWorkflowSteps } from "../hooks/useWorkflow";
import { api } from "../services/api";

export default function WorkflowDetailPage() {
  const { id = "" } = useParams();
  const workflow = useWorkflow(id);
  const steps = useWorkflowSteps(id);
  const parsedSteps = (steps.data ?? []).map((step) => {
    if (!step.output_payload) return { step, output: null as any };
    try {
      return { step, output: JSON.parse(step.output_payload) };
    } catch {
      return { step, output: step.output_payload };
    }
  });
  async function approveEmail(stepId: string) {
    await api.post(`/workflows/${id}/steps/${stepId}/approve-email`);
    await steps.refetch();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{workflow.data?.name ?? "Workflow Detail"}</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
        <p>ID: {workflow.data?.id}</p>
        <p>
          Status: <span className="text-[color:var(--fb-accent)]">{workflow.data?.status}</span>
        </p>
        <p className="text-sm text-white/70">Intent: {workflow.data?.intent_summary}</p>
      </div>
      <StepTimeline steps={steps.data ?? []} />
      <div className="space-y-3">
        {parsedSteps
          .filter(({ step }) => step.step_type === "report-generation")
          .map(({ step, output }) => (
            <div key={step.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-sm font-medium">Report Output</p>
              {output ? (
                typeof output === "string" ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-white/90">
                    {output}
                  </pre>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-white">
                    {"summary" in output ? (
                      <p className="whitespace-pre-wrap text-sm text-white">{output.summary}</p>
                    ) : null}
                    <details className="rounded bg-zinc-950 p-3 text-xs text-white/90">
                      <summary className="cursor-pointer text-white/70">Raw payload</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
                    </details>
                  </div>
                )
              ) : (
                <p className="mt-2 text-xs text-white/70">No report payload yet.</p>
              )}
            </div>
          ))}
      </div>
      <div className="space-y-3">
        {parsedSteps
          .filter(({ step }) => step.step_type === "csv-analysis")
          .map(({ step, output }) => (
            <div key={step.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-sm font-medium">CSV Analysis</p>
              {output ? (
                typeof output === "string" ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-white/90">
                    {output}
                  </pre>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-white">
                    {"row_count" in output ? (
                      <div className="space-y-1 text-sm">
                        <p><span className="text-white/70">Rows:</span> {output.row_count}</p>
                        <p><span className="text-white/70">Columns:</span> {output.column_count}</p>
                        <p><span className="text-white/70">Headers:</span> {(output.columns ?? []).join(", ")}</p>
                      </div>
                    ) : null}
                    {"report_file" in output ? (
                      <p className="text-xs text-white/70">Report file: {output.report_file?.path}</p>
                    ) : null}
                    {"gemini_summary" in output ? (
                      <div className="rounded bg-zinc-950 p-3 text-xs text-white/90 whitespace-pre-wrap">
                        {output.gemini_summary}
                      </div>
                    ) : null}
                    {"drive" in output ? (
                      <p className="text-xs text-white/70">Drive file: {output.drive?.web_view_link ?? output.drive?.file_id}</p>
                    ) : null}
                    <details className="rounded bg-zinc-950 p-3 text-xs text-white/90">
                      <summary className="cursor-pointer text-white/70">Raw payload</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
                    </details>
                  </div>
                )
              ) : (
                <p className="mt-2 text-xs text-white/70">No CSV payload yet.</p>
              )}
            </div>
          ))}
      </div>
      <div className="space-y-3">
        {parsedSteps
          .filter(({ step }) => step.step_type === "email-send")
          .map(({ step, output }) => (
            <div key={step.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Email Draft</p>
                {step.status === "waiting_approval" ? (
                  <button
                    onClick={() => approveEmail(step.id)}
                    className="rounded px-3 py-1 text-xs font-medium text-white"
                    style={{ background: "var(--fb-accent)" }}
                  >
                    Approve Send
                  </button>
                ) : null}
              </div>
              {output ? (
                typeof output === "string" ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-white/90">
                    {output}
                  </pre>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-white">
                    {"draft" in output ? (
                      <div className="space-y-1 text-sm">
                        <p><span className="text-white/70">To:</span> {output.draft?.to}</p>
                        <p><span className="text-white/70">Subject:</span> {output.draft?.subject}</p>
                        <p className="whitespace-pre-wrap">{output.draft?.body}</p>
                      </div>
                    ) : null}
                    <details className="rounded bg-zinc-950 p-3 text-xs text-white/90">
                      <summary className="cursor-pointer text-white/70">Raw payload</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
                    </details>
                  </div>
                )
              ) : (
                <p className="mt-2 text-xs text-white/70">No draft payload yet.</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
