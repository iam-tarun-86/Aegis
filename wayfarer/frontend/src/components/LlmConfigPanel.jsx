import React, { useState, useEffect } from 'react';
import { Server, Cloud, RefreshCw, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';

export function LlmConfigPanel({ provider, setProvider, apiKey, setApiKey, selectedModel, setSelectedModel, onOpenSandbox }) {
  const [localOnline, setLocalOnline] = useState(false);
  const [checkingLocal, setCheckingLocal] = useState(false);
  const [nvidiaModels, setNvidiaModels] = useState([
    'meta/llama-3.1-405b-instruct',
    'meta/llama-3.1-70b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'meta/llama3-70b-instruct'
  ]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  // Check local LLM status
  const checkLocalStatus = async () => {
    setCheckingLocal(true);
    try {
      const res = await fetch('http://localhost:8000/api/llm-status');
      const data = await res.json();
      setLocalOnline(data.online);
      if (data.online) {
        setProvider('local');
      } else {
        setProvider('nvidia');
      }
    } catch (e) {
      setLocalOnline(false);
      setProvider('nvidia');
    } finally {
      setCheckingLocal(false);
    }
  };

  useEffect(() => {
    checkLocalStatus();
  }, []);

  // Fetch NVIDIA models when key is entered
  const fetchNvidiaModels = async () => {
    if (!apiKey) return;
    setLoadingModels(true);
    setModelsError('');
    try {
      const res = await fetch(`http://localhost:8000/api/nvidia-models?api_key=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (data.error) {
        setModelsError(data.error);
      } else if (data.models && data.models.length > 0) {
        setNvidiaModels(data.models);
        const instruct = data.models.find(m => m.toLowerCase().includes('instruct') || m.toLowerCase().includes('nemotron'));
        setSelectedModel(instruct || data.models[0]);
      }
    } catch (err) {
      setModelsError('Failed to fetch models from server');
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(2, 6, 23, 0.4)', border: '1px solid var(--bg-panel-border)', padding: '1rem', borderRadius: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>LLM ENGINE CONFIGURATION</span>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {onOpenSandbox && (
            <button 
              type="button"
              onClick={onOpenSandbox}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600 }}
            >
              <Terminal size={11} />
              <span>Test Chat</span>
            </button>
          )}

          <button 
            type="button"
            onClick={checkLocalStatus} 
            disabled={checkingLocal}
            style={{ background: 'transparent', border: 'none', color: 'var(--secondary-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}
          >
            <RefreshCw size={11} className={checkingLocal ? "spin" : ""} />
            <span>Sync Status</span>
          </button>
        </div>
      </div>

      {/* Local status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
        <Server size={13} style={{ color: localOnline ? 'var(--success-accent)' : '#ef4444' }} />
        <span style={{ color: 'var(--text-muted)' }}>Local Server (8085):</span>
        <span style={{ fontWeight: 700, color: localOnline ? 'var(--success-accent)' : '#ef4444' }}>
          {localOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      {/* Mode selection toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setProvider('local')}
          style={{ 
            background: provider === 'local' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(2, 6, 23, 0.35)', 
            border: provider === 'local' ? '1px solid var(--primary-accent)' : '1px solid var(--bg-panel-border)', 
            borderRadius: '8px', 
            padding: '0.45rem', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.4rem', 
            color: provider === 'local' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          <Server size={12} />
          <span>Local LLM</span>
        </button>
        
        <button
          type="button"
          onClick={() => setProvider('nvidia')}
          style={{ 
            background: provider === 'nvidia' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(2, 6, 23, 0.35)', 
            border: provider === 'nvidia' ? '1px solid var(--primary-accent)' : '1px solid var(--bg-panel-border)', 
            borderRadius: '8px', 
            padding: '0.45rem', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.4rem', 
            color: provider === 'nvidia' ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          <Cloud size={12} />
          <span>NVIDIA Cloud</span>
        </button>
      </div>

      {/* Inputs based on selection */}
      {provider === 'local' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {localOnline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success-accent)', fontWeight: 500 }}>
              <ShieldCheck size={13} />
              <span>Gemma 4 GGUF active on port 8085.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', color: 'var(--warning-accent)', background: 'rgba(245, 158, 11, 0.04)', padding: '0.45rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <span>Local server is offline. Defaulting to mock LLM responses.</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>NVIDIA API KEY</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                placeholder="nvapi-... (optional if in backend .env)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ flex: 1, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={fetchNvidiaModels}
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0 0.6rem', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                Load
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>SELECT CLOUD MODEL</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: '100%', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              {nvidiaModels.map((modelId, idx) => (
                <option key={idx} value={modelId}>{modelId}</option>
              ))}
            </select>
          </div>

          {loadingModels && (
            <span style={{ fontSize: '0.65rem', color: 'var(--secondary-accent)' }}>Loading models...</span>
          )}
          {modelsError && (
            <span style={{ fontSize: '0.65rem', color: '#f87171' }}>{modelsError}</span>
          )}
        </div>
      )}
    </div>
  );
}
