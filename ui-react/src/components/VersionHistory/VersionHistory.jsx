import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import './VersionHistory.css';

/**
 * VersionHistory Component
 * 
 * Displays document version history and allows navigation between versions
 */
const VersionHistory = () => {
  const { isConnected, send } = useAppContext();
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState('document');
  
  // Listen for version-related custom events from App.jsx
  useEffect(() => {
    const handleVersionHistory = (event) => {
      console.log('📜 Received versionHistory event:', event.detail);
      // Server sends 'history' array, not 'versions'
      const versionData = event.detail.history || event.detail.versions || [];
      console.log('📜 Version data:', versionData);
      setVersions(versionData);
      setLoading(false);
    };
    
    const handleVersionStats = (event) => {
      console.log('📊 Received versionStats event:', event.detail);
      setStats(event.detail.stats);
    };
    
    const handleVersionRestored = (event) => {
      console.log('✅ Received versionRestored event:', event.detail);
      // Refresh version history after restoration
      fetchVersionHistory();
      fetchVersionStats();
    };
    
    const handleVersionError = (event) => {
      console.error('❌ Received versionError event:', event.detail);
      setLoading(false);
    };
    
    window.addEventListener('versionHistory', handleVersionHistory);
    window.addEventListener('versionStats', handleVersionStats);
    window.addEventListener('versionRestored', handleVersionRestored);
    window.addEventListener('versionError', handleVersionError);
    
    return () => {
      window.removeEventListener('versionHistory', handleVersionHistory);
      window.removeEventListener('versionStats', handleVersionStats);
      window.removeEventListener('versionRestored', handleVersionRestored);
      window.removeEventListener('versionError', handleVersionError);
    };
  }, []);
  
  // Fetch version history when component mounts or document changes
  useEffect(() => {
    if (isConnected && isExpanded) {
      fetchVersionHistory();
      fetchVersionStats();
    }
  }, [isConnected, currentDocument, isExpanded]);
  
  const fetchVersionHistory = () => {
    if (!isConnected) return;
    
    setLoading(true);
    send({
      type: 'getVersionHistory',
      documentName: currentDocument,
      limit: 50
    });
  };
  
  const fetchVersionStats = () => {
    if (!isConnected) return;
    
    send({
      type: 'getVersionStats',
      documentName: currentDocument
    });
  };
  
  const handleRestoreVersion = (versionNumber) => {
    if (!isConnected) return;
    
    const confirmed = window.confirm(
      `Restore version ${versionNumber}? This will replace the current document.`
    );
    
    if (confirmed) {
      setLoading(true);
      send({
        type: 'restoreVersion',
        documentName: currentDocument,
        versionNumber: versionNumber
      });
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatInstruction = (version) => {
    if (!version.instruction) return 'Initial version';
    
    return `${version.instruction} → ${version.elementId || 'element'}`;
  };
  
  if (!isConnected) {
    return (
      <div className="version-history">
        <div className="version-header">
          <h3 className="version-title">Version History</h3>
          <span className="version-status disconnected">Disconnected</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="version-history">
      {/* Header */}
      <div className="version-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="version-title-row">
          <h3 className="version-title">
            <span className="icon">🕒</span>
            Version History
          </h3>
          <button className="expand-btn" aria-label="Toggle version history">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        
        {/* Stats Summary */}
        {stats && (
          <div className="version-stats-summary">
            <span className="stat-item">
              <strong>{stats.totalVersions || 0}</strong> versions
            </span>
            {stats.activeVersion && (
              <span className="stat-item active">
                v{stats.activeVersion} active
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Expanded Version List */}
      {isExpanded && (
        <div className="version-content">
          {/* Document Selector */}
          <div className="version-document-selector">
            <label htmlFor="version-doc-select">Document:</label>
            <select
              id="version-doc-select"
              value={currentDocument}
              onChange={(e) => setCurrentDocument(e.target.value)}
              className="version-doc-select"
            >
              <option value="document">document</option>
              <option value="ENDEND10921">ENDEND10921</option>
            </select>
            <button
              onClick={fetchVersionHistory}
              className="refresh-btn"
              disabled={loading}
            >
              🔄
            </button>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div className="version-loading">
              <div className="spinner"></div>
              <span>Loading versions...</span>
            </div>
          )}
          
          {/* Version List */}
          {!loading && versions.length === 0 && (
            <div className="version-empty">
              <p>No versions yet</p>
              <small>Versions are created when you apply instructions</small>
            </div>
          )}
          
          {!loading && versions.length > 0 && (
            <div className="version-list">
              {versions.map((version) => (
                <div
                  key={version._id || version.versionNumber}
                  className={`version-item ${version.isActive ? 'active' : ''}`}
                >
                  <div className="version-item-header">
                    <span className="version-number">
                      v{version.versionNumber}
                      {version.isActive && <span className="active-badge">●</span>}
                    </span>
                    <span className="version-time">
                      {formatTimestamp(version.timestamp)}
                    </span>
                  </div>
                  
                  <div className="version-item-body">
                    <div className="version-description">
                      {version.description || formatInstruction(version)}
                    </div>
                    
                    {version.instruction && (
                      <div className="version-details">
                        <span className="version-detail-item">
                          <strong>Action:</strong> {version.instruction}
                        </span>
                        {version.overlayType && (
                          <span className="version-detail-item">
                            <strong>Type:</strong> {version.overlayType}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="version-meta">
                      <span className="version-user">👤 {version.userId || 'system'}</span>
                      <span className="version-hash">#{version.versionHash}</span>
                    </div>
                  </div>
                  
                  {!version.isActive && (
                    <div className="version-item-actions">
                      <button
                        onClick={() => handleRestoreVersion(version.versionNumber)}
                        className="restore-btn"
                        disabled={loading}
                      >
                        ↺ Restore
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;

