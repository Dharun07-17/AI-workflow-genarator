export default function ExecutionLog({ logs, theme }) {
  if (!logs || logs.length === 0) return null;

  function getColor(log) {
    if (log.startsWith("Error")) return theme.error;
    if (log.startsWith("Done"))  return theme.success;
    return "#aaa";
  }

  return (
    <div style={{ ...styles.card, background: theme.card, border: `1px solid ${theme.border}` }}>
      <h2 style={{ ...styles.heading, color: theme.text }}>Execution Log</h2>
      <div style={{ ...styles.logBox, background: theme.logBg }}>
        {logs.map((log, i) => (
          <div key={i} style={{ ...styles.logLine, color: getColor(log) }}>
            <span style={styles.lineNum}>{String(i + 1).padStart(2, "0")}</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card:    { borderRadius: 8, padding: 20, marginTop: 24 },
  heading: { fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0, fontFamily: "system-ui, sans-serif" },
  logBox:  { borderRadius: 6, padding: "12px 16px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 },
  logLine: { display: "flex", gap: 14, padding: "1px 0" },
  lineNum: { color: "#444", minWidth: 28, textAlign: "right", userSelect: "none", flexShrink: 0 }
};
