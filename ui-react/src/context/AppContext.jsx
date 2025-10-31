import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // PDF State
  const [currentPdf, setCurrentPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  
  // Overlay State
  const [overlayData, setOverlayData] = useState([]);
  const [overlaysVisible, setOverlaysVisible] = useState(true);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [hoveredOverlayId, setHoveredOverlayId] = useState(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressStages, setProgressStages] = useState([]);
  const [coordinateOrigin, setCoordinateOrigin] = useState('bottom-left'); // 'top-left' or 'bottom-left'
  
  // WebSocket State
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState(null);
  
  // PDF Actions
  const loadPDF = useCallback((pdf) => {
    setCurrentPdf(pdf);
    setTotalPages(pdf.numPages);
    setCurrentPage(1);
  }, []);
  
  const goToPage = useCallback((pageNum) => {
    console.log(`📄 goToPage called: pageNum=${pageNum}, currentPage=${currentPage}, totalPages=${totalPages}`);
    
    // Convert to number and validate
    const targetPage = Number(pageNum);
    if (isNaN(targetPage)) {
      console.warn(`⚠️ Invalid page number: ${pageNum}`);
      return;
    }
    
    // Check if totalPages is set
    if (totalPages === 0) {
      console.warn(`⚠️ Cannot navigate: totalPages not set yet`);
      return;
    }
    
    if (targetPage >= 1 && targetPage <= totalPages) {
      console.log(`✅ Navigating to page ${targetPage}`);
      setCurrentPage(targetPage);
    } else {
      console.warn(`⚠️ Page ${targetPage} is out of range (1-${totalPages})`);
    }
  }, [totalPages, currentPage]);
  
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  const setZoomLevel = useCallback((newScale) => {
    setScale(Math.max(0.25, Math.min(3, newScale)));
  }, []);
  
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3, prev + 0.25));
  }, []);
  
  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.25, prev - 0.25));
  }, []);
  
  // Search Actions
  const toggleSearch = useCallback(() => {
    setIsSearchOpen(prev => {
      const newValue = !prev;
      // If closing search (newValue is false), clear search state
      if (!newValue) {
        console.log('🧹 Closing search and clearing state');
        setSearchQuery('');
        setSearchMatches([]);
        setCurrentMatchIndex(-1);
      }
      return newValue;
    });
  }, []);
  
  const findNextMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length);
    }
  }, [searchMatches]);
  
  const findPrevMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(prev => 
        prev <= 0 ? searchMatches.length - 1 : prev - 1
      );
    }
  }, [searchMatches]);
  
  // Overlay Actions
  const toggleOverlays = useCallback(() => {
    setOverlaysVisible(prev => {
      const newValue = !prev;
      localStorage.setItem('overlaysVisible', newValue.toString());
      return newValue;
    });
  }, []);
  
  const selectOverlay = useCallback((overlayId) => {
    setSelectedOverlayId(overlayId);
  }, []);
  
  // UI Actions
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  const showProgress = useCallback((title, stages) => {
    setIsProgressOpen(true);
    setProgressStages(stages || []);
  }, []);
  
  const hideProgress = useCallback(() => {
    setIsProgressOpen(false);
  }, []);
  
  const value = {
    // State
    currentPdf,
    currentPage,
    totalPages,
    scale,
    overlayData,
    overlaysVisible,
    selectedOverlayId,
    hoveredOverlayId,
    searchQuery,
    searchMatches,
    currentMatchIndex,
    isSearchOpen,
    isSidebarOpen,
    isModalOpen,
    isProgressOpen,
    progressStages,
    coordinateOrigin,
    isConnected,
    ws,
    dropdownOptions,
    
    // Setters (for direct state updates)
    setCurrentPdf,
    setCurrentPage,
    setOverlayData,
    setSearchQuery,
    setSearchMatches,
    setCurrentMatchIndex,
    setCoordinateOrigin,
    setIsConnected,
    setWs,
    setDropdownOptions,
    setProgressStages,
    setSelectedOverlayId,
    setHoveredOverlayId,
    setOverlaysVisible,
    setIsSearchOpen,
    
    // Actions
    loadPDF,
    goToPage,
    nextPage,
    previousPage,
    setZoomLevel,
    zoomIn,
    zoomOut,
    toggleSearch,
    findNextMatch,
    findPrevMatch,
    toggleOverlays,
    selectOverlay,
    toggleSidebar,
    openModal,
    closeModal,
    showProgress,
    hideProgress,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

