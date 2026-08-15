import { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('research');

  useEffect(() => {
    // Listen for handoff messages from the Wayfarer iframe
    const handleMessage = (event) => {
      // In production, you'd check event.origin here for security
      if (event.data && event.data.type === 'SWITCH_TAB') {
        console.log("Omni Shell received handoff, switching to:", event.data.tab);
        if (event.data.tab === 'chat') {
          setActiveTab('chat');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="omni-container">
      {/* Sidebar */}
      <aside className="omni-sidebar">
        <div className="omni-logo">
          <div className="omni-logo-icon">A</div>
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

      {/* Main Content Area (Iframes) */}
      <main className="omni-content">
        {/* Wayfarer Iframe (Port 3000) */}
        <iframe 
          src="http://localhost:3000" 
          className={`omni-iframe ${activeTab === 'research' ? 'active' : ''}`}
          title="Wayfarer Research"
        />

        {/* DockMind Iframe (Port 5173) */}
        <iframe 
          src="http://localhost:5173" 
          className={`omni-iframe ${activeTab === 'chat' ? 'active' : ''}`}
          title="DockMind Chat"
        />
      </main>
    </div>
  );
}

export default App;
