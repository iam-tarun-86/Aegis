import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ShieldCheck, AlertTriangle, Trash2, Search } from 'lucide-react';

const GREETING = {
  role: 'system',
  content: 'Hello! I am your model validation assistant. Pick an endpoint and model below, then send a prompt to verify the connection.'
};

export function QuickChat({ provider, setProvider, selectedModel, setSelectedModel, apiKey }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // NVIDIA catalogue + key verification live here so the sandbox is usable on
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
  const [modelFilter, setModelFilter] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Pull the catalogue once the user is actually on the cloud endpoint.
  useEffect(() => {
    if (provider !== 'nvidia' || nvidiaModels.length > 0) return;
    let cancelled = false;
    setLoadingModels(true);
    const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : '';
    fetch(`http://localhost:8000/api/nvidia-models${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.models) return;
        setNvidiaModels(data.models);
        setVerifiedModels(data.verified || []);
        setReasoningModels(data.reasoning || []);
        const pool = (data.verified && data.verified.length) ? data.verified : data.models;
        if (!selectedModel || !pool.includes(selectedModel)) {
          setSelectedModel(pool.includes(data.default) ? data.default : pool[0]);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingModels(false));
    return () => { cancelled = true; };
  }, [provider, apiKey, nvidiaModels.length, selectedModel, setSelectedModel]);

  const verifyKey = async () => {
    setVerifying(true);
    setKeyStatus(null);
    const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : '';
    try {
      const res = await fetch(`http://localhost:8000/api/verify-nvidia-key${query}`);
      setKeyStatus(await res.json());
    } catch (err) {
      setKeyStatus({ valid: false, error: 'Could not reach the Wayfarer backend on port 8000.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // null on local => backend falls back to its configured MODEL_NAME.
    // `label` is only for the message stamp, since `model` is null there.
    const model = provider === 'local' ? null : selectedModel;
    const label = model || 'local (backend MODEL_NAME)';
    const startedAt = Date.now();

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          llm_config: { provider, model, api_key: provider === 'nvidia' ? apiKey : null }
        })
      });

      const data = await response.json();
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

      if (data.error) {
        setMessages((prev) => [...prev, { role: 'system', isError: true, content: data.error, model: label, elapsed }]);
      } else if (data.response) {
        setMessages((prev) => [...prev, { role: 'system', content: data.response, model: label, elapsed }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'system',
        isError: true,
        content: 'Failed to reach the Wayfarer backend on port 8000. Is it running?'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const visibleModels = modelFilter
    ? nvidiaModels.filter((m) => m.toLowerCase().includes(modelFilter.toLowerCase()))
    : nvidiaModels;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ---- Endpoint & model controls ---- */}
      <div className="sandbox-toolbar">
        <div className="sandbox-row">
          <label>Endpoint</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="local">Local llama-server</option>
            <option value="nvidia">NVIDIA NIM Cloud</option>
          </select>
          {provider === 'nvidia' && (
            <button type="button" className="hover-glow sandbox-btn" onClick={verifyKey} disabled={verifying}>
              {verifying ? 'Testing…' : 'Verify key'}
            </button>
          )}
          <button
            type="button"
            className="hover-glow sandbox-btn"
            onClick={() => setMessages([GREETING])}
            title="Clear conversation"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {provider === 'nvidia' && (
          <>
            <div className="sandbox-row">
              <label>Model</label>
              <div className="sandbox-filter">
                <Search size={11} />
                <input
                  type="text"
                  placeholder={`Filter ${nvidiaModels.length || ''} models…`}
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                />
              </div>
            </div>

            <select
              className="sandbox-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loadingModels}
              size={1}
            >
              {loadingModels && <option>Loading catalogue…</option>}
              {!loadingModels && visibleModels.length === 0 && <option value="">No models match “{modelFilter}”</option>}
              {!loadingModels && visibleModels.length > 0 && (
                <>
                  <optgroup label="✓ Verified working">
                    {visibleModels.filter((id) => verifiedModels.includes(id)).map((id) => (
                      <option key={id} value={id}>
                        {id}{reasoningModels.includes(id) ? '  · reasoning' : ''}
                      </option>
                    ))}
                  </optgroup>
                  {/* Selectable here on purpose — the sandbox is where you find
                      out whether an unverified model actually responds. */}
                  <optgroup label="? Unverified / known 404">
                    {visibleModels.filter((id) => !verifiedModels.includes(id)).map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>

            {keyStatus && (
              <div className={`sandbox-key-status ${keyStatus.valid ? 'ok' : 'bad'}`}>
                {keyStatus.valid ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                <span>
                  {keyStatus.valid
                    ? `Key verified${keyStatus.source === 'env' ? ' (backend .env)' : ''}. ${keyStatus.warning || ''}`
                    : keyStatus.error}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Messages ---- */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0, marginBottom: '1rem' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%'
            }}
          >
            {msg.role !== 'user' && (
              <div style={{
                background: msg.isError ? 'rgba(248, 113, 113, 0.15)' : 'rgba(129, 140, 248, 0.15)',
                border: `1px solid ${msg.isError ? 'var(--danger-accent)' : 'var(--primary-accent)'}`,
                borderRadius: '50%',
                padding: '0.4rem',
                color: msg.isError ? 'var(--danger-accent)' : 'var(--primary-accent)',
                flexShrink: 0
              }}>
                {msg.isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
              <div style={{
                background: msg.role === 'user'
                  ? 'rgba(129, 140, 248, 0.18)'
                  : msg.isError ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${
                  msg.role === 'user' ? 'rgba(129, 140, 248, 0.3)'
                  : msg.isError ? 'rgba(248, 113, 113, 0.3)' : 'rgba(255, 255, 255, 0.07)'
                }`,
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: msg.isError ? '#fecaca' : '#e2e8f0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {msg.content}
              </div>

              {/* Which model actually answered, and how long it took */}
              {msg.model && (
                <span style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  paddingLeft: '0.2rem'
                }}>
                  {msg.model} · {msg.elapsed}s
                </span>
              )}
            </div>

            {msg.role === 'user' && (
              <div style={{ background: 'rgba(34, 211, 238, 0.15)', border: '1px solid var(--secondary-accent)', borderRadius: '50%', padding: '0.4rem', color: 'var(--secondary-accent)', flexShrink: 0 }}>
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: '0.5rem' }}>
            <Loader2 className="spin" size={14} />
            <span>Waiting on {provider === 'local' ? 'local Gemma' : selectedModel}…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ---- Composer ---- */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', background: 'var(--well-bg)', border: '1px solid var(--well-border)', padding: '0.45rem', borderRadius: '12px' }}>
        <input
          type="text"
          placeholder={`Test chat with ${provider === 'local' ? 'Local Gemma' : 'NVIDIA NIM'}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary"
          style={{ padding: '0.5rem 1rem' }}
        >
          {loading ? <Loader2 className="spin" size={14} /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
