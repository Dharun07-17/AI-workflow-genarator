export default function PlanView({ plan }) {
  if (!plan || plan.length === 0) return null
  return (
    <div style={{ background: '#1e1e2e', border: '1px solid #2d2d44', borderRadius: 12, padding: '1.5rem' }}>
      <h2 style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Execution Plan ({plan.length} steps)</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {plan.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ minWidth: 28, height: 28, background: '#2d1b69', border: '1px solid #5b21b6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa' }}>{i + 1}</div>
            <div style={{ flex: 1, background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#a78bfa', fontWeight: 600 }}>{step.tool}</div>
              {step.args && Object.keys(step.args).length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {Object.entries(step.args).map(([k, v]) => (
                    <span key={k} style={{ background: '#1e1e2e', border: '1px solid #2d2d44', borderRadius: 4, padding: '0.15rem 0.5rem', fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {k}: <span style={{ color: '#e2e8f0' }}>{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <details style={{ marginTop: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}>View raw JSON</summary>
        <pre style={{ marginTop: '0.5rem', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 6, padding: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', overflow: 'auto' }}>{JSON.stringify(plan, null, 2)}</pre>
      </details>
    </div>
  )
}
