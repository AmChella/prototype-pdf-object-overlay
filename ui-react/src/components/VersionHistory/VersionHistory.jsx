import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import './VersionHistory.css';

/**
 * Custom Confirmation Modal Component
 */
const ConfirmModal = ({ isOpen, onClose, onConfirm, version }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>⚠️ Restore Version</h3>
          <button className="confirm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="confirm-modal-body">
          <p>Are you sure you want to restore to <strong>version {version}</strong>?</p>
          <p className="confirm-modal-warning">
            This will replace the current document with the selected version.
          </p>
        </div>
        <div className="confirm-modal-footer">
          <button className="confirm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="confirm-btn-restore" onClick={onConfirm}>
            ↺ Restore Version
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * VersionHistory Component
 * 
 * Displays document version history and allows navigation between versions
 */
const VersionHistory = () => {
  const { isConnected, send, enableVersioning } = useAppContext();
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState('document');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, versionNumber: null });
  
  // Listen for version-related custom events from App.jsx
  useEffect(() => {
    console.log('🎧 Setting up version history event listeners');
    
    const handleVersionHistory = (event) => {
      console.log('📜 Received versionHistory event:', event.detail);
      console.log('📜 Event type:', event.detail?.type);
      console.log('📜 Full event:', JSON.stringify(event.detail, null, 2));
      
      // Server sends 'history' array, not 'versions'
      const versionData = event.detail.history || event.detail.versions || [];
      console.log('📜 Version data array:', versionData);
      console.log('📜 Version count:', versionData.length);
      
      setVersions(versionData);
      setLoading(false);
      
      console.log('✅ Version state updated, loading stopped');
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
    
    console.log('✅ Event listeners registered');
    
    return () => {
      console.log('🧹 Cleaning up version history event listeners');
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
    if (!enableVersioning) {
      console.warn('⚠️ Versioning is disabled');
      return;
    }
    
    if (!isConnected) {
      console.warn('⚠️ Not connected, cannot fetch version history');
      return;
    }
    
    console.log('📜 Requesting version history for:', currentDocument);
    setLoading(true);
    
    const success = send({
      type: 'getVersionHistory',
      documentName: currentDocument,
      limit: 50
    });
    
    console.log('📜 Send result:', success);
  };
  
  const fetchVersionStats = () => {
    if (!enableVersioning) {
      console.warn('⚠️ Versioning is disabled');
      return;
    }
    
    if (!isConnected) {
      console.warn('⚠️ Not connected, cannot fetch version stats');
      return;
    }
    
    console.log('📊 Requesting version stats for:', currentDocument);
    
    send({
      type: 'getVersionStats',
      documentName: currentDocument
    });
  };
  
  const handleRestoreVersion = (versionNumber) => {
    if (!enableVersioning || !isConnected) return;
    setConfirmModal({ isOpen: true, versionNumber });
  };

  const confirmRestore = () => {
    if (!enableVersioning) {
      console.warn('⚠️ Versioning is disabled');
      return;
    }
    
    setLoading(true);
    send({
      type: 'restoreVersion',
      documentName: currentDocument,
      versionNumber: confirmModal.versionNumber
    });
    setConfirmModal({ isOpen: false, versionNumber: null });
  };

  const cancelRestore = () => {
    setConfirmModal({ isOpen: false, versionNumber: null });
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
    
    const elementId = version.elementId || 'element';
    const instruction = version.instruction || 'unknown';
    
    return `${instruction} → ${elementId}`;
  };
  
  // Don't render if versioning is disabled
  if (!enableVersioning) {
    return null;
  }
  
  const toggleExpanded = () => {
    if (isConnected) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const versionCount = stats?.totalVersions || versions.length || 0;
  
  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={cancelRestore}
        onConfirm={confirmRestore}
        version={confirmModal.versionNumber}
      />
      <div className="version-history">
        {/* Compact Toggle Button */}
        <button 
          className="version-history-toggle" 
          onClick={toggleExpanded}
          title={isConnected ? (isExpanded ? 'Collapse' : 'Expand') : 'Disconnected'}
          disabled={!isConnected}
        >
          <span className="version-history-label">🕒</span>
          <span className="version-history-count">{versionCount}</span>
          {isConnected && <span className="version-history-arrow">{isExpanded ? '▼' : '▶'}</span>}
          </button>
        
        {/* Dropdown Panel */}
        {isExpanded && isConnected && (
          <div className="version-history-dropdown">
            <div className="version-header">
              <span className="version-title">{versionCount} VERSIONS</span>
              {stats?.activeVersion && (
                <span className="version-active">v{stats.activeVersion}</span>
        )}
      </div>
      
            {/* Version Content */}
        <div className="version-content">
          {/* Document Selector */}
          <div className="version-document-selector">
            <select
              id="version-doc-select"
              value={currentDocument}
              onChange={(e) => setCurrentDocument(e.target.value)}
              className="version-doc-select"
            >
              <option value="document">document</option>
              <option value="ENDEND10921">ENDEND10921</option>
              <option value="EGG_100411">EGG_100411</option>
            </select>
            <button
              onClick={fetchVersionHistory}
              className="refresh-btn"
              disabled={loading}
              title="Refresh"
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
                  <div className="version-item-content">
                    <div className="version-item-left">
                    <span className="version-number">
                      v{version.versionNumber}
                      {version.isActive && <span className="active-badge">●</span>}
                    </span>
                      <span className="version-time">{formatTimestamp(version.timestamp)}</span>
                    </div>
                    
                    <div className="version-item-center">
                      <div className="version-description">
                        {version.description || formatInstruction(version)}
                      </div>
                      {version.elementId && (
                        <div className="version-element">{version.elementId}</div>
                    )}
                  </div>
                  
                  {!version.isActive && (
                      <button
                        onClick={() => handleRestoreVersion(version.versionNumber)}
                        className="restore-btn"
                        disabled={loading}
                        title="Restore"
                      >
                        ↺
                      </button>
                    )}
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      </div>
    </>
  );
};

export default VersionHistory;

