import React from 'react';
import { useAppContext } from '../../context/AppContext';
import FileUploader from '../FileUploader/FileUploader';
import JSONUploader from '../JSONUploader/JSONUploader';
import DocumentSelector from '../DocumentSelector/DocumentSelector';
import './Sidebar.css';

const Sidebar = ({ onGenerateDocument }) => {
  const { 
    isSidebarOpen,
    currentPdf,
    currentPage,
    totalPages,
    overlaysVisible,
    coordinateOrigin,
    enableInstructionStack,
    enableVersioning,
    toggleOverlays,
    setCoordinateOrigin,
    toggleInstructionStack,
    toggleVersioning,
    isConnected
  } = useAppContext();
  
  return (
    <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-content">
        {/* File Upload Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Load PDF</h3>
          <FileUploader />
        </div>
        
        {/* JSON Upload Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Load Coordinates</h3>
          <JSONUploader />
        </div>
        
        {/* Document Info Section */}
        {currentPdf && (
          <div className="sidebar-section">
            <h3 className="sidebar-title">Document Info</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Pages:</span>
                <span className="info-value">{totalPages}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Current:</span>
                <span className="info-value">{currentPage}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Document Generation Section */}
        {isConnected && onGenerateDocument && (
          <div className="sidebar-section">
            <h3 className="sidebar-title">Generate Document</h3>
            <DocumentSelector onGenerate={onGenerateDocument} />
          </div>
        )}
        
        {/* Display Options Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Display Options</h3>
          <div className="option-list">
            <label className="option-item">
              <input
                type="checkbox"
                checked={overlaysVisible}
                onChange={toggleOverlays}
              />
              <span>Show Overlays</span>
            </label>
            
            <div className="option-item origin-selector">
              <label htmlFor="coordinateOrigin" className="origin-label">
                Coordinate Origin:
              </label>
              <select
                id="coordinateOrigin"
                className="origin-select"
                value={coordinateOrigin}
                onChange={(e) => setCoordinateOrigin(e.target.value)}
              >
                <option value="top-left">Top-Left (Default)</option>
                <option value="bottom-left">Bottom-Left (PDF Standard)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Feature Flags Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Feature Flags</h3>
          <p className="option-help" style={{ marginBottom: '10px', fontStyle: 'italic', color: '#888' }}>
            🔧 Managed by server configuration
          </p>
          <div className="option-list">
            <label className="option-item" title="Managed in server/config/server-config.json">
              <input
                type="checkbox"
                checked={enableInstructionStack}
                disabled
                style={{ cursor: 'not-allowed', opacity: 0.7 }}
              />
              <span>Instruction Stack (Batch Mode)</span>
            </label>
            <p className="option-help">
              {enableInstructionStack 
                ? '✅ Instructions will be queued and sent in batch' 
                : '⚠️ Instructions will be sent immediately'}
            </p>
            
            <label className="option-item" title="Managed in server/config/server-config.json">
              <input
                type="checkbox"
                checked={enableVersioning}
                disabled
                style={{ cursor: 'not-allowed', opacity: 0.7 }}
              />
              <span>Version History</span>
            </label>
            <p className="option-help">
              {enableVersioning 
                ? '✅ Document versions will be tracked' 
                : '⚠️ Version history is disabled'}
            </p>
            <p className="option-help" style={{ marginTop: '10px', fontSize: '0.85em', color: '#666' }}>
              💡 Edit <code style={{ background: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>server/config/server-config.json</code> to change
            </p>
          </div>
        </div>
        
        {/* Server Status Section */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Server Status</h3>
          <div className="status-item">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="sidebar-section">
          <h3 className="sidebar-title">Quick Guide</h3>
          <ul className="instruction-list">
            <li>📄 Upload a PDF file to begin</li>
            <li>🔍 Press Ctrl+F to search</li>
            <li>👁️ Toggle overlays on/off</li>
            <li>⌨️ Use arrow keys for navigation</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

