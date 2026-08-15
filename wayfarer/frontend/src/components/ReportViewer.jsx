import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { RefreshCw, Send, Download } from 'lucide-react';

// The backend conforms every report to `[Source N (Confidence: Level)]`, so a
// single pattern is enough to turn citations into colour-coded chips. Runs
// before marked() — inline HTML passes through Markdown untouched.
const CITATION = /\[Source ([\d,\s]+) \(Confidence: (High|Medium|Low)\)\]/g;

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderCitations(markdown) {
  return markdown.replace(CITATION, (_m, ids, level) => {
    const safeIds = escapeHtml(ids.trim());
    const safeLevel = escapeHtml(level);
    return (
      `<span class="citation citation-${safeLevel.toLowerCase()}"` +
      ` title="Source ${safeIds} — ${safeLevel} confidence">` +
      `<span class="citation-id">S${safeIds.replace(/\s*,\s*/g, ',')}</span>` +
      `<span class="citation-level">${safeLevel}</span>` +
      `</span>`
    );
  });
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReportViewer({ topic, reportText, sources = [], onSectionRerun, isRunning }) {
  const [selectedSection, setSelectedSection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineSuccess, setRefineSuccess] = useState('');
  const [currentReport, setCurrentReport] = useState(reportText);

  useEffect(() => {
    setCurrentReport(reportText);
  }, [reportText]);

  if (!currentReport) {
    return (
      <div className="report-empty">
        <div className="report-empty-orbit">
          <span className="report-empty-core" />
        </div>
        <h3>Awaiting first transmission</h3>
        <p>
          Launch a deep search and the craft will survey each source in orbit.
          The synthesized, cited report lands here once every round is home.
        </p>
        <div className="report-empty-steps">
          <span>Plan</span>
          <i />
          <span>Research</span>
          <i />
          <span>Critique</span>
          <i />
          <span>Synthesize</span>
        </div>
      </div>
    );
  }

  const htmlContent = renderCitations(marked(currentReport));

  // Smart section parser extracting markdown and structured headers
  const sections = [];
  const lines = (currentReport || '').split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(?:#+\s+|\*\*\s*\d*[\.\)]?\s*)([^*#\n]+?)(?:\s*\*+|\s*#+)?$/);
    if (headingMatch && headingMatch[1]) {
      const clean = headingMatch[1].replace(/[*_#`~:]/g, '').trim();
      if (clean.length > 3 && clean.length < 80 && !clean.toLowerCase().includes('sources') && !clean.toLowerCase().includes('references') && !sections.includes(clean)) {
        sections.push(clean);
      }
    }
  });

  // Default fallback sections if headers were unstructured
  if (sections.length === 0) {
    sections.push(
      "Executive Summary",
      "Key Findings & Core Themes",
      "Major Releases & Leading Organizations",
      "Architectural Evolution & Technical Mechanisms",
      "Ecosystem Impact & Benchmark Performance",
      "Challenges, Tradeoffs & Future Outlook"
    );
  }

  const handleRerun = async (e) => {
    e.preventDefault();
    if (!selectedSection || !feedback.trim() || isRefining) return;
    
    setIsRefining(true);
    setRefineSuccess('');
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:8000/api/refine-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: selectedSection,
          feedback: feedback.trim(),
          report: currentReport,
          sources: sources || []
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.updated_report) {
        setCurrentReport(data.updated_report);
        setRefineSuccess(`✓ Section '${selectedSection}' successfully updated!`);
        setFeedback('');
        setTimeout(() => setRefineSuccess(''), 5000);
      } else {
        alert(data.message || 'Failed to refine section.');
      }
    } catch (err) {
      console.error('Refinement failed:', err);
      alert('Could not reach backend to refine section. Is backend active on port 8000?');
    } finally {
      setIsRefining(false);
    }
  };

  const handleDownloadMarkdown = () => {
    downloadFile(currentReport, 'wayfarer-research-report.md', 'text/markdown;charset=utf-8;');
  };

  const handleDownloadHTML = () => {
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wayfarer Research Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 1rem; color: #475569; }
    code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    pre code { display: block; padding: 1rem; overflow-x: auto; }
    .citation { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-decoration: none; margin: 0 2px; }
    .citation-high { background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }
    .citation-medium { background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); }
    .citation-low { background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    downloadFile(fullHtml, 'wayfarer-research-report.html', 'text/html;charset=utf-8;');
  };

  const handleDownloadText = () => {
    // Strip markdown formatting for plain text
    const plainText = reportText.replace(/[*_#`~]/g, '');
    downloadFile(plainText, 'wayfarer-research-report.txt', 'text/plain;charset=utf-8;');
  };

  const handleDownloadDOC = () => {
    const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Wayfarer Research Report</title></head>
<body>${htmlContent}</body>
</html>`;
    downloadFile(docHtml, 'wayfarer-research-report.doc', 'application/msword;charset=utf-8;');
  };

  const handleDownloadPDF = () => {
    // 1. Try opening print window first
    const printWindow = window.open('', '_blank');
    const fullHtmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wayfarer Research Report</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 1.5rem; color: #1e293b; }
          h1, h2, h3 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; margin-top: 1.5em; }
          blockquote { border-left: 4px solid #6366f1; margin: 1em 0; padding-left: 1rem; color: #475569; font-style: italic; }
          code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
          pre code { background: transparent; padding: 0; }
          .citation { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; border: 1px solid #cbd5e1; background: #f1f5f9; color: #334155; margin: 0 2px; }
          .citation-high { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
          .citation-medium { background: #fef3c7; color: #92400e; border-color: #fde68a; }
          .citation-low { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(fullHtmlDoc);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    } else {
      // Fallback for Desktop Apps (Electron / Tauri / WebViews) where window.open is blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(fullHtmlDoc);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
      }, 300);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Report Action / Download Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--bg-panel-border)', padding: '0.6rem 1rem', borderRadius: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Export Report
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* THE BRIDGE: Hand off to DockMind */}
          <button
            onClick={async (e) => {
              const btn = e.currentTarget;
              const originalText = btn.innerHTML;
              try {
                btn.disabled = true;
                btn.style.opacity = '0.7';
                btn.innerText = "⏳ Transferring to DockMind...";

                const host = window.location.hostname || 'localhost';
                const sessionId = 'wayfarer-' + Math.random().toString(36).substring(2, 9);
                
                // Formulate smart session name from topic or report title
                const headerMatch = reportText.match(/^#+\s+(.+)$/m);
                const rawName = topic || (headerMatch ? headerMatch[1].trim() : 'Research Report');
                const sessionName = rawName.length > 55 ? rawName.substring(0, 52) + '...' : rawName;
                
                // 1. Create the session in DockMind
                const sessRes = await fetch(`http://${host}:8001/sessions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ session_id: sessionId, name: sessionName })
                });

                if (!sessRes.ok) {
                  throw new Error(`Failed to create session on DockMind (HTTP ${sessRes.status})`);
                }

                // 2. Create a markdown file blob and ingest it
                const filename = (sessionName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32) || 'Research_Report') + '.md';
                const blob = new Blob([reportText], { type: 'text/markdown' });
                const formData = new FormData();
                formData.append('file', blob, filename);
                formData.append('session_id', sessionId);
                
                const ingestRes = await fetch(`http://${host}:8001/ingest`, {
                  method: 'POST',
                  body: formData,
                });

                if (!ingestRes.ok) {
                  throw new Error(`Failed to ingest report into DockMind (HTTP ${ingestRes.status})`);
                }

                // 3. Switch tab via postMessage to Omni Shell with the exact session_id
                window.parent.postMessage({ type: 'SWITCH_TAB', tab: 'chat', session_id: sessionId }, '*');
                
              } catch (err) {
                console.error("Handoff failed:", err);
                alert(`Failed to send to DockMind (${err.message || 'Is backend running on port 8001?'})`);
              } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = originalText;
              }
            }}
            title="Send to DockMind for Q&A"
            style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s', marginRight: '8px' }}
          >
            <Send size={13} />
            <span>💬 Chat with this Research</span>
          </button>
          
          <button
            onClick={handleDownloadPDF}
            title="Export/Save as PDF via browser print"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={13} />
            <span>PDF (.pdf)</span>
          </button>
          <button
            onClick={handleDownloadDOC}
            title="Download as Word document (.doc)"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={13} />
            <span>Word (.doc)</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            title="Download as Markdown (.md)"
            style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={13} />
            <span>Markdown (.md)</span>
          </button>
          <button
            onClick={handleDownloadHTML}
            title="Download formatted HTML document"
            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={13} />
            <span>HTML (.html)</span>
          </button>
          <button
            onClick={handleDownloadText}
            title="Download plain text file"
            style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--bg-panel-border)', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={13} />
            <span>Text (.txt)</span>
          </button>
        </div>
      </div>

      {/* Interactive Section-level Rerun Panel */}
      {sections.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--bg-panel-border)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} className={isRefining ? "animate-spin text-indigo-400" : "text-indigo-400"} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Refine Section-Level Research</span>
            </div>
            {refineSuccess && (
              <span style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                {refineSuccess}
              </span>
            )}
          </div>
          
          <form onSubmit={handleRerun} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                style={{ flex: 1, background: 'rgba(2, 6, 23, 0.8)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}
                disabled={isRefining || isRunning}
              >
                <option value="">-- Choose Section to Redo --</option>
                {sections.map((sec, idx) => (
                  <option key={idx} value={sec}>{sec}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isRefining || isRunning || !selectedSection || !feedback.trim()}
                style={{ background: isRefining ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: isRefining ? 'wait' : 'pointer' }}
              >
                {isRefining ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>{isRefining ? 'Refining...' : 'Submit Refinement'}</span>
              </button>
            </div>

            <textarea
              placeholder="e.g., focus more on local hardware tradeoffs or add performance stats..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{ width: '100%', height: '50px', background: 'rgba(2, 6, 23, 0.6)', border: '1px solid var(--bg-panel-border)', color: 'var(--text-main)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', outline: 'none', resize: 'none' }}
              disabled={isRefining || isRunning || !selectedSection}
            />
          </form>
        </div>
      )}

      {/* Rendered HTML Report */}
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
