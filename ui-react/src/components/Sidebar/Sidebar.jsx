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
    toggleOverlays,
    setCoordinateOrigin,
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
                <option value="bottom-left">Bottom-Left (PDF Standard)</option>
                <option value="top-left">Top-Left</option>
              </select>
            </div>
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

