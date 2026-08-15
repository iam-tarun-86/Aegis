import React from 'react';
import { Brain, HelpCircle, AlertTriangle } from 'lucide-react';

export function ReasoningSidebar({ subQuestions, criticNotes, nextQuery, logs }) {
  const criticLogs = logs.filter(l => l.node === 'Critic');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Target Sub-questions */}
      {subQuestions.length > 0 && (
        <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '10px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#a5b4fc' }}>
            <HelpCircle size={16} />
            <span>Target Sub-Questions</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {subQuestions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Critic Evaluation & Reasoning */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--warning-accent)' }}>
          <Brain size={16} />
          <span>Critic Gap Analysis</span>
        </div>

        {criticNotes ? (
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0', background: 'rgba(2, 6, 23, 0.4)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--bg-panel-border)', lineHeight: '1.45' }}>
            {criticNotes}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Awaiting critic evaluation after Round 1...
          </div>
        )}

        {/* History of Rounds Critique */}
        {criticLogs.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critique History</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
              {criticLogs.map((log, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--secondary-accent)' }}>Round {idx + 1} Evaluation:</div>
                  <div style={{ color: '#94a3b8', marginTop: '0.15rem' }}>{log.reasoning}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Target Query */}
      {nextQuery && (
        <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '10px', padding: '0.75rem' }}>
          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Next Targeted Query</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--secondary-accent)' }}>"{nextQuery}"</span>
        </div>
      )}
    </div>
  );
}
