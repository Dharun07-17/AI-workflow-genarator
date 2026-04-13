function renderValue(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export default function OutputView({ results, finalOutput }) {
  if (!results || results.length === 0) return null
  return (
    <div style={{ background: '#1e1e2e', border: '1px solid #2d2d44', borderRadius: 12, padding: '1.5rem' }}>
      <h2 style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Step Outputs</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {results.map((r, i) => (
          <div key={i} style={{ border: '1px solid #2d2d44', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#2d1b69', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#a78bfa', fontWeight: 600 }}>Step {r.step}: {r.tool}</span>
              <span style={{ fontSize: '0.75rem', background: '#1a1040', color: '#7c3aed', padding: '0.15rem 0.5rem', borderRadius: 4 }}>{i === results.length - 1 ? 'final' : 'intermediate'}</span>
            </div>
            <pre style={{ margin: 0, padding: '1rem', background: '#0f1117', color: '#94a3b8', fontSize: '0.8rem', overflow: 'auto', maxHeight: 220, fontFamily: 'monospace' }}>{renderValue(r.output)}</pre>
          </div>
        ))}
      </div>
      {finalOutput && (
        <div style={{ marginTop: '1.5rem', background: '#0a1f0a', border: '1px solid #14532d', borderRadius: 8, padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final Output</div>
          <pre style={{ margin: 0, color: '#86efac', fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderValue(finalOutput)}</pre>
        </div>
      )}
    </div>
  )
}
