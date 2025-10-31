import React from 'react';
import { useAppContext } from '../../context/AppContext';
import SearchBar from '../SearchBar/SearchBar';
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
  
  return (
    <div className="pdfjs-toolbar">
      {/* Left Section - Sidebar + Page Navigation */}
      <div className="toolbar-left">
        <button 
          className="toolbar-button" 
          onClick={toggleSidebar}
          title="Toggle Sidebar (S)"
        >
          <span>☰</span>
        </button>
        
        <div className="toolbar-separator"></div>
        
        <button 
          className="toolbar-button" 
          onClick={() => goToPage(1)}
          disabled={!totalPages || currentPage === 1}
          title="First Page"
        >
          <span>⏮</span>
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={previousPage}
          disabled={!totalPages || currentPage === 1}
          title="Previous Page"
        >
          <span>◀</span>
        </button>
        
        <div className="page-controls">
          <div className="page-input-container">
            <input 
              type="number" 
              className="page-number-input"
              value={currentPage || 1}
              onChange={handlePageInput}
              min="1"
              max={totalPages || 1}
              disabled={!totalPages}
            />
            <span>/ {totalPages || 0}</span>
          </div>
        </div>
        
        <button 
          className="toolbar-button" 
          onClick={nextPage}
          disabled={!totalPages || currentPage === totalPages}
          title="Next Page"
        >
          <span>▶</span>
        </button>
        
        <button 
          className="toolbar-button" 
          onClick={() => goToPage(totalPages)}
          disabled={!totalPages || currentPage === totalPages}
          title="Last Page"
        >
          <span>⏭</span>
        </button>
      </div>
      
      {/* Center Section - Title or Search */}
      <div className="toolbar-center">
        {isSearchOpen ? (
          <SearchBar />
        ) : (
          <span className="toolbar-title">PDF Overlay System</span>
        )}
      </div>
      
      {/* Right Section - Search, Zoom, Overlays, Status */}
      <div className="toolbar-right">
        <button 
          className="toolbar-button" 
          onClick={toggleSearch}
          title="Search (Ctrl+F)"
        >
          <span>🔍</span>
        </button>
        
        <div className="toolbar-separator"></div>
        
        <div className="zoom-controls">
          <button 
            className="toolbar-button" 
            onClick={zoomOut}
            title="Zoom Out"
          >
            <span>-</span>
          </button>
          
          <select 
            className="zoom-select"
            value={scale ? scale.toString() : "1.5"}
            onChange={handleZoomSelect}
          >
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
            <option value="auto">Auto</option>
            <option value="page-fit">Page Fit</option>
            <option value="page-width">Page Width</option>
          </select>
          
          <button 
            className="toolbar-button" 
            onClick={zoomIn}
            title="Zoom In"
          >
            <span>+</span>
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <button 
          className="toolbar-button" 
          onClick={toggleOverlays}
          title="Toggle Overlays (O)"
          style={{ background: !overlaysVisible ? 'rgba(255,255,255,0.15)' : 'transparent' }}
        >
          <span>👁️</span>
        </button>
        
        <div className="toolbar-separator"></div>
        
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;

