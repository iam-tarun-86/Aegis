import React, { useState, useEffect } from 'react';
import { Search, Loader2, Settings, ChevronDown, ChevronUp, Server, Cloud, RefreshCw, AlertTriangle, ShieldCheck, Play, Plus } from 'lucide-react';

export function ResearchForm({ 
  onStart, 
  isRunning, 
  provider, 
  setProvider,
  apiKey, 
  setApiKey,
  selectedModel, 
  setSelectedModel
}) {
  const [topic, setTopic] = useState('');
  const [rounds, setRounds] = useState(3);
  const [format, setFormat] = useState('Auto');
  const [searchEngine, setSearchEngine] = useState('Default');
  const [showSettings, setShowSettings] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Auto');

  // Local connection states
  const [localOnline, setLocalOnline] = useState(false);
  const [checkingLocal, setCheckingLocal] = useState(false);
  // Full verified free-tier models catalogue
  const [nvidiaModels, setNvidiaModels] = useState([
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.2-3b-instruct',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-nano-30b-a3b',
    'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
    'stepfun-ai/step-3.7-flash',
    'z-ai/glm-5.2',
    'google/diffusiongemma-26b-a4b-it',
    'google/gemma-4-31b-it',
    'minimaxai/minimax-m3',
    'mistralai/mistral-medium-3.5-128b',
    'mistralai/mistral-nemotron',
    'thinkingmachines/inkling'
  ]);
  const [verifiedModels, setVerifiedModels] = useState([
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.2-3b-instruct',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-nano-30b-a3b',
    'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
    'stepfun-ai/step-3.7-flash',
    'z-ai/glm-5.2',
    'google/diffusiongemma-26b-a4b-it',
    'google/gemma-4-31b-it',
    'minimaxai/minimax-m3',
    'mistralai/mistral-medium-3.5-128b',
    'mistralai/mistral-nemotron',
    'thinkingmachines/inkling'
  ]);
  const [reasoningModels, setReasoningModels] = useState([
    'nvidia/nemotron-3-ultra-550b-a55b',
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-nano-30b-a3b',
    'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'stepfun-ai/step-3.7-flash',
    'thinkingmachines/inkling'
  ]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [keyStatus, setKeyStatus] = useState(null); // { valid, source, error, warning }

  // Sample prompt categories
  const categories = [
    { name: 'Auto', sample: '' },
    { name: 'Product', sample: 'Compare NVIDIA RTX 4060 vs RTX 4070 laptop GPUs. Cover performance, thermal metrics, and VRAM efficiency for local LLM workloads.' },
    { name: 'Compare', sample: 'Compare LangGraph vs AutoGen for building local multi-agent research pipelines. Cover architecture, state persistence, and ease of debugging.' },
    { name: 'How-to', sample: 'How to build and deploy a quantized GGUF model locally using llama-server. Detail step-by-step setup, memory allocation, and performance parameters.' },
    { name: 'Fact-check', sample: 'Fact-check recent breakthroughs in room-temperature superconductivity (LK-99). Detail verified empirical proofs vs debunked claims.' }
  ];

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
    
    // Auto-load NVIDIA models from backend on start
    const loadDefaultNvidiaModels = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/nvidia-models');
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setNvidiaModels(data.models);
          setVerifiedModels(data.verified || []);
          setReasoningModels(data.reasoning || []);
          // Prefer a model that is actually served, not just listed.
          const pool = (data.verified && data.verified.length) ? data.verified : data.models;
          setSelectedModel(pool.includes(data.default) ? data.default : pool[0]);
        }
      } catch (err) {
        console.error('Failed to load NVIDIA models on mount:', err);
      }
    };
    loadDefaultNvidiaModels();
  }, []);

  // Listing models needs no auth, so a populated dropdown proves nothing about
  // the key — verify it separately with a real (1-token) completion.
  const fetchNvidiaModels = async () => {
    setLoadingModels(true);
    setModelsError('');
    setKeyStatus(null);
    const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : '';
    try {
      const [modelsRes, keyRes] = await Promise.all([
        fetch(`http://localhost:8000/api/nvidia-models${query}`).then((r) => r.json()),
        fetch(`http://localhost:8000/api/verify-nvidia-key${query}`).then((r) => r.json())
      ]);

      if (modelsRes.error) {
        setModelsError(modelsRes.error);
      } else if (modelsRes.models && modelsRes.models.length > 0) {
        setNvidiaModels(modelsRes.models);
        setVerifiedModels(modelsRes.verified || []);
        setReasoningModels(modelsRes.reasoning || []);
        const pool = (modelsRes.verified && modelsRes.verified.length) ? modelsRes.verified : modelsRes.models;
        if (!pool.includes(selectedModel)) {
          setSelectedModel(pool.includes(modelsRes.default) ? modelsRes.default : pool[0]);
        }
      }
      setKeyStatus(keyRes);
    } catch (err) {
      setModelsError('Failed to reach the Wayfarer backend on port 8000.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.name);
    if (cat.sample) {
      setTopic(cat.sample);
    } else {
      setTopic('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim() || isRunning) return;

    const config = {
      provider,
      // Local: let the backend use its configured MODEL_NAME. Hardcoding a name
      // here silently overrode backend/.env, and only worked because
      // llama-server ignores the model field — other servers do not.
      model: provider === 'local' ? null : selectedModel,
      api_key: provider === 'nvidia' ? apiKey : null,
      format: format
    };

    onStart(topic.trim(), rounds, config);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={16} style={{ color: 'var(--primary-accent)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Research</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>multi-step research loop</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-step web research with an LLM-in-the-loop agent</span>
      </div>

      {/* Query Textarea */}
      <textarea
        className="topic-input"
        placeholder="e.g. Why do cats knead with their paws? Cover the leading behavioural explanations"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        disabled={isRunning}
        style={{
          width: '100%',
          height: '95px',
          resize: 'none',
          padding: '0.85rem 1.1rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}
      />

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => handleCategoryClick(cat)}
            style={{
              background: activeCategory === cat.name ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.02)',
              border: activeCategory === cat.name ? '1px solid var(--primary-accent)' : '1px solid rgba(255, 255, 255, 0.05)',
              color: activeCategory === cat.name ? 'var(--text-main)' : 'var(--text-muted)',
              borderRadius: '20px',
              padding: '0.3rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Settings Accordion Header */}
      <div 
        onClick={() => setShowSettings(!showSettings)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--bg-panel-border)', 
          borderRadius: '8px', 
          padding: '0.5rem 0.85rem', 
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Settings size={13} style={{ color: 'var(--secondary-accent)' }} />
          <span>Settings</span>
        </div>
        {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {/* Settings Drawer Content */}
      {showSettings && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          background: 'rgba(2, 6, 23, 0.45)',
          border: '1px solid var(--bg-panel-border)',
          borderRadius: '8px',
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Rounds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ROUNDS</label>
            <select
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              disabled={isRunning}
              style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value={1}>1 Round (Quick)</option>
              <option value={2}>2 Rounds</option>
              <option value={3}>3 Rounds (Recommended)</option>
              <option value={4}>4 Rounds</option>
              <option value={5}>5 Rounds (Deep)</option>
            </select>
          </div>

          {/* Format */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>FORMAT</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={isRunning}
              style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value="Auto">Auto</option>
              <option value="Markdown Report">Detailed Report</option>
              <option value="Executive Summary">Executive Summary</option>
              <option value="Briefing Doc">Briefing Memo</option>
            </select>
          </div>

          {/* Search Engine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEARCH ENGINE</label>
            <select
              value={searchEngine}
              onChange={(e) => setSearchEngine(e.target.value)}
              disabled={isRunning}
              style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value="Default">Default (DuckDuckGo)</option>
            </select>
          </div>

          {/* Endpoint (Provider) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ENDPOINT</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={isRunning}
              style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <option value="local">Local llama-server</option>
              <option value="nvidia">NVIDIA NIM Cloud</option>
            </select>
          </div>

          {/* Local / Nvidia Status and Inputs nested inside */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid var(--bg-panel-border)', paddingTop: '0.65rem' }}>
            {provider === 'local' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Server size={12} style={{ color: localOnline ? 'var(--success-accent)' : '#ef4444' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Local Server (8085):</span>
                  <span style={{ fontWeight: 700, color: localOnline ? 'var(--success-accent)' : '#ef4444' }}>
                    {localOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={checkLocalStatus} 
                  disabled={checkingLocal}
                  style={{ background: 'transparent', border: 'none', color: 'var(--secondary-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RefreshCw size={10} className={checkingLocal ? "spin" : ""} />
                  <span>Sync</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>NVIDIA API KEY</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="password"
                      placeholder="nvapi-... (optional if in .env)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      style={{ flex: 1, background: 'rgba(2, 6, 23, 0.6)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={fetchNvidiaModels}
                      disabled={loadingModels}
                      className="hover-glow"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0 0.65rem', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      title="Load the model catalogue and verify the key with a real request"
                    >
                      {loadingModels ? 'Testing…' : 'Load & Test'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>MODEL</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{ width: '100%', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    {verifiedModels === null ? (
                      nvidiaModels.map((id) => <option key={id} value={id}>{id}</option>)
                    ) : (
                      <>
                        <optgroup label={`✓ Verified working (${verifiedModels.length})`}>
                          {verifiedModels.map((id) => (
                            <option key={id} value={id}>
                              {id}{reasoningModels.includes(id) ? '  · reasoning' : ''}
                            </option>
                          ))}
                        </optgroup>
                        {/* Listed by NVIDIA but 404 on inference with a free key.
                            Shown greyed out so the catalogue is still legible. */}
                        <optgroup label="✕ Not served on this endpoint">
                          {nvidiaModels
                            .filter((id) => !verifiedModels.includes(id))
                            .map((id) => (
                              <option key={id} value={id} disabled>{id}</option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>

                  {verifiedModels !== null && (
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {verifiedModels.length} of {nvidiaModels.length} catalogue models actually answer on a
                      free-tier key — the rest return 404. Use the Sandbox to test any specific one.
                    </span>
                  )}
                </div>

                {loadingModels && <span style={{ fontSize: '0.65rem', color: 'var(--secondary-accent)' }}>Loading cloud endpoints...</span>}
                {modelsError && <span style={{ fontSize: '0.65rem', color: '#f87171' }}>{modelsError}</span>}

                {keyStatus && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    fontSize: '0.65rem',
                    lineHeight: 1.5,
                    color: keyStatus.valid ? 'var(--success-accent)' : '#f87171'
                  }}>
                    {keyStatus.valid ? <ShieldCheck size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
                                     : <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />}
                    <span>
                      {keyStatus.valid
                        ? `Key verified${keyStatus.source === 'env' ? ' (from backend .env)' : ''}. ${keyStatus.warning || ''}`
                        : keyStatus.error}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Submission Button Bar */}
      <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        <button
          type="button"
          disabled={isRunning || !topic.trim()}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--bg-panel-border)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <Plus size={14} />
          <span>Queue</span>
        </button>

        <button 
          type="submit" 
          disabled={isRunning || !topic.trim()}
          style={{ 
            background: 'linear-gradient(135deg, var(--primary-accent) 0%, #4f46e5 100%)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '0.5rem 1.25rem', 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.45rem', 
            cursor: 'pointer',
            boxShadow: '0 4px 12px var(--primary-glow)'
          }}
        >
          {isRunning ? (
            <>
              <Loader2 className="spin" size={14} />
              <span>Researching...</span>
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />
              <span>Start</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
}
