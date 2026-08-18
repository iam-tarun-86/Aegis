import { useState, useEffect, useRef } from 'react';
import { AegisLogo } from './components/AegisLogo';
import { PortalLaunchpad } from './components/PortalLaunchpad';
import { SlideNavDrawer } from './components/SlideNavDrawer';

function App() {
  // When first opened, activeTab is null (showing only the 2 launchpad options: Wayfarer & DockMind)
  const [activeTab, setActiveTab] = useState(null);
  const [wayfarerReady, setWayfarerReady] = useState(false);
  const [dockmindReady, setDockmindReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(20);
  const [statusMessage, setStatusMessage] = useState("Initializing Aegis Quantum Neural Core...");
  
  const dockmindRef = useRef(null);

  // Keyboard shortcuts ([1] Wayfarer, [2] DockMind, [H] Launchpad)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === '1') {
        setActiveTab('research');
      } else if (e.key === '2') {
        setActiveTab('chat');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTab(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 80) return prev + 15;
        return prev;
      });
    }, 400);

    const messageTimer1 = setTimeout(() => {
      setStatusMessage("Starting Wayfarer Deep Research Engine (Port 3000)...");
    }, 600);

    const messageTimer2 = setTimeout(() => {
      setStatusMessage("Connecting DockMind Document Intelligence RAG (Port 5173)...");
    }, 1200);

    const messageTimer3 = setTimeout(() => {
      setStatusMessage("Synchronizing Vector Embeddings & Neural Handoff Bridge...");
    }, 1800);

    const safetyTimeout = setTimeout(() => {
      setLoadingProgress(100);
      setStatusMessage("Aegis Quantum Nexus Synchronized!");
      setTimeout(() => setIsLoading(false), 500);
    }, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(messageTimer1);
      clearTimeout(messageTimer2);
      clearTimeout(messageTimer3);
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (wayfarerReady && dockmindReady) {
      setLoadingProgress(100);
      setStatusMessage("All Subsystems Online!");
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [wayfarerReady, dockmindReady]);

  useEffect(() => {
    // Listen for handoff messages from the Wayfarer iframe
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SWITCH_TAB') {
        console.log("Omni Shell received handoff, switching to:", event.data.tab);
        if (event.data.tab === 'chat') {
          setActiveTab('chat');
          
          if (dockmindRef.current && dockmindRef.current.contentWindow) {
            dockmindRef.current.contentWindow.postMessage({
              type: 'SELECT_SESSION',
              session_id: event.data.session_id
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="omni-container">
      {/* Loading Splash Screen */}
      <div className={`omni-splash-screen ${!isLoading ? 'fade-out' : ''}`}>
        <div className="splash-card">
          <div className="splash-logo">
            <AegisLogo size={82} />
            <div className="splash-pulse"></div>
          </div>
          
          <h1 className="splash-title">AEGIS</h1>
          <p className="splash-subtitle">Autonomous Research & Document Intelligence Nexus</p>
          
          <div className="splash-progress-bar-container">
            <div 
              className="splash-progress-bar" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          <div className="splash-status-text">
            {statusMessage}
          </div>

          <div className="splash-services">
            <div className={`service-pill ${wayfarerReady || loadingProgress > 60 ? 'ready' : 'loading'}`}>
              <span className="dot"></span>
              Wayfarer Research
            </div>
            <div className={`service-pill ${dockmindReady || loadingProgress > 85 ? 'ready' : 'loading'}`}>
              <span className="dot"></span>
              DockMind RAG Chat
            </div>
            <div className={`service-pill ${loadingProgress === 100 ? 'ready' : 'loading'}`}>
              <span className="dot"></span>
              Neural Bridge
            </div>
          </div>
        </div>
      </div>

      {/* Screen 1: Initial Portal Launchpad (When first opened, shows ONLY the 2 big app choices) */}
      {activeTab === null && (
        <PortalLaunchpad 
          onSelectApp={(app) => setActiveTab(app)}
          wayfarerReady={wayfarerReady}
          dockmindReady={dockmindReady}
        />
      )}

      {/* Screen 2: Active App Workspace with Hidden Slide-out Nav Drawer */}
      {activeTab !== null && (
        <SlideNavDrawer 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
          onReturnHome={() => setActiveTab(null)}
        />
      )}

      {/* Main Fullscreen Workspace (Preloaded Iframes for instant tab switching) */}
      <main className={`omni-content-fullscreen ${activeTab === null ? 'hidden-workspace' : ''}`}>
        {/* Wayfarer Iframe (Port 3000) */}
        <iframe 
          src={`http://${typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'}:3000`} 
          className={`omni-iframe ${activeTab === 'research' ? 'active' : ''}`}
          title="Wayfarer Research"
          onLoad={() => setWayfarerReady(true)}
        />

        {/* DockMind Iframe (Port 5173) */}
        <iframe 
          ref={dockmindRef}
          src={`http://${typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'}:5173`} 
          className={`omni-iframe ${activeTab === 'chat' ? 'active' : ''}`}
          title="DockMind Chat"
          onLoad={() => setDockmindReady(true)}
        />
      </main>
    </div>
  );
}

export default App;
