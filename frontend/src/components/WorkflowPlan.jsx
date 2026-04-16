export default function WorkflowPlan({ plan, theme }) {
  if (!plan || !plan.steps || plan.steps.length === 0) return null;

  const toolColors = {
    reddit:     "#ff6314",
    ollama:     "#5a3b6f",
    x:          "#1da1f2",
    twitter:    "#1da1f2",
    hackernews: "#ff6600",
    hn:         "#ff6600",
    csv:        "#28a745",
    calendar:   "#ffc107",
    email:      "#dc3545"
  };

  return (
    <div style={{ ...styles.card, background: theme.card, border: `1px solid ${theme.border}` }}>
      <h2 style={{ ...styles.heading, color: theme.text }}>Workflow Plan</h2>
      <div style={styles.steps}>
        {plan.steps.map((step, i) => (
          <div key={i} style={{ ...styles.step, background: theme.bg, border: `1px solid ${theme.border}` }}>
            <span style={{ ...styles.badge, background: toolColors[step.tool] || theme.accent }}>
              {i + 1}
            </span>
            <span style={{ ...styles.tool, color: toolColors[step.tool] || theme.accent }}>
              {step.tool.toUpperCase()}
            </span>
            <span style={{ ...styles.input, color: theme.muted }}>
              {step.input.length > 80 ? step.input.slice(0, 80) + "..." : step.input}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card:    { borderRadius: 8, padding: 20, marginTop: 24 },
  heading: { fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0, fontFamily: "system-ui, sans-serif" },
  steps:   { display: "flex", flexDirection: "column", gap: 8 },
  step:    { display: "flex", alignItems: "center", gap: 12, borderRadius: 6, padding: "10px 14px" },
  badge:   { color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  tool:    { fontWeight: 700, minWidth: 72, fontSize: 12, fontFamily: "monospace" },
  input:   { fontSize: 13, fontFamily: "system-ui, sans-serif" }
};
