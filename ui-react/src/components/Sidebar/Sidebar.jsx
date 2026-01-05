import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useDevTools } from '../../context/DevToolsContext';
import FileUploader from '../FileUploader/FileUploader';
import JSONUploader from '../JSONUploader/JSONUploader';
import DocumentSelector from '../DocumentSelector/DocumentSelector';
import ArticleFetcher from '../ArticleFetcher/ArticleFetcher';
import FileBrowserModal from '../FileBrowser/FileBrowser';
import './Sidebar.css';

const Sidebar = ({ onGenerateDocument, onArticleFetched }) => {
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

  const { toggleDevTools, isDevToolsOpen } = useDevTools();

  const [expandedSection, setExpandedSection] = useState('files');
  const [articleData, setArticleData] = useState(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const handleArticleFetched = (data) => {
    // Store the article data including fileTree for FileBrowser
    setArticleData(data);
    // Show the file browser modal
    if (data.fileTree) {
      setShowFileBrowser(true);
    }
    // Call parent callback
    if (onArticleFetched) {
      onArticleFetched(data);
    }
  };

  const handleCloseFileBrowser = () => {
    setShowFileBrowser(false);
  };

  return (
    <>
      <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>PDF Overlay</span>
          </div>
          <div className={`connection-indicator ${isConnected ? 'connected' : ''}`} title={isConnected ? 'Connected' : 'Disconnected'}>
            <span className="connection-dot"></span>
          </div>
        </div>

        <div className="sidebar-content">
          {/* Files Section - Collapsible */}
          <div className={`sidebar-accordion ${expandedSection === 'files' ? 'expanded' : ''}`}>
            <button className="accordion-header" onClick={() => toggleSection('files')}>
              <div className="accordion-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Files</span>
              </div>
              <svg className="accordion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <div className="accordion-content">
              <div className="upload-group">
                <label className="upload-label">PDF Document</label>
                <FileUploader />
              </div>
              <div className="upload-group">
                <label className="upload-label">Coordinates (JSON)</label>
                <JSONUploader />
              </div>
            </div>
          </div>

          {/* Document Info - Only show when PDF is loaded */}
          {currentPdf && (
            <div className="document-info-bar">
              <div className="doc-stat">
                <span className="doc-stat-value">{currentPage}</span>
                <span className="doc-stat-label">/ {totalPages}</span>
              </div>
              <div className="doc-stat-divider"></div>
              <div className="doc-stat">
                <span className="doc-stat-label">Pages</span>
              </div>
            </div>
          )}

          {/* Generate Section - Collapsible */}
          {isConnected && onGenerateDocument && (
            <div className={`sidebar-accordion ${expandedSection === 'generate' ? 'expanded' : ''}`}>
              <button className="accordion-header" onClick={() => toggleSection('generate')}>
                <div className="accordion-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21 5,3" />
                  </svg>
                  <span>Generate</span>
                </div>
                <svg className="accordion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              <div className="accordion-content">
                <DocumentSelector onGenerate={onGenerateDocument} />
              </div>
            </div>
          )}

          {/* Fetch S3 Section - Collapsible */}
          <div className={`sidebar-accordion ${expandedSection === 'fetch-s3' ? 'expanded' : ''}`}>
            <button className="accordion-header" onClick={() => toggleSection('fetch-s3')}>
              <div className="accordion-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Fetch from S3</span>
              </div>
              <svg className="accordion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <div className="accordion-content">
              <ArticleFetcher onArticleFetched={handleArticleFetched} />
              {articleData && articleData.fileTree && !showFileBrowser && (
                <button
                  className="show-files-btn"
                  onClick={() => setShowFileBrowser(true)}
                >
                  📂 Show Article Files
                </button>
              )}
            </div>
          </div>


          {/* Settings Section - Collapsible */}
          <div className={`sidebar-accordion ${expandedSection === 'settings' ? 'expanded' : ''}`}>
            <button className="accordion-header" onClick={() => toggleSection('settings')}>
              <div className="accordion-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Settings</span>
              </div>
              <svg className="accordion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            <div className="accordion-content">
              <label className="toggle-option">
                <span>Show Overlays</span>
                <div className={`toggle-switch ${overlaysVisible ? 'active' : ''}`} onClick={toggleOverlays}>
                  <div className="toggle-knob"></div>
                </div>
              </label>

              <div className="select-option">
                <label>Coordinate Origin</label>
                <select
                  className="modern-select"
                  value={coordinateOrigin}
                  onChange={(e) => setCoordinateOrigin(e.target.value)}
                >
                  <option value="top-left">Top-Left</option>
                  <option value="bottom-left">Bottom-Left (PDF)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sidebar-footer">
          <button
            className={`footer-btn devtools-btn ${isDevToolsOpen ? 'active' : ''}`}
            onClick={toggleDevTools}
            title="Toggle Developer Tools (F12)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>DevTools</span>
            {isDevToolsOpen && <span className="btn-badge">Open</span>}
          </button>

          <div className="footer-shortcuts">
            <kbd>F12</kbd> DevTools
            <span className="shortcut-divider">•</span>
            <kbd>⌘F</kbd> Search
          </div>
        </div>
      </aside>

      {/* File Browser Modal */}
      {showFileBrowser && articleData && articleData.fileTree && (
        <FileBrowserModal
          fileTree={articleData.fileTree}
          journalId={articleData.journalId}
          articleId={articleData.articleId}
          onClose={handleCloseFileBrowser}
        />
      )}
    </>
  );
};

export default Sidebar;

