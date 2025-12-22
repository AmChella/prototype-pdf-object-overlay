import React from 'react';
import { useAppContext } from '../../context/AppContext';
import SearchBar from '../SearchBar/SearchBar';
import InstructionStack from '../InstructionStack/InstructionStack';
import VersionHistory from '../VersionHistory/VersionHistory';
import './Toolbar.css';

const Toolbar = () => {
  const {
    currentPage,
    totalPages,
    scale,
    isSearchOpen,
    isSidebarOpen,
    overlaysVisible,
    isConnected,
    goToPage,
    nextPage,
    previousPage,
    zoomIn,
    zoomOut,
    setZoomLevel,
    toggleSearch,
    toggleSidebar,
    toggleOverlays,
  } = useAppContext();

  const handlePageInput = (e) => {
    const pageNum = parseInt(e.target.value);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum);
    }
  };

  const handleZoomSelect = (e) => {
    const value = e.target.value;
    if (value === 'auto' || value === 'page-fit') {
      setZoomLevel(1.0);
    } else if (value === 'page-width') {
      setZoomLevel(1.5);
    } else {
      const newScale = parseFloat(value);
      if (!isNaN(newScale)) {
        setZoomLevel(newScale);
      }
    }
  };

  const zoomPercentage = Math.round(scale * 100);

  return (
    <header className="toolbar">
      {/* Left Section - Menu + Navigation */}
      <div className="toolbar-section toolbar-left">
        {/* Sidebar Toggle */}
        <button
          className={`toolbar-btn icon-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          title="Toggle Sidebar (S)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Page Navigation */}
        <div className="nav-group">
          <button
            className="toolbar-btn icon-btn"
            onClick={() => goToPage(1)}
            disabled={!totalPages || currentPage === 1}
            title="First Page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="11,17 6,12 11,7" />
              <polyline points="18,17 13,12 18,7" />
            </svg>
          </button>

          <button
            className="toolbar-btn icon-btn"
            onClick={previousPage}
            disabled={!totalPages || currentPage === 1}
            title="Previous Page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>

          <div className="page-indicator">
            <input
              type="number"
              className="page-input"
              value={currentPage || 1}
              onChange={handlePageInput}
              min="1"
              max={totalPages || 1}
              disabled={!totalPages}
            />
            <span className="page-separator">/</span>
            <span className="page-total">{totalPages || 0}</span>
          </div>

          <button
            className="toolbar-btn icon-btn"
            onClick={nextPage}
            disabled={!totalPages || currentPage === totalPages}
            title="Next Page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>

          <button
            className="toolbar-btn icon-btn"
            onClick={() => goToPage(totalPages)}
            disabled={!totalPages || currentPage === totalPages}
            title="Last Page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="13,17 18,12 13,7" />
              <polyline points="6,17 11,12 6,7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Section - Search or Title */}
      <div className="toolbar-section toolbar-center">
        {isSearchOpen ? (
          <SearchBar />
        ) : (
          <div className="toolbar-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span>PDF Overlay System</span>
          </div>
        )}
      </div>

      {/* Right Section - Tools */}
      <div className="toolbar-section toolbar-right">
        {/* Search */}
        <button
          className={`toolbar-btn icon-btn ${isSearchOpen ? 'active' : ''}`}
          onClick={toggleSearch}
          title="Search (Ctrl+F)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Zoom Controls */}
        <div className="zoom-group">
          <button
            className="toolbar-btn icon-btn"
            onClick={zoomOut}
            title="Zoom Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          <div className="zoom-indicator">
            <span className="zoom-value">{zoomPercentage}%</span>
          </div>

          <button
            className="toolbar-btn icon-btn"
            onClick={zoomIn}
            title="Zoom In"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Overlays Toggle */}
        <button
          className={`toolbar-btn icon-btn ${overlaysVisible ? 'active' : ''}`}
          onClick={toggleOverlays}
          title="Toggle Overlays (O)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {overlaysVisible ? (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
        </button>

        <div className="toolbar-divider" />

        {/* Instruction Stack */}
        <InstructionStack />

        {/* Version History */}
        {isConnected && <VersionHistory />}

        <div className="toolbar-divider" />

        {/* Connection Status */}
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot" />
          <span className="status-text">{isConnected ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
