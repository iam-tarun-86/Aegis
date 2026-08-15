import React from 'react';
import { Globe, ArrowRight, ShieldCheck, CheckCircle, XCircle, Eye } from 'lucide-react';

export function NetworkActivity({ activities }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-panel-border)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--success-accent)' }}>
          <Globe size={16} />
          <span>Network Activity Indicator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Local State Verified</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 1rem' }}>
          No network requests issued yet. Start research to capture traffic.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activities.map((act, idx) => {
            const isSearch = act.type === 'search';
            const isVision = act.type === 'vision_analysis';
            const isSuccess = act.status === 'Success';
            
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(2, 6, 23, 0.4)', border: '1px solid var(--bg-panel-border)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
                <div style={{ marginTop: '0.15rem' }}>
                  {isSuccess ? (
                    <CheckCircle size={14} style={{ color: 'var(--success-accent)' }} />
                  ) : (
                    <XCircle size={14} style={{ color: '#ef4444' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span style={{ fontWeight: 600, color: isSearch ? 'var(--secondary-accent)' : isVision ? 'var(--warning-accent)' : 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {act.type}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {act.size}
                    </span>
                  </div>
                  
                  <div style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontSize: '0.7rem' }}>
                    {act.target}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
