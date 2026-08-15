import React from 'react';
import { History, FileText, Calendar, Trash2 } from 'lucide-react';

export function PastSearches({ pastSearches, onSelect, activeIndex, onDelete }) {
  if (!pastSearches || pastSearches.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', gap: '0.4rem' }}>
        <History size={16} />
        <span>No deep research history.</span>
      </div>
    );
  }

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '110px', paddingRight: '0.25rem' }}>
      {pastSearches.map((search, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(search, idx)}
          style={{
            background: activeIndex === idx ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: activeIndex === idx ? '1px solid var(--primary-accent)' : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
          className="past-search-item"
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0 }}>
            <FileText size={16} style={{ color: activeIndex === idx ? 'var(--primary-accent)' : 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {search.topic}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                <Calendar size={10} />
                {formatDate(search.timestamp)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', padding: '0.2rem 0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {search.rounds} Rds
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idx);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
              className="delete-item-btn"
              title="Delete search"
            >
              <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
