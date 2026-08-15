import React from 'react';
import { CheckCircle2, CircleDot, ArrowRight } from 'lucide-react';

export function RoundProgress({ currentRound, maxRounds, subQuestions = [], sufficientCoverage }) {
  const roundArray = Array.from({ length: maxRounds }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="round-tracker">
        {roundArray.map((r) => {
          const isCompleted = r < currentRound || sufficientCoverage;
          const isActive = r === currentRound && !sufficientCoverage;

          return (
            <React.Fragment key={r}>
              <div className={`round-step ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                <div className="step-indicator">
                  {isCompleted ? <CheckCircle2 size={14} /> : r}
                </div>
                <span>Round {r}</span>
              </div>
              {r < maxRounds && <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />}
            </React.Fragment>
          );
        })}
        {sufficientCoverage && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--success-accent)', fontWeight: 600 }}>
            ✓ Early Exit Triggered (Coverage Satisfied)
          </span>
        )}
      </div>

      {subQuestions.length > 0 && (
        <div style={{ fontSize: '0.8rem', background: 'rgba(2, 6, 23, 0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: '0.35rem' }}>Planner Sub-Questions:</div>
          <ul style={{ marginLeft: '1.25rem', color: '#cbd5e1' }}>
            {subQuestions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
