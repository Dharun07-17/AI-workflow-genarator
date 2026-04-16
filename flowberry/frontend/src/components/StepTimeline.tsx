import type { WorkflowStep } from "../types";

export default function StepTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">{step.step_order}. {step.step_name}</p>
            <span
              className="rounded border px-2 py-1 text-xs uppercase tracking-wide text-white"
              style={{ background: "var(--fb-accent-soft)", borderColor: "var(--fb-accent-border)" }}
            >
              {step.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/70">Type: {step.step_type}</p>
          {step.depends_on_step_id ? <p className="text-xs text-white/60">Depends on: {step.depends_on_step_id}</p> : null}
        </div>
      ))}
    </div>
  );
}
