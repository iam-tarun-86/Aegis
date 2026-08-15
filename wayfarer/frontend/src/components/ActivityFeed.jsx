import React from 'react';
import { Terminal, Globe, Brain, CheckSquare, FileText } from 'lucide-react';

export function ActivityFeed({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Terminal size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
        <p>No active agent events yet. Start a research run to view live reasoning.</p>
      </div>
    );
  }

  const getNodeIcon = (node) => {
    switch (node?.toLowerCase()) {
      case 'planner': return <Brain size={14} style={{ color: 'var(--secondary-accent)' }} />;
      case 'researcher': return <Globe size={14} style={{ color: 'var(--primary-accent)' }} />;
      case 'critic': return <CheckSquare size={14} style={{ color: 'var(--warning-accent)' }} />;
      case 'writer': return <FileText size={14} style={{ color: 'var(--success-accent)' }} />;
      default: return <Terminal size={14} />;
    }
  };

  return (
    <div className="activity-feed">
      {logs.map((log, idx) => (
        <div key={idx} className={`feed-item node-${log.node?.toLowerCase()}`}>
          <div className="feed-item-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {getNodeIcon(log.node)}
              <span>{log.node} — {log.action}</span>
            </span>
          </div>

          <div className="feed-item-content">
            {log.details && <div>{log.details}</div>}
            {log.query && <div>Query issued: <strong>"{log.query}"</strong></div>}
            {log.url && (
              <div>
                Scraped: <span className="url-badge">{log.url}</span>
                {log.tables_extracted > 0 && (
                  <span style={{ color: 'var(--success-accent)', marginLeft: '0.5rem' }}>
                    ({log.tables_extracted} table extracted)
                  </span>
                )}
              </div>
            )}
            {log.reasoning && (
              <div style={{ fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.03)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.35rem' }}>
                "{log.reasoning}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
