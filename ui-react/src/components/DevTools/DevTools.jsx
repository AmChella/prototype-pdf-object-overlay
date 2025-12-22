import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useDevTools } from '../../context/DevToolsContext';
import './DevTools.css';

const DevTools = () => {
  const { overlayData, setOverlayData, currentPage } = useAppContext();
  const { isDevToolsOpen, closeDevTools, logs, clearLogs, panelHeight, setPanelHeight } = useDevTools();

  const [activeTab, setActiveTab] = useState('console');
  const [jsonInput, setJsonInput] = useState('');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [isResizing, setIsResizing] = useState(false);

  const textareaRef = useRef(null);
  const panelRef = useRef(null);
  const logsEndRef = useRef(null);

  const exampleJson = `{
  "overlays": [
    {
      "type": "table",
      "page": 1,
      "x": 100,
      "y": 200,
      "width": 300,
      "height": 150
    }
  ]
}`;

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current && activeTab === 'logs') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setPanelHeight(Math.max(150, Math.min(600, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPanelHeight]);

  // Keyboard shortcut: F12 to toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        closeDevTools();
      }
    };

    if (isDevToolsOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDevToolsOpen, closeDevTools]);

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      if (!parsed.overlays || !Array.isArray(parsed.overlays)) {
        throw new Error('JSON must contain an "overlays" array');
      }

      const newOverlays = parsed.overlays.map((overlay, index) => {
        const { type = 'custom', page, x, y, width, height } = overlay;

        if (typeof x !== 'number' || typeof y !== 'number' ||
          typeof width !== 'number' || typeof height !== 'number') {
          throw new Error(`Overlay ${index + 1}: x, y, width, and height must be numbers`);
        }

        return {
          id: `dev-${Date.now()}-${index}`,
          type: type,
          page: page || currentPage,
          x: x,
          y: y,
          width: width,
          height: height,
          source: 'devtools'
        };
      });

      setOverlayData(prev => [...prev, ...newOverlays]);

      const timestamp = new Date().toLocaleTimeString();
      setConsoleOutput(prev => [
        ...prev,
        { type: 'success', message: `[${timestamp}] ✓ Added ${newOverlays.length} overlay(s)`, data: newOverlays }
      ]);

      setJsonInput('');
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      setConsoleOutput(prev => [
        ...prev,
        { type: 'error', message: `[${timestamp}] ✗ Error: ${error.message}` }
      ]);
    }
  };

  const handleClearDevOverlays = () => {
    const count = overlayData.filter(o => o.source === 'devtools').length;
    setOverlayData(prev => prev.filter(o => o.source !== 'devtools'));

    const timestamp = new Date().toLocaleTimeString();
    setConsoleOutput(prev => [
      ...prev,
      { type: 'info', message: `[${timestamp}] Cleared ${count} dev overlay(s)` }
    ]);
  };

  const handleClearConsole = () => {
    setConsoleOutput([]);
  };

  const handleLoadExample = () => {
    setJsonInput(exampleJson);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleJsonSubmit();
    }
  };

  const getLogTypeBadge = (type) => {
    const badges = {
      frontend: { label: 'FE', color: '#4fc3f7' },
      backend: { label: 'BE', color: '#81c784' },
      websocket: { label: 'WS', color: '#ffb74d' },
      error: { label: 'ERR', color: '#f48771' },
      info: { label: 'INFO', color: '#9d9d9d' },
      success: { label: 'OK', color: '#4ec9b0' }
    };
    return badges[type] || { label: type.toUpperCase(), color: '#9d9d9d' };
  };

  const filteredLogs = logFilter === 'all'
    ? logs
    : logs.filter(log => log.type === logFilter);

  const devOverlayCount = overlayData.filter(o => o.source === 'devtools').length;

  if (!isDevToolsOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="devtools-container devtools-footer"
      style={{ height: panelHeight }}
    >
      {/* Resize Handle */}
      <div
        className="devtools-resize-handle"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Chrome DevTools Header */}
      <div className="devtools-header">
        <div className="devtools-tabs">
          <button
            className={`devtools-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Console
          </button>
          <button
            className={`devtools-tab ${activeTab === 'elements' ? 'active' : ''}`}
            onClick={() => setActiveTab('elements')}
          >
            Overlays
          </button>
          <button
            className={`devtools-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
            {logs.length > 0 && (
              <span className="devtools-tab-badge">{logs.length}</span>
            )}
          </button>
        </div>
        <div className="devtools-actions">
          <button className="devtools-icon-btn" onClick={handleClearConsole} title="Clear console">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </button>
          <span className="devtools-badge">{devOverlayCount}</span>
          <button className="devtools-icon-btn devtools-close-btn" onClick={closeDevTools} title="Close DevTools (F12)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Console Tab Content */}
      {activeTab === 'console' && (
        <div className="devtools-console">
          {/* Console Output */}
          <div className="console-output">
            {consoleOutput.length === 0 ? (
              <div className="console-placeholder">
                <span className="console-info-icon">ℹ</span>
                Paste JSON overlay data and press <kbd>⌘</kbd>+<kbd>Enter</kbd> or click Run
              </div>
            ) : (
              consoleOutput.map((log, index) => (
                <div key={index} className={`console-line ${log.type}`}>
                  <span className="console-message">{log.message}</span>
                  {log.data && (
                    <details className="console-data">
                      <summary>View data</summary>
                      <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          {/* JSON Input Area */}
          <div className="console-input-wrapper">
            <div className="console-prompt">
              <span className="prompt-symbol">›</span>
            </div>
            <textarea
              ref={textareaRef}
              className="console-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='{ "overlays": [{ "type": "table", "page": 1, "x": 100, "y": 200, "width": 300, "height": 150 }] }'
              spellCheck={false}
            />
          </div>

          {/* Action Buttons */}
          <div className="console-actions">
            <button className="console-btn primary" onClick={handleJsonSubmit}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Run
            </button>
            <button className="console-btn secondary" onClick={handleLoadExample}>
              Load Example
            </button>
            <button className="console-btn danger" onClick={handleClearDevOverlays}>
              Clear Overlays
            </button>
          </div>
        </div>
      )}

      {/* Overlays Tab Content */}
      {activeTab === 'elements' && (
        <div className="devtools-elements">
          <div className="elements-tree">
            {overlayData.filter(o => o.source === 'devtools').length === 0 ? (
              <div className="elements-empty">
                <span className="elements-empty-icon">📦</span>
                No dev overlays added yet
              </div>
            ) : (
              overlayData
                .filter(o => o.source === 'devtools')
                .map((overlay) => (
                  <div key={overlay.id} className="element-node">
                    <span className="element-tag">&lt;overlay</span>
                    <span className="element-attr">type</span>=<span className="element-value">"{overlay.type}"</span>
                    <span className="element-attr">page</span>=<span className="element-value">"{overlay.page}"</span>
                    <span className="element-attr">x</span>=<span className="element-value">"{overlay.x}"</span>
                    <span className="element-attr">y</span>=<span className="element-value">"{overlay.y}"</span>
                    <span className="element-attr">w</span>=<span className="element-value">"{overlay.width}"</span>
                    <span className="element-attr">h</span>=<span className="element-value">"{overlay.height}"</span>
                    <span className="element-tag">/&gt;</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Logs Tab Content */}
      {activeTab === 'logs' && (
        <div className="devtools-logs">
          {/* Log Filters */}
          <div className="logs-toolbar">
            <div className="logs-filters">
              <button
                className={`log-filter-btn ${logFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLogFilter('all')}
              >
                All
              </button>
              <button
                className={`log-filter-btn ${logFilter === 'frontend' ? 'active' : ''}`}
                onClick={() => setLogFilter('frontend')}
              >
                Frontend
              </button>
              <button
                className={`log-filter-btn ${logFilter === 'backend' ? 'active' : ''}`}
                onClick={() => setLogFilter('backend')}
              >
                Backend
              </button>
              <button
                className={`log-filter-btn ${logFilter === 'websocket' ? 'active' : ''}`}
                onClick={() => setLogFilter('websocket')}
              >
                WebSocket
              </button>
              <button
                className={`log-filter-btn ${logFilter === 'error' ? 'active' : ''}`}
                onClick={() => setLogFilter('error')}
              >
                Errors
              </button>
            </div>
            <button className="logs-clear-btn" onClick={clearLogs}>
              Clear All
            </button>
          </div>

          {/* Log Entries */}
          <div className="logs-output">
            {filteredLogs.length === 0 ? (
              <div className="logs-empty">
                <span className="logs-empty-icon">📋</span>
                {logFilter === 'all'
                  ? 'No logs yet. Interact with the app to see logs here.'
                  : `No ${logFilter} logs to display.`
                }
              </div>
            ) : (
              <>
                {filteredLogs.map((log) => {
                  const badge = getLogTypeBadge(log.type);
                  return (
                    <div key={log.id} className={`log-entry log-${log.type}`}>
                      <span className="log-timestamp">{log.timestamp}</span>
                      <span
                        className="log-type-badge"
                        style={{ backgroundColor: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span className="log-message">{log.message}</span>
                      {log.data && (
                        <details className="log-data">
                          <summary>Data</summary>
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTools;
