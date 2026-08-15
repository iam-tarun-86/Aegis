import { useState, useRef, useCallback } from 'react';

export function useResearchSocket() {
  const [isRunning, setIsRunning] = useState(false);
  const [graphState, setGraphState] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [networkActivity, setNetworkActivity] = useState([]);
  const socketRef = useRef(null);

  const startResearch = useCallback((topic, maxRounds = 3, llmConfig = null) => {
    setIsRunning(true);
    setGraphState(null);
    setStatusMessage('Connecting to local research agent...');
    setError(null);
    setNetworkActivity([]);

    const wsUrl = `ws://${window.location.hostname}:8000/ws/research`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setStatusMessage('Connected. Sending research configuration...');
      ws.send(JSON.stringify({ topic, max_rounds: maxRounds, llm_config: llmConfig }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'status') {
          setStatusMessage(payload.message);
        } else if (payload.type === 'state_update') {
          setGraphState(payload.state);
          setStatusMessage(`Active Node: ${payload.node}`);
          if (payload.state.network_activity) {
            setNetworkActivity(payload.state.network_activity);
          }
        } else if (payload.type === 'complete') {
          setIsRunning(false);
          setStatusMessage('Research complete!');
          if (payload.final_report) {
            setGraphState((prev) => ({
              ...prev,
              final_report: payload.final_report,
              sources: payload.sources || prev?.sources
            }));
          }
        } else if (payload.type === 'error') {
          setError(payload.message);
          setIsRunning(false);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setError('Failed to connect to backend server. Make sure backend is running on port 8000.');
      setIsRunning(false);
    };

    ws.onclose = () => {
      setIsRunning(false);
    };
  }, []);

  const triggerSectionRerun = useCallback((section, feedback) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setIsRunning(true);
      setStatusMessage(`Refining section '${section}'...`);
      socketRef.current.send(JSON.stringify({
        type: 'section_rerun',
        section,
        feedback
      }));
    }
  }, []);

  const cancelResearch = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsRunning(false);
    setStatusMessage('Research cancelled by user.');
  }, []);

  return {
    isRunning,
    graphState,
    statusMessage,
    error,
    networkActivity,
    startResearch,
    triggerSectionRerun,
    cancelResearch
  };
}
