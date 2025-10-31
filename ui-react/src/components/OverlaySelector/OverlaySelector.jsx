import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import './OverlaySelector.css';

const OverlaySelector = () => {
  const { overlayData, selectedOverlayId, setSelectedOverlayId, setHoveredOverlayId, currentPage, goToPage } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPage, setFilterPage] = useState('current'); // Default to current page
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Get unique pages
  const uniquePages = useMemo(() => {
    const pages = new Set();
    overlayData.forEach(overlay => {
      if (overlay && overlay.page) {
        pages.add(overlay.page);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [overlayData]);
  
  // Filter overlays
  const filteredOverlays = useMemo(() => {
    let filtered = overlayData || [];
    
    // Filter by page
    if (filterPage === 'current') {
      // Show current page overlays
      filtered = filtered.filter(o => o && o.page === currentPage);
    } else if (filterPage !== 'all') {
      // Show specific page
      const pageNum = parseInt(filterPage);
      filtered = filtered.filter(o => o && o.page === pageNum);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => {
        if (!o) return false;
        const idMatch = o.id?.toLowerCase().includes(term);
        const textMatch = o.text?.toLowerCase().includes(term);
        return idMatch || textMatch;
      });
    }
    
    return filtered;
  }, [overlayData, filterPage, searchTerm, currentPage]);
  
  // Detect overlay type from ID
  const detectOverlayType = (id) => {
    if (!id) return 'unknown';
    const idLower = id.toLowerCase();
    if (idLower.includes('fig') || idLower.includes('figure')) return 'figure';
    if (idLower.includes('tab') || idLower.includes('table')) return 'table';
    if (idLower.includes('para') || idLower.includes('p-') || idLower.includes('-p')) return 'paragraph';
    return 'unknown';
  };
  
  const handleOverlayClick = (overlay) => {
    // Navigate to the overlay's page if not already there
    if (overlay.page !== currentPage) {
      goToPage(overlay.page);
    }
    
    // Select the overlay (this will scroll to it on the PDF)
    setSelectedOverlayId(overlay.id);
    
    // Scroll the overlay into view in the selector list
    setTimeout(() => {
      const overlayElement = document.querySelector(`[data-overlay-id="${overlay.id}"]`);
      if (overlayElement) {
        overlayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };
  
  // Don't render if no overlays
  if (overlayData.length === 0) {
    return null;
  }
  
  return (
    <div className={`overlay-selector ${isCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="overlay-selector-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="overlay-selector-title-row">
          <span className="overlay-selector-title">📍 Overlays</span>
          <span className="overlay-selector-count">{filteredOverlays.length}</span>
        </div>
        <span className="overlay-selector-toggle">▼</span>
      </div>
      
      <div className="overlay-selector-body">
        <div className="overlay-filters">
          <input
            type="text"
            className="overlay-search"
            placeholder="Search overlays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select
            className="page-filter"
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
          >
            <option value="current">Current Page</option>
            <option value="all">All Pages</option>
            {uniquePages.map(page => (
              <option key={page} value={page}>
                Page {page}
              </option>
            ))}
          </select>
        </div>
        
        <div className="overlay-list">
          {filteredOverlays.length === 0 ? (
            <div className="overlay-empty">
              {overlayData.length === 0 ? 'No overlays available' : 'No matching overlays'}
            </div>
          ) : (
          filteredOverlays.map((overlay) => {
            const overlayType = detectOverlayType(overlay.id);
            return (
              <div
                key={overlay.id}
                data-overlay-id={overlay.id}
                className={`overlay-item overlay-type-${overlayType} ${selectedOverlayId === overlay.id ? 'selected' : ''}`}
                onClick={() => handleOverlayClick(overlay)}
                onMouseEnter={() => setHoveredOverlayId(overlay.id)}
                onMouseLeave={() => setHoveredOverlayId(null)}
              >
                <div className="overlay-item-header">
                  <div className="overlay-id-row">
                    <span className={`overlay-type-badge type-${overlayType}`}>
                      {overlayType === 'figure' && '🖼'}
                      {overlayType === 'table' && '📊'}
                      {overlayType === 'paragraph' && '📝'}
                      {overlayType === 'unknown' && '📄'}
                      <span className="type-label">{overlayType}</span>
                    </span>
                    <span className="overlay-id">{overlay.id}</span>
                  </div>
                  <span className="overlay-page">P{overlay.page}</span>
                </div>
                {overlay.text && (
                  <div className="overlay-text">{overlay.text}</div>
                )}
                <div className="overlay-coords">
                  ({overlay.x?.toFixed(2)}, {overlay.y?.toFixed(2)})
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlaySelector;

