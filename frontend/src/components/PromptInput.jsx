import { useState } from "react";

export default function PromptInput({ onRun, loading, theme }) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (prompt.trim()) onRun(prompt.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        rows={4}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="e.g. Search Reddit for AI news and summarize it"
        disabled={loading}
        style={{
          width:           "100%",
          fontSize:        15,
          padding:         14,
          borderRadius:    8,
          border:          `1px solid ${theme.border}`,
          background:      theme.card,
          color:           theme.text,
          marginBottom:    12,
          boxSizing:       "border-box",
          resize:          "vertical",
          fontFamily:      "system-ui, sans-serif",
          outline:         "none"
        }}
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        style={{
          background:   (loading || !prompt.trim()) ? "#1e3a5f" : theme.accent,
          color:        "#fff",
          border:       "none",
          borderRadius: 8,
          padding:      "12px 28px",
          fontSize:     15,
          fontWeight:   600,
          cursor:       (loading || !prompt.trim()) ? "not-allowed" : "pointer",
          fontFamily:   "system-ui, sans-serif",
          transition:   "background 0.2s"
        }}
      >
        {loading ? "Running..." : "Run Workflow"}
      </button>
    </form>
  );
}
