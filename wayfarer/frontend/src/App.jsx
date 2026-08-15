import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertCircle, Terminal, Activity, Brain, History, MessageSquare, Search, BookOpen, Globe } from 'lucide-react';
import { useResearchSocket } from './hooks/useResearchSocket';
import { ResearchForm } from './components/ResearchForm';
import { RoundProgress } from './components/RoundProgress';
import { ActivityFeed } from './components/ActivityFeed';
import { ReportViewer } from './components/ReportViewer';
import { TheVoid } from './components/TheVoid';
import { ReasoningSidebar } from './components/ReasoningSidebar';
import { NetworkActivity } from './components/NetworkActivity';
import { QuickChat } from './components/QuickChat';
import { PastSearches } from './components/PastSearches';

export default function App() {
  const {
    isRunning,
    graphState,
    statusMessage,
    error,
    networkActivity,
    startResearch,
    triggerSectionRerun,
    cancelResearch
  } = useResearchSocket();

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'reasoning' | 'network'
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'cinematic'
  const [mission, setMission] = useState({ phase: 'docked', round: 0 });
  // What the user asked for, known immediately on submit. graphState is null
  // until the planner's first update lands, so without this the visualiser and
  // HUD would show a stale default (3) for the first several seconds of a run.
  const [requestedRounds, setRequestedRounds] = useState(3);

  // TheVoid reports flight-plan transitions (docked/outbound/landed/inbound)
  const handleMission = useCallback((update) => setMission(update), []);

  // LLM Config states (lifted up to share with QuickChat and Form)
  const [provider, setProvider] = useState('local'); // 'local' | 'nvidia'
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('meta/llama-3.1-70b-instruct');

  // Past searches history state
  const [pastSearches, setPastSearches] = useState([]);
  const [selectedPastIndex, setSelectedPastIndex] = useState(-1);

  // Return to dashboard when research completes
  useEffect(() => {
    if (!isRunning && viewMode === 'cinematic') {
      setViewMode('dashboard');
    }
  }, [isRunning, viewMode]);

  // Load past searches from Backend on mount
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/history');
      if (res.ok) {
        const data = await res.json();
        setPastSearches(data);
      }
    } catch (e) {
      console.error('Error loading history from DB:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const currentRound = graphState?.current_round || 1;
  const maxRounds = graphState?.max_rounds || requestedRounds;
  const subQuestions = graphState?.sub_questions || [];
  const sufficientCoverage = graphState?.sufficient_coverage || false;
  const logs = graphState?.logs || [];
  const finalReport = graphState?.final_report || '';
  const sources = graphState?.sources || [];
  const criticNotes = graphState?.critic_notes || '';
  const currentSearchQuery = graphState?.current_search_query || '';

  // Get active node for Three.js animations
  const activeNode = graphState?.logs?.[graphState.logs.length - 1]?.node || '';

  // Watch for completed research runs and save to Database
  useEffect(() => {
    if (finalReport && !isRunning && graphState?.topic) {
      const newSearch = {
        topic: graphState.topic,
        rounds: graphState.max_rounds,
        report: finalReport,
        sources: graphState.sources || []
      };
      
      const saveToDb = async () => {
        try {
          await fetch('http://localhost:8000/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSearch)
          });
          // Refresh list to get real DB IDs
          fetchHistory();
        } catch(e) {
          console.error("Failed to save history", e);
        }
      };
      
      saveToDb();
      setSelectedPastIndex(-1); // Reset selected past index as we have a new active report
    }
  }, [finalReport, isRunning, graphState]);

  // Handle selecting a past search report to view
  const handleSelectPastSearch = (search, index) => {
    setSelectedPastIndex(index);
  };

  // Handle deleting a past search record
  const handleDeletePastSearch = async (index) => {
    const searchId = pastSearches[index].id;
    try {
      await fetch(`http://localhost:8000/api/history/${searchId}`, { method: 'DELETE' });
      const updated = pastSearches.filter((_, idx) => idx !== index);
      setPastSearches(updated);
      
      if (selectedPastIndex === index) {
        setSelectedPastIndex(-1);
      } else if (selectedPastIndex > index) {
        setSelectedPastIndex(selectedPastIndex - 1);
      }
    } catch(e) {
      console.error("Failed to delete", e);
    }
  };

  // Determine which report/source set is currently viewed
  const displayReport = selectedPastIndex >= 0 ? pastSearches[selectedPastIndex].report : finalReport;
  const displaySources = selectedPastIndex >= 0 ? pastSearches[selectedPastIndex].sources : sources;

  // Human-readable flight status for the cinematic HUD
  const missionLabel = {
    docked: 'DOCKED AT STATION',
    outbound: `EN ROUTE TO SECTOR ${mission.round}`,
    landed: `LANDED — SURVEYING SECTOR ${mission.round}`,
    inbound: `RETURNING FROM SECTOR ${mission.round}`
  }[mission.phase] || 'STANDING BY';

  if (isRunning) {
    return (
      <div className="cinematic-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#070708', zIndex: 1000 }}>
        {/* Fullscreen Cinematic TheVoid */}
        <TheVoid
          currentRound={currentRound}
          maxRounds={maxRounds}
          sources={sources}
          isRunning={isRunning}
          activeNode={activeNode}
          onMission={handleMission}
        />

        {/* Futuristic Sci-fi Spaceship HUD Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '2.5rem',
          fontFamily: 'var(--font-mono)'
        }}>
          
          {/* Top HUD: Info & Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(10, 10, 12, 0.75)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '1rem 1.5rem', pointerEvents: 'auto', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--primary-accent)', boxShadow: '0 0 10px var(--primary-accent)' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.12em' }}>RESEARCHING TARGET SYSTEM</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
                QUERY: <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>"{graphState?.topic || 'Analyzing Target'}"</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', pointerEvents: 'auto' }}>
              <button 
                onClick={cancelResearch} 
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel Research
              </button>
            </div>
          </div>

          {/* Bottom HUD: Telemetry & Live Reconnaissance & Log stream */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.25rem', width: '100%' }}>
            
            {/* Telemetry */}
            <div style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '270px', flexShrink: 0, backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>SYSTEM TELEMETRY:</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>CRAFT: <span style={{ color: 'var(--secondary-accent)', fontWeight: 700 }}>{missionLabel}</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>ROUND SECTOR: <span style={{ color: 'var(--primary-accent)', fontWeight: 700 }}>{currentRound} / {maxRounds}</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>DATA SEEDS: <span style={{ color: 'var(--primary-accent)', fontWeight: 700 }}>{sources.length}</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>ACTIVE AGENT: <span style={{ color: 'var(--primary-accent)', fontWeight: 700 }}>{activeNode ? activeNode.toUpperCase() : 'PLANNING'}</span></div>
            </div>

            {/* Live Web Reconnaissance & Target Stream */}
            <div style={{ flex: 1, minWidth: 0, background: 'rgba(10, 10, 12, 0.85)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '1rem 1.25rem', pointerEvents: 'auto', backdropFilter: 'blur(12px)', boxShadow: '0 4px 25px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.68rem', fontWeight: 800, color: 'var(--secondary-accent)', letterSpacing: '0.06em' }}>
                  <Globe size={13} style={{ color: '#38bdf8' }} />
                  <span>LIVE WEB RECONNAISSANCE & TARGET TRAFFIC</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {sources.length} sources charted
                </div>
              </div>

              {/* Current Active Search Query */}
              {currentSearchQuery && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#60a5fa', marginBottom: '0.45rem', background: 'rgba(59, 130, 246, 0.12)', padding: '0.25rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Search size={11} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>Searching DuckDuckGo:</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>"{currentSearchQuery}"</span>
                </div>
              )}

              {/* Live Stream of Scraped Sites & Traffic */}
              <div style={{ height: '76px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.68rem' }}>
                {networkActivity && networkActivity.length > 0 ? (
                  networkActivity.slice(-4).map((act, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ color: act.type === 'search' ? '#38bdf8' : '#34d399', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', flexShrink: 0 }}>
                        [{act.type}]
                      </span>
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'var(--font-mono)' }}>
                        {act.target}
                      </span>
                      <span style={{ color: act.status === 'Success' ? '#34d399' : '#f87171', fontSize: '0.6rem', fontWeight: 600, flexShrink: 0 }}>
                        {act.size || act.status}
                      </span>
                    </div>
                  ))
                ) : sources && sources.length > 0 ? (
                  sources.slice(-4).map((src, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.6rem', flexShrink: 0 }}>[SCRAPED]</span>
                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{src.title || src.url}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                    Scanning planetary data streams & reconnaissance queries...
                  </div>
                )}
              </div>
            </div>

            {/* Logs stream */}
            <div style={{ background: 'rgba(10, 10, 12, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.1rem 1.4rem', width: '380px', flexShrink: 0, pointerEvents: 'auto', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}>
                <Terminal size={12} />
                <span>SIGNAL FEED:</span>
              </div>
              <div style={{ height: '94px', overflowY: 'auto', fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem', lineHeight: 1.4 }}>
                {logs.slice(-4).map((log, idx) => (
                  <div key={idx} style={{ opacity: 0.4 + (idx / 3) * 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    &gt; [{log.node.toUpperCase()}] {log.message}
                  </div>
                ))}
                {logs.length === 0 && <div>&gt; Syncing space signal...</div>}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Immersive 3D Space Visualizer in absolute background position */}
      <div className="void-background">
        <TheVoid
          currentRound={currentRound}
          maxRounds={maxRounds}
          sources={sources}
          isRunning={isRunning}
          activeNode={activeNode}
        />
      </div>
      
      {/* Top Header Bar */}
      <header className="app-header" style={{ flexShrink: 0 }}>
        <div className="brand-title">
          <span>🌌 Wayfarer</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary-accent)', background: 'rgba(6, 182, 212, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            Deep Research Console
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsSandboxOpen(true)}
            style={{ 
              background: 'rgba(99, 102, 241, 0.08)', 
              border: '1px solid rgba(99, 102, 241, 0.25)', 
              color: 'var(--text-main)', 
              padding: '0.45rem 0.85rem', 
              borderRadius: '8px', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            className="hover-glow"
          >
            <MessageSquare size={13} style={{ color: 'var(--primary-accent)' }} />
            <span>Model Sandbox</span>
          </button>
        </div>
      </header>

      {/* Run failures (bad key, dead model, saturated endpoint) surface here
          rather than being silently swallowed by the socket hook. */}
      {error && (
        <div className="error-banner" style={{ flexShrink: 0 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong>Research run failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main Split View */}
      <main className="app-main-grid" style={{ flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Form Controls & Active stream / History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: 0 }}>
          
          {/* Top Panel: Unified Controls Input */}
          <section className="panel-card" style={{ flexShrink: 0, padding: '1.25rem' }}>
            <ResearchForm 
              onStart={(topic, rounds, config) => {
                setSelectedPastIndex(-1); // reset history view
                setRequestedRounds(rounds); // drives the visualiser before the first update
                setMission({ phase: 'docked', round: 0 });
                setViewMode('cinematic'); // Go cinematic full screen!
                startResearch(topic, rounds, config);
              }}
              isRunning={isRunning}
              provider={provider}
              setProvider={setProvider}
              apiKey={apiKey}
              setApiKey={setApiKey}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
            />
          </section>

          {/* Bottom Panel: Active Research Visualizer + Logs OR Past Searches */}
          {isRunning ? (
            <section className="panel-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--bg-panel-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--secondary-accent)', boxShadow: '0 0 8px var(--secondary-accent)' }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Active Research Loop</span>
                </div>
                <button
                  onClick={cancelResearch}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  Cancel Run
                </button>
              </div>

              <div className="panel-body" style={{ flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                
                {/* Progress Details & Tabbed Logs inside the Active card */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0.75rem 1.25rem' }}>
                  
                  {/* Tabs selector */}
                  <div className="tabs-container" style={{ marginBottom: '0.65rem' }}>
                    <button
                      onClick={() => setActiveTab('feed')}
                      className={`tab-button ${activeTab === 'feed' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    >
                      <Terminal size={12} />
                      <span>Activity</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('reasoning')}
                      className={`tab-button ${activeTab === 'reasoning' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    >
                      <Brain size={12} />
                      <span>Reasoning</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('network')}
                      className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    >
                      <Activity size={12} />
                      <span>Network</span>
                    </button>
                  </div>

                  {/* Scrollable Tab Contents */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {activeTab === 'feed' && <ActivityFeed logs={logs} />}
                    {activeTab === 'reasoning' && (
                      <ReasoningSidebar
                        subQuestions={subQuestions}
                        criticNotes={criticNotes}
                        nextQuery={currentSearchQuery}
                        logs={logs}
                      />
                    )}
                    {activeTab === 'network' && (
                      <NetworkActivity activities={networkActivity} />
                    )}
                  </div>
                </div>

              </div>
            </section>
          ) : (
            <section className="panel-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header" style={{ borderBottom: '1px solid var(--bg-panel-border)', padding: '0.75rem 1.25rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={16} style={{ color: 'var(--secondary-accent)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Past Deep Searches</span>
                </div>
                {pastSearches.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await fetch('http://localhost:8000/api/history', { method: 'DELETE' });
                        setPastSearches([]);
                        setSelectedPastIndex(-1);
                      } catch(e) {
                        console.error('Failed to clear history', e);
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Clear History
                  </button>
                )}
              </div>
              <div className="panel-body" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <PastSearches
                  pastSearches={pastSearches}
                  onSelect={handleSelectPastSearch}
                  activeIndex={selectedPastIndex}
                  onDelete={handleDeletePastSearch}
                />
              </div>
            </section>
          )}

        </div>

        {/* Right Column: Synthesized Report Viewer */}
        <section className="panel-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ flexShrink: 0 }}>
            <span>Synthesized Research Report</span>
            {displayReport && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success-accent)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                ✓ Complete ({displaySources.filter(s => s.status === 'Available').length} verified sources)
              </span>
            )}
          </div>

          <div className="panel-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
            <ReportViewer
              reportText={displayReport}
              sources={displaySources}
              onSectionRerun={triggerSectionRerun}
              isRunning={isRunning}
            />
          </div>
        </section>

      </main>

      {/* Floating Developer Sandbox Modal Popup */}
      {isSandboxOpen && (
        <div className="modal-overlay" onClick={() => setIsSandboxOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Model Verification Sandbox</span>
              <button 
                onClick={() => setIsSandboxOpen(false)} 
                className="modal-close-btn"
                title="Close Sandbox"
              >
                ✕
              </button>
            </div>
            <div className="panel-body" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <QuickChat
                  provider={provider}
                  setProvider={setProvider}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  apiKey={apiKey}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
