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
  const [coordinateOrigin, setCoordinateOrigin] = useState('top-left'); // 'top-left' or 'bottom-left'
  
  // WebSocket State
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState(null);
  const [send, setSend] = useState(() => () => false); // WebSocket send function
  
  // Instruction Stack State
  const [instructionStack, setInstructionStack] = useState([]);
  
  // Feature Flags - These will be loaded from the server config
  // Default values will be overridden when server config is received
  const [enableInstructionStack, setEnableInstructionStack] = useState(true);
  const [enableVersioning, setEnableVersioning] = useState(true);
  
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
  
  // Feature Flag Actions
  // Note: Feature flags are managed by the server and cannot be toggled from UI
  // These functions are kept for backward compatibility but log warnings
  const toggleInstructionStack = useCallback(() => {
    console.warn('⚠️ Feature flags are now managed by the server. Edit server/config/server-config.json to change.');
    console.log('💡 Current instruction stack status:', enableInstructionStack ? 'enabled' : 'disabled');
  }, [enableInstructionStack]);
  
  const toggleVersioning = useCallback(() => {
    console.warn('⚠️ Feature flags are now managed by the server. Edit server/config/server-config.json to change.');
    console.log('💡 Current versioning status:', enableVersioning ? 'enabled' : 'disabled');
  }, [enableVersioning]);
  
  // Instruction Stack Actions
  const addInstruction = useCallback((instruction) => {
    // Only add if feature is enabled
    if (!enableInstructionStack) {
      console.warn('⚠️ Instruction stack feature is disabled');
      return null;
    }
    
    const newInstruction = {
      ...instruction,
      id: Date.now(), // Unique ID
      timestamp: new Date().toISOString()
    };
    setInstructionStack(prev => [...prev, newInstruction]);
    console.log('📝 Added instruction to stack:', newInstruction);
    return newInstruction;
  }, [enableInstructionStack]);
  
  const removeInstruction = useCallback((instructionId) => {
    setInstructionStack(prev => prev.filter(i => i.id !== instructionId));
    console.log('🗑️ Removed instruction:', instructionId);
  }, []);
  
  const clearInstructionStack = useCallback(() => {
    setInstructionStack([]);
    console.log('🧹 Cleared instruction stack');
  }, []);
  
  const sendBatchInstructions = useCallback(async () => {
    if (!enableInstructionStack) {
      console.warn('⚠️ Instruction stack feature is disabled');
      return false;
    }
    
    if (instructionStack.length === 0) {
      console.warn('⚠️ No instructions to send');
      return false;
    }
    
    if (!send || typeof send !== 'function') {
      console.error('❌ WebSocket send function not available');
      return false;
    }
    
    console.log(`🚀 Sending ${instructionStack.length} batch instructions`);
    console.log('📦 Instruction stack:', instructionStack);
    
    const message = {
      type: 'batch_instructions',
      instructions: instructionStack.map(i => ({
        elementId: i.elementId,
        overlayType: i.overlayType,
        instruction: i.instruction,
        instructionValue: i.instructionValue
      })),
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending message:', JSON.stringify(message, null, 2));
    
    const success = send(message);
    
    if (success) {
      // Clear stack after sending
      clearInstructionStack();
    }
    
    return success;
  }, [enableInstructionStack, instructionStack, send, clearInstructionStack]);
  
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
    send,
    instructionStack,
    enableInstructionStack,
    enableVersioning,
    
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
    setSend,
    setProgressStages,
    setSelectedOverlayId,
    setHoveredOverlayId,
    setOverlaysVisible,
    setIsSearchOpen,
    setEnableInstructionStack,
    setEnableVersioning,
    
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
    addInstruction,
    removeInstruction,
    clearInstructionStack,
    sendBatchInstructions,
    toggleInstructionStack,
    toggleVersioning,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

