import { useState } from "react";
import PromptInput  from "./components/PromptInput";
import WorkflowPlan from "./components/WorkflowPlan";
import ExecutionLog from "./components/ExecutionLog";
import Results      from "./components/Results";

const DARK = {
  bg:          "#0f0f0f",
  card:        "#1a1a1a",
  border:      "#2a2a2a",
  text:        "#e8e8e8",
  muted:       "#888",
  accent:      "#4d9fff",
  accentHover: "#3a8aee",
  success:     "#69db7c",
  error:       "#ff6b6b",
  logBg:       "#0a0a0a"
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  async function handleRun(prompt) {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("http://localhost:3001/api/workflow/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ ...styles.page, background: DARK.bg, color: DARK.text }}>
      <div style={styles.container}>

        <div style={styles.header}>
          <h1 style={{ ...styles.title, color: DARK.text }}>
            AI Workflow Generator
          </h1>
          <p style={{ ...styles.subtitle, color: DARK.muted }}>
            Enter a prompt — AI plans the workflow, picks the tools, and runs it
          </p>
        </div>

        <PromptInput onRun={handleRun} loading={loading} theme={DARK} />

        {error && (
          <div style={{ ...styles.banner, background: "#2a1010", border: `1px solid ${DARK.error}`, color: DARK.error }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div style={{ ...styles.banner, background: "#0d1a2e", border: `1px solid ${DARK.accent}`, color: DARK.accent }}>
            <span style={styles.spinner}>⟳</span>
            Running workflow — AI is planning and executing your request...
          </div>
        )}

        {data && (
          <>
            <WorkflowPlan plan={data.plan} theme={DARK} />
            <ExecutionLog logs={data.logs} theme={DARK} />
            <Results      results={data.results} theme={DARK} />
          </>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight:  "100vh",
    padding:    "40px 0"
  },
  container: {
    maxWidth:   820,
    margin:     "0 auto",
    padding:    "0 24px"
  },
  header: {
    marginBottom: 32
  },
  title: {
    fontSize:     34,
    fontWeight:   700,
    margin:       "0 0 8px 0",
    fontFamily:   "system-ui, sans-serif"
  },
  subtitle: {
    fontSize:   15,
    margin:     0,
    fontFamily: "system-ui, sans-serif"
  },
  banner: {
    borderRadius: 8,
    padding:      "14px 18px",
    marginTop:    16,
    fontSize:     14,
    fontFamily:   "system-ui, sans-serif",
    display:      "flex",
    alignItems:   "center",
    gap:          10
  },
  spinner: {
    fontSize:  18,
    animation: "spin 1s linear infinite"
  }
};
