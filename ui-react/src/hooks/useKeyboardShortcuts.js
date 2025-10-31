import { useEffect } from 'react';

export const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // Ctrl/Cmd + F - Toggle Search
      if (cmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        if (handlers.onToggleSearch) {
          handlers.onToggleSearch();
        }
      }
      
      // Escape - Close search/modal
      else if (e.key === 'Escape') {
        if (handlers.onEscape) {
          handlers.onEscape();
        }
      }
      
      // Arrow Left/Right - Navigate pages
      else if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
        if (handlers.onPreviousPage) {
          handlers.onPreviousPage();
        }
      }
      else if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
        if (handlers.onNextPage) {
          handlers.onNextPage();
        }
      }
      
      // +/= - Zoom in
      else if ((e.key === '+' || e.key === '=') && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (handlers.onZoomIn) {
          handlers.onZoomIn();
        }
      }
      
      // - - Zoom out
      else if (e.key === '-' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (handlers.onZoomOut) {
          handlers.onZoomOut();
        }
      }
      
      // S - Toggle sidebar
      else if (e.key === 's' && !e.target.matches('input, textarea') && !cmdOrCtrl) {
        e.preventDefault();
        if (handlers.onToggleSidebar) {
          handlers.onToggleSidebar();
        }
      }
      
      // O - Toggle overlays
      else if (e.key === 'o' && !e.target.matches('input, textarea') && !cmdOrCtrl) {
        e.preventDefault();
        if (handlers.onToggleOverlays) {
          handlers.onToggleOverlays();
        }
      }
      
      // Home - First page
      else if (e.key === 'Home' && !e.target.matches('input, textarea')) {
        if (handlers.onFirstPage) {
          handlers.onFirstPage();
        }
      }
      
      // End - Last page
      else if (e.key === 'End' && !e.target.matches('input, textarea')) {
        if (handlers.onLastPage) {
          handlers.onLastPage();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
};

