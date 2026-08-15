import { useState, useEffect, useRef } from 'react';
import { AegisLogo } from './components/AegisLogo';

function App() {
  const [activeTab, setActiveTab] = useState('research');
  const [wayfarerReady, setWayfarerReady] = useState(false);
  const [dockmindReady, setDockmindReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(20);
  const [statusMessage, setStatusMessage] = useState("Initializing Aegis Neural Subsystems...");
  
  const dockmindRef = useRef(null);

  useEffect(() => {
    // Step-by-step loading simulation / health polling
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
      setStatusMessage("Warming Vector Caches & Neural Handoff Bridge...");
    }, 1800);

    // Max fallback safety timeout so loading screen never hangs
    const safetyTimeout = setTimeout(() => {
      setLoadingProgress(100);
      setStatusMessage("All Subsystems Synchronized!");
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

  // When both iframes report loaded, immediately complete loading
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
          
          // Relay session selection to DockMind iframe
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
            <AegisLogo size={68} />
            <div className="splash-pulse"></div>
          </div>
          
          <h1 className="splash-title">AEGIS</h1>
          <p className="splash-subtitle">Autonomous Research & Document Intelligence</p>
          
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

      {/* Sidebar */}
      <aside className="omni-sidebar">
        <div className="omni-logo">
          <AegisLogo size={34} />
          <div className="omni-logo-text">Aegis</div>
        </div>

        <nav className="omni-nav">
          <div 
            className={`omni-nav-item ${activeTab === 'research' ? 'active' : ''}`}
            onClick={() => setActiveTab('research')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Deep Research
          </div>
          <div 
            className={`omni-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            Document Chat
          </div>
        </nav>

        <div className="omni-status">
          <div className="status-indicator">
            <div className="status-dot"></div>
            System Online
          </div>
        </div>
      </aside>

      {/* Main Content Area (Preloaded Iframes for instant tab switching) */}
      <main className="omni-content">
        {/* Wayfarer Iframe (Port 3000) */}
        <iframe 
          src="http://localhost:3000" 
          className={`omni-iframe ${activeTab === 'research' ? 'active' : ''}`}
          title="Wayfarer Research"
          onLoad={() => setWayfarerReady(true)}
        />

        {/* DockMind Iframe (Port 5173) */}
        <iframe 
          ref={dockmindRef}
          src="http://localhost:5173" 
          className={`omni-iframe ${activeTab === 'chat' ? 'active' : ''}`}
          title="DockMind Chat"
          onLoad={() => setDockmindReady(true)}
        />
      </main>
    </div>
  );
}

export default App;
