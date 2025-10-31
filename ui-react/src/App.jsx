import React, { useState, useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider, useToast } from './components/Toast/ToastContainer';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';
import PDFViewer from './components/PDFViewer/PDFViewer';
import ProgressModal from './components/ProgressModal/ProgressModal';
import ActionModal from './components/ActionModal/ActionModal';
import OverlaySelector from './components/OverlaySelector/OverlaySelector';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { usePDF } from './hooks/usePDF';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadOverlayJSON, findPreferredJSONPath, convertToRelativeUrl } from './utils/jsonLoader';
import './App.css';

/**
 * Main PDF Overlay Application
 * 
 * This is the root component that provides context to all child components
 * and sets up the main application layout.
 */
function AppContent() {
  const { 
    loadPDF: contextLoadPDF, 
    setIsConnected,
    setDropdownOptions,
    toggleSearch,
    isSearchOpen,
    nextPage,
    previousPage,
    goToPage,
    totalPages,
    zoomIn,
    zoomOut,
    toggleSidebar,
    toggleOverlays,
    selectedOverlayId,
    overlayData,
    setOverlayData
  } = useAppContext();
  const { loadPDF } = usePDF();
  const toast = useToast();
  const [progress, setProgress] = useState({
    isOpen: false,
    title: '',
    progress: 0,
    status: '',
    stages: []
  });
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    overlay: null
  });
  
  // WebSocket handlers
  const wsHandlers = {
    onConfig: (data) => {
      console.log('⚙️ Config received from server:', data);
      if (data.data && data.data.dropdownOptions) {
        setDropdownOptions(data.data.dropdownOptions);
        console.log('✅ Dropdown options loaded:', data.data.dropdownOptions);
      }
    },
    
    onProcessingStarted: (data) => {
      console.log('🎯 Processing started:', data);
      
      toast.showInfo(`Processing ${data.overlayType} instruction...`);
      
      // Show progress modal
      setProgress({
        isOpen: true,
        title: `Processing ${data.instruction} on ${data.elementId}...`,
        progress: 0,
        status: 'Applying instruction to XML...',
        stages: [
          { label: 'Applying Instruction', status: 'active' },
          { label: 'Regenerating PDF', status: 'pending' },
          { label: 'Loading Results', status: 'pending' }
        ]
      });
    },
    
    onProcessingComplete: async (data) => {
      console.log('✅ Processing complete:', data);
      
      setProgress(prev => ({
        ...prev,
        progress: 100,
        status: 'Complete! Loading updated files...',
        stages: prev.stages.map(s => ({ ...s, status: 'completed' }))
      }));
      
      toast.showSuccess('Document updated successfully!');
      
      // Load the updated PDF and JSON
      if (data.result && data.result.pdfPath && data.result.jsonPath) {
        setTimeout(async () => {
          try {
            // Convert file system paths to URLs
            const pdfRelative = convertToRelativeUrl(data.result.pdfPath);
            let jsonRelative = convertToRelativeUrl(data.result.jsonPath);
            
            const pdfUrl = `http://localhost:8081${pdfRelative}`;
            let jsonUrl = `http://localhost:8081${jsonRelative}`;
            
            // Check for preferred marked-boxes format
            jsonUrl = await findPreferredJSONPath(jsonUrl);
            
            console.log('📂 Loading updated files:');
            console.log('  PDF:', pdfUrl);
            console.log('  JSON:', jsonUrl);
            
            // Load PDF
            setProgress(prev => ({ ...prev, status: 'Loading PDF...' }));
            const pdf = await loadPDF(pdfUrl);
            contextLoadPDF(pdf);
            
            // Load JSON overlays
            setProgress(prev => ({ ...prev, status: 'Loading overlays...' }));
            const overlays = await loadOverlayJSON(jsonUrl);
            setOverlayData(overlays);
            
            toast.showSuccess(`Updated PDF and ${overlays.length} overlays loaded!`);
            
            // Close progress modal after brief delay
            setTimeout(() => {
              setProgress(prev => ({ ...prev, isOpen: false }));
            }, 1000);
          } catch (err) {
            console.error('❌ Error loading updated files:', err);
            toast.showError('Failed to load updated files: ' + err.message);
            setProgress(prev => ({
              ...prev,
              status: 'Error loading files: ' + err.message
            }));
          }
        }, 500);
      }
    },
    
    onProcessingError: (data) => {
      console.error('❌ Processing error:', data);
      
      toast.showError('Processing failed: ' + (data.error || 'Unknown error'));
      
      setProgress(prev => ({
        ...prev,
        status: `Error: ${data.error || 'Unknown error'}`,
        stages: prev.stages.map((s, i) => 
          i === prev.stages.findIndex(st => st.status === 'active') 
            ? { ...s, status: 'error' } 
            : s
        )
      }));
    },
    
    onProgress: (data) => {
      console.log('📊 Progress update:', data);
      
      // Update progress based on message
      let updatedStages = [...(progress.stages || [])];
      const message = data.message || '';
      
      // Update stages based on progress message
      if (message.includes('Compiling') || message.includes('LaTeX')) {
        updatedStages = updatedStages.map((stage, i) => {
          if (i === 0) return { ...stage, status: 'completed' };
          if (i === 1) return { ...stage, status: 'active' };
          return stage;
        });
      } else if (message.includes('Generating') || message.includes('PDF')) {
        updatedStages = updatedStages.map((stage, i) => {
          if (i === 0 || i === 1) return { ...stage, status: 'completed' };
          if (i === 2) return { ...stage, status: 'active' };
          return stage;
        });
      } else if (message.includes('Copying')) {
        updatedStages = updatedStages.map(s => ({ ...s, status: 'completed' }));
      }
      
      setProgress(prev => ({
        ...prev,
        progress: data.progress || (message.includes('Copying') ? 90 : prev.progress),
        status: message || prev.status,
        stages: updatedStages
      }));
    },
    
    onComplete: async (data) => {
      console.log('✅ Generation complete:', data);
      setProgress(prev => ({
        ...prev,
        progress: 100,
        status: 'Complete! Loading files...',
        stages: prev.stages.map(s => ({ ...s, status: 'completed' }))
      }));
      
      toast.showSuccess('Document generated successfully!');
      
      // Load the generated PDF and JSON
      if (data.pdfPath && data.jsonPath) {
        setTimeout(async () => {
          try {
            // Convert file system paths to URLs
            const pdfRelative = convertToRelativeUrl(data.pdfPath);
            let jsonRelative = convertToRelativeUrl(data.jsonPath);
            
            const pdfUrl = `http://localhost:8081${pdfRelative}`;
            let jsonUrl = `http://localhost:8081${jsonRelative}`;
            
            // Check for preferred marked-boxes format
            jsonUrl = await findPreferredJSONPath(jsonUrl);
            
            console.log('📂 Loading generated files:');
            console.log('  PDF:', pdfUrl);
            console.log('  JSON:', jsonUrl);
            
            // Load PDF
            setProgress(prev => ({ ...prev, status: 'Loading PDF...' }));
            const pdf = await loadPDF(pdfUrl);
            contextLoadPDF(pdf);
            
            // Load JSON overlays
            setProgress(prev => ({ ...prev, status: 'Loading overlays...' }));
            const overlays = await loadOverlayJSON(jsonUrl);
            setOverlayData(overlays);
            
            toast.showSuccess(`PDF and ${overlays.length} overlays loaded!`);
            
            // Close progress modal after brief delay
            setTimeout(() => {
              setProgress(prev => ({ ...prev, isOpen: false }));
            }, 1000);
          } catch (err) {
            console.error('❌ Error loading generated files:', err);
            toast.showError('Failed to load files: ' + err.message);
            setProgress(prev => ({
              ...prev,
              status: 'Error loading files: ' + err.message
            }));
          }
        }, 500);
      } else if (data.pdfPath) {
        // Fallback: Only PDF path provided
        setTimeout(async () => {
          try {
            const pdfRelative = convertToRelativeUrl(data.pdfPath);
            const pdfUrl = `http://localhost:8081${pdfRelative}`;
            
            console.log('📂 Loading generated PDF from:', pdfUrl);
            const pdf = await loadPDF(pdfUrl);
            contextLoadPDF(pdf);
            
            toast.showSuccess('PDF loaded successfully!');
            
            setTimeout(() => {
              setProgress(prev => ({ ...prev, isOpen: false }));
            }, 1000);
          } catch (err) {
            console.error('❌ Error loading generated PDF:', err);
            toast.showError('Failed to load PDF: ' + err.message);
            setProgress(prev => ({
              ...prev,
              status: 'Error loading PDF: ' + err.message
            }));
          }
        }, 500);
      }
    },
    
    onError: (data) => {
      console.error('❌ Generation error:', data);
      toast.showError(data.message || 'Document generation failed');
      setProgress(prev => ({
        ...prev,
        status: `Error: ${data.message || 'Unknown error'}`,
        stages: prev.stages.map((s, i) => 
          i === prev.stages.length - 1 ? { ...s, status: 'error' } : s
        )
      }));
    },
    
    onConnect: () => {
      console.log('🔗 Connected to server');
      setIsConnected(true);
      toast.showSuccess('Connected to server');
    },
    
    onDisconnect: () => {
      console.log('🔌 Disconnected from server');
      setIsConnected(false);
      toast.showWarning('Disconnected from server');
    }
  };
  
  const { isConnected, generateDocument, send } = useWebSocket('ws://localhost:8081', wsHandlers);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleSearch: () => {
      toggleSearch();
      if (!isSearchOpen) {
        toast.showInfo('Search opened (Esc to close)');
      }
    },
    onEscape: () => {
      if (isSearchOpen) {
        toggleSearch();
      } else if (actionModal.isOpen) {
        setActionModal({ isOpen: false, overlay: null });
      }
    },
    onNextPage: () => {
      if (totalPages) nextPage();
    },
    onPreviousPage: () => {
      if (totalPages) previousPage();
    },
    onFirstPage: () => {
      if (totalPages) goToPage(1);
    },
    onLastPage: () => {
      if (totalPages) goToPage(totalPages);
    },
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onToggleSidebar: toggleSidebar,
    onToggleOverlays: toggleOverlays,
  });
  
  const handleGenerateDocument = useCallback((documentName) => {
    console.log(`🚀 Generating ${documentName}...`);
    
    toast.showInfo(`Generating ${documentName}...`);
    
    // Show progress modal
    setProgress({
      isOpen: true,
      title: `Generating ${documentName}...`,
      progress: 0,
      status: 'Starting generation...',
      stages: [
        { label: 'Parsing XML', status: 'active' },
        { label: 'Compiling LaTeX', status: 'pending' },
        { label: 'Generating PDF', status: 'pending' }
      ]
    });
    
    // Send generation request
    generateDocument(documentName);
  }, [generateDocument, toast]);
  
  const handleCancelProgress = () => {
    setProgress(prev => ({ ...prev, isOpen: false }));
  };
  
  // Track if modal was manually closed to prevent auto-reopening
  const modalClosedManuallyRef = React.useRef(false);
  
  // Show action modal when overlay is selected
  React.useEffect(() => {
    if (selectedOverlayId && overlayData) {
      // Reset the manually closed flag when a new overlay is selected
      modalClosedManuallyRef.current = false;
      
      const selectedOverlay = overlayData.find(o => o.id === selectedOverlayId);
      if (selectedOverlay) {
        setActionModal({
          isOpen: true,
          overlay: selectedOverlay
        });
      }
    }
  }, [selectedOverlayId, overlayData]);
  
  // Scroll to selected overlay on PDF
  React.useEffect(() => {
    if (selectedOverlayId) {
      // Wait for next render to ensure overlay is on screen
      setTimeout(() => {
        const overlayElement = document.querySelector(`[data-elem-id="${selectedOverlayId}"]`);
        if (overlayElement) {
          overlayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedOverlayId]);
  
  // Handle action submission
  const handleActionSubmit = useCallback((instructionData) => {
    console.log('📤 Sending instruction:', instructionData);
    
    // Check WebSocket connection
    if (!isConnected) {
      toast.showError('Not connected to server. Please check connection.');
      return;
    }
    
    // Send instruction via WebSocket
    const message = {
      type: 'instruction',
      ...instructionData
    };
    
    try {
      const sent = send(message);
      if (sent) {
        console.log(`✅ Instruction sent for element: ${instructionData.elementId}`);
        
        // Mark modal as manually closed
        modalClosedManuallyRef.current = true;
        
        // Close action modal
        setActionModal({ isOpen: false, overlay: null });
        
        // Server will send processing_started message which shows progress modal
      } else {
        toast.showError('Failed to send instruction. WebSocket not ready.');
      }
    } catch (error) {
      console.error('❌ Failed to send instruction:', error);
      toast.showError('Failed to send instruction: ' + error.message);
    }
  }, [isConnected, send, toast]);
  
  return (
    <div className="pdf-overlay-app">
      <Toolbar />
      
      <div className="app-container">
        <Sidebar onGenerateDocument={isConnected ? handleGenerateDocument : null} />
        
        <main className="viewer-container">
          <ErrorBoundary>
            <PDFViewer />
          </ErrorBoundary>
        </main>
      </div>
      
      {/* Floating Overlay Selector Panel */}
      <OverlaySelector />
      
      {/* Progress Modal */}
      <ProgressModal
        isOpen={progress.isOpen}
        title={progress.title}
        progress={progress.progress}
        status={progress.status}
        stages={progress.stages}
        onCancel={handleCancelProgress}
      />
      
      {/* Action Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        overlay={actionModal.overlay}
        onClose={() => {
          modalClosedManuallyRef.current = true;
          setActionModal({ isOpen: false, overlay: null });
          // Keep overlay selected on PDF, but prevent modal from reopening
        }}
        onSubmit={handleActionSubmit}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

