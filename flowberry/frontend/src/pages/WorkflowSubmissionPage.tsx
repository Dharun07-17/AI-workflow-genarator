import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function WorkflowSubmissionPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post<{ data: { workflow_id: string } }>("/workflows", { prompt });
      setWorkflowId(data.data.workflow_id);
      navigate(`/workflows/${data.data.workflow_id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Create Workflow</h2>
      <textarea
        className="h-40 w-full rounded border border-zinc-700 bg-zinc-900 p-4 text-zinc-100"
        placeholder="Summarize today's reports, email them, and schedule a meeting tomorrow at 4 PM"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={onSubmit}
        disabled={loading}
        className="rounded bg-berry-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Run with Fizz"}
      </button>
      {workflowId ? <p className="text-sm text-zinc-400">Workflow queued: {workflowId}</p> : null}
    </div>
  );
}
