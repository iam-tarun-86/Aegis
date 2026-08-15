import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
function App() {
  // Session State
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');

  // Chat State
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [confidence, setConfidence] = useState<{score: number, flag: string, reason: string} | null>(null);
  
  // Document & Preview State
  const [uploadStatus, setUploadStatus] = useState('');
  const [availableDocs, setAvailableDocs] = useState<{doc_id: string, filename: string}[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{doc_id: string, filename: string, page_num?: number} | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Session Management ---
  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:8001/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createSession = async () => {
    const finalName = newSessionName.trim() || `Session ${sessions.length + 1}`;
    const session_id = 'sess_' + Math.random().toString(36).substr(2, 9);
    try {
      await fetch('http://localhost:8001/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, name: finalName })
      });
      setNewSessionName('');
      fetchSessions();
      setCurrentSessionId(session_id);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (session_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8001/sessions/${session_id}`, { method: 'DELETE' });
      if (currentSessionId === session_id) setCurrentSessionId(null);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePin = async (session_id: string, is_pinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8001/sessions/${session_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !is_pinned })
      });
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleArchive = async (session_id: string, is_archived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8001/sessions/${session_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !is_archived })
      });
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const startRenaming = (sess: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sess.session_id);
    setEditSessionName(sess.name);
  };

  const submitRename = async (session_id: string) => {
    if (editSessionName.trim()) {
      try {
        await fetch(`http://localhost:8001/sessions/${session_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editSessionName.trim() })
        });
        fetchSessions();
      } catch (e) {
        console.error(e);
      }
    }
    setEditingSessionId(null);
  };

  // --- Document & Chat Management ---
  const fetchDocuments = async (session_id: string) => {
    try {
      const res = await fetch(`http://localhost:8001/documents?session_id=${session_id}`);
      const data = await res.json();
      setAvailableDocs(data);
      setSelectedDocIds(data.map((d: any) => d.doc_id));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (session_id: string) => {
    try {
      const res = await fetch(`http://localhost:8001/sessions/${session_id}/messages`);
      const data = await res.json();
      setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDocument = async (doc_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8001/documents/${doc_id}`, { method: 'DELETE' });
      if (currentSessionId) fetchDocuments(currentSessionId);
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  // Setup on Mount
  useEffect(() => {
    fetchSessions();
    ws.current = new WebSocket('ws://localhost:8001/chat');
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'sources') {
        setSources(data.data);
      } else if (data.type === 'token') {
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'bot') {
            updated[lastIndex] = { ...updated[lastIndex], content: updated[lastIndex].content + data.data };
            return updated;
          } else {
            return [...prev, { role: 'bot', content: data.data }];
          }
        });
      } else if (data.type === 'done') {
        setIsGenerating(false);
        setConfidence({
          score: data.confidence,
          flag: data.flag,
          reason: data.verification_reasoning
        });
      }
    };

    // Listen for handoff messages from Omni Shell
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && (event.data.type === 'SELECT_SESSION' || event.data.type === 'REFRESH_SESSIONS' || event.data.type === 'SWITCH_TAB')) {
        try {
          const res = await fetch('http://localhost:8001/sessions');
          const data = await res.json();
          setSessions(data);
          if (event.data.session_id) {
            setCurrentSessionId(event.data.session_id);
          } else if (data.length > 0) {
            setCurrentSessionId(data[0].session_id);
          }
        } catch (e) {
          console.error("Failed to refresh sessions on message", e);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Refresh when tab gains focus
    const handleFocus = () => {
      fetchSessions();
    };
    window.addEventListener('focus', handleFocus);

    // Keep sessions synced periodically
    const syncTimer = setInterval(() => {
      fetchSessions();
    }, 2500);
    
    return () => {
      ws.current?.close();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
      clearInterval(syncTimer);
    }
  }, []);

  // When Session Changes
  useEffect(() => {
    if (currentSessionId) {
      setMessages([]);
      setSources([]);
      setConfidence(null);
      setUploadStatus('');
      setAvailableDocs([]);
      setSelectedDocIds([]);
      fetchMessages(currentSessionId);
      fetchDocuments(currentSessionId);
    } else {
      setMessages([]);
      setSources([]);
      setConfidence(null);
      setUploadStatus('');
      setAvailableDocs([]);
      setSelectedDocIds([]);
    }
  }, [currentSessionId]);

  // Auto-select session if current is invalid or missing
  useEffect(() => {
    if (sessions.length > 0) {
      const currentExists = sessions.some(s => s.session_id === currentSessionId);
      if (!currentExists) {
        setCurrentSessionId(sessions[0].session_id);
      }
    } else {
      setCurrentSessionId(null);
    }
  }, [sessions, currentSessionId]);

  const handleSend = () => {
    if (!input.trim() || !ws.current || !currentSessionId) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsGenerating(true);
    setSources([]);
    setConfidence(null);
    ws.current.send(JSON.stringify({ query: input, doc_ids: selectedDocIds, session_id: currentSessionId }));
    setInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSessionId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading and parsing...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', currentSessionId);

    try {
      const response = await fetch('http://localhost:8001/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        if (data.chunks === 0) {
          setUploadStatus(`Warning: Indexed 0 chunks. This might be a scanned document without selectable text.`);
        } else {
          setUploadStatus(`Success! Indexed ${data.chunks} chunks.`);
        }
        fetchDocuments(currentSessionId);
      } else {
        setUploadStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setUploadStatus('Upload failed.');
    }
  };

  const handleExport = () => {
    if (!currentSessionId) return;
    window.open(`http://localhost:8001/sessions/${currentSessionId}/export`, '_blank');
  };

  const openPreview = (doc_id: string, filename: string, page_num?: number) => {
    if (filename.toLowerCase().endsWith('.docx')) {
      alert("DOCX files cannot be viewed in the browser. You can download the original file manually if needed.");
      return;
    }
    setPreviewDoc({ doc_id, filename, page_num });
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-text-main font-sans flex p-6 gap-6">
      
      {/* Sidebar - Sessions */}
      <div className="w-64 bg-surface rounded-2xl shadow-soft flex flex-col border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-serif font-medium text-primary-dark">Workspaces</h2>
        </div>
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New session name..."
              className="flex-1 w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-light"
              value={newSessionName}
              onChange={e => setNewSessionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createSession()}
            />
            <button onClick={createSession} className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm font-medium">+</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(sess => (
            <div 
              key={sess.session_id} 
              onClick={() => setCurrentSessionId(sess.session_id)}
              className={`p-3 rounded-xl cursor-pointer group transition-colors border ${currentSessionId === sess.session_id ? 'bg-primary-light/10 border-primary-light' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                {editingSessionId === sess.session_id ? (
                  <input
                    type="text"
                    value={editSessionName}
                    autoFocus
                    className="flex-1 w-0 px-2 py-1 text-sm rounded border border-primary focus:outline-none"
                    onChange={e => setEditSessionName(e.target.value)}
                    onBlur={() => submitRename(sess.session_id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRename(sess.session_id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className={`text-sm font-medium truncate flex-1 flex items-center gap-1.5 ${sess.is_archived ? 'text-gray-400 line-through' : 'text-text-main'}`}>
                  {sess.is_pinned && (
                    <svg className="text-yellow-500" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  )}
                  {sess.name}
                </span>
                )}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <button onClick={(e) => startRenaming(sess, e)} className="text-gray-400 hover:text-green-500 transition-colors" title="Rename">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                  <button onClick={(e) => togglePin(sess.session_id, sess.is_pinned, e)} className="text-gray-400 hover:text-yellow-500 transition-colors" title="Pin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                  <button onClick={(e) => toggleArchive(sess.session_id, sess.is_archived, e)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Archive">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                  </button>
                  <button onClick={(e) => deleteSession(sess.session_id, e)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-center text-text-muted mt-4">No sessions yet.</p>}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 bg-surface rounded-2xl shadow-soft flex flex-col overflow-hidden border border-gray-100 relative">
        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-serif font-medium text-primary-dark">Doc Q&A Assistant</h1>
            {currentSessionId && <p className="text-sm text-text-muted mt-1">Active Workspace: {sessions.find(s => s.session_id === currentSessionId)?.name}</p>}
          </div>
          {currentSessionId && (
            <button 
              onClick={handleExport}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
              title="Export Chat History as Markdown"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !isGenerating && (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-primary-light/20 text-primary rounded-2xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 className="text-xl font-serif font-medium text-text-main mb-2">Welcome to DocMind</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your intelligent AI assistant for document analysis. Upload PDFs, Word documents, or text files to begin extracting insights and asking questions.
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-light text-white' : 'bg-gray-50 text-text-main prose prose-sm max-w-none'}`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            {...props}
                            children={String(children).replace(/\n$/, '')}
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-xl my-4 text-sm"
                          />
                        ) : (
                          <code {...props} className={`${className} bg-gray-200 px-1.5 py-0.5 rounded text-primary-dark font-mono text-sm`}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isGenerating && (
             <div className="flex justify-start">
               <div className="bg-gray-50 p-4 rounded-2xl text-text-muted animate-pulse">
                 Thinking...
               </div>
             </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
          <input 
            type="text" 
            className="flex-1 px-4 py-3 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light transition-all"
            placeholder={currentSessionId ? "Ask a question about the document..." : "Create a session first..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isGenerating || !currentSessionId}
          />
          <button 
            onClick={handleSend}
            disabled={isGenerating || !input.trim() || !currentSessionId}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Source Panel */}
      <div className="w-96 flex flex-col gap-6">
        
        {/* Upload Panel */}
        <div className={`bg-surface rounded-2xl shadow-soft p-5 border border-gray-100 ${!currentSessionId ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Upload Document</h3>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark transition-colors"
          />
          {uploadStatus && (
            <div className="mt-3 text-sm font-medium text-text-main">
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Document Selector */}
        <div className={`bg-surface rounded-2xl shadow-soft p-5 border border-gray-100 ${!currentSessionId ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Workspace Documents</h3>
          {availableDocs.length === 0 ? (
            <p className="text-sm text-text-muted italic">No documents uploaded.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {availableDocs.map(doc => (
                <label key={doc.doc_id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="rounded text-primary focus:ring-primary"
                    checked={selectedDocIds.includes(doc.doc_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocIds(prev => [...prev, doc.doc_id]);
                      } else {
                        setSelectedDocIds(prev => prev.filter(id => id !== doc.doc_id));
                      }
                    }}
                  />
                  <span 
                    className="text-sm text-text-main truncate flex-1 hover:text-primary hover:underline" 
                    title={doc.filename}
                    onClick={(e) => { e.preventDefault(); openPreview(doc.doc_id, doc.filename); }}
                  >
                    {doc.filename}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Confidence Badge */}
        {confidence && (
          <div className="bg-surface rounded-2xl shadow-soft p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Confidence Score</h3>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                confidence.score >= 60 ? 'bg-green-100 text-green-700' :
                confidence.score >= 35 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {confidence.flag} ({confidence.score})
              </div>
            </div>
          </div>
        )}

        {/* Retrieved Sources */}
        <div className="flex-1 bg-surface rounded-2xl shadow-soft p-5 border border-gray-100 overflow-y-auto">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Retrieved Context</h3>
          {sources.length === 0 && !isGenerating ? (
            <p className="text-text-muted text-sm italic">No sources retrieved yet.</p>
          ) : (
            <div className="space-y-4">
              {sources.map((src, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl text-sm text-text-muted leading-relaxed">
                  <span 
                    className="font-semibold block mb-1 text-primary-dark cursor-pointer hover:underline"
                    onClick={() => openPreview(src.doc_id, src.filename, src.page_num)}
                  >
                    {src.filename || src.display_id || src.chunk_id} {src.page_num ? `(Page ${src.page_num})` : ''}
                  </span>
                  {src.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {previewDoc && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-8" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl w-full h-full max-w-6xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-medium text-text-main flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                {previewDoc.filename} {previewDoc.page_num ? `— Page ${previewDoc.page_num}` : ''}
              </h2>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 bg-gray-100 relative">
              <iframe 
                src={`http://localhost:8001/documents/${previewDoc.doc_id}/content${previewDoc.page_num && previewDoc.filename.toLowerCase().endsWith('.pdf') ? `#page=${previewDoc.page_num}` : ''}`}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;


