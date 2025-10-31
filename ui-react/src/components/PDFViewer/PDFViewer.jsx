import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { usePDF } from '../../hooks/usePDF';
import TextLayer from './TextLayer';
import OverlayLayer from './OverlayLayer';
import './PDFViewer.css';

const PDFViewer = () => {
  const {
    currentPdf,
    currentPage,
    scale,
    overlayData,
    overlaysVisible,
    searchMatches,
    currentMatchIndex,
  } = useAppContext();
  
  const { renderPage, getTextContent } = usePDF();
  const canvasRef = useRef(null);
  const pageWrapperRef = useRef(null);
  const renderingRef = useRef(false);
  const [viewport, setViewport] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [rendering, setRendering] = useState(false);
  
  // Render current page
  useEffect(() => {
    if (!currentPdf || !canvasRef.current || renderingRef.current) return;
    
    const renderCurrentPage = async () => {
      renderingRef.current = true;
      setRendering(true);
      
      try {
        const page = await currentPdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        setViewport(viewport);
        
        // Set canvas size
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        
        // Set page wrapper size
        if (pageWrapperRef.current) {
          pageWrapperRef.current.style.width = viewport.width + 'px';
          pageWrapperRef.current.style.height = viewport.height + 'px';
        }
        
        // Render PDF page
        const context = canvas.getContext('2d');
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Get text content for search
        const textContent = await page.getTextContent();
        setTextContent(textContent);
        
        console.log(`✅ Rendered page ${currentPage} at scale ${scale}`);
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setRendering(false);
        renderingRef.current = false;
      }
    };
    
    renderCurrentPage();
  }, [currentPdf, currentPage, scale]);
  
  // Scroll to current search match
  useEffect(() => {
    if (currentMatchIndex >= 0 && searchMatches.length > 0) {
      const currentMatch = searchMatches[currentMatchIndex];
      if (currentMatch && currentMatch.pageNum === currentPage) {
        // Scroll to match will be handled by TextLayer
        console.log('Highlighting match:', currentMatchIndex);
      }
    }
  }, [currentMatchIndex, searchMatches, currentPage]);
  
  if (!currentPdf) {
    return (
      <div className="pdf-viewer">
        <div className="no-pdf-message">
          <div className="no-pdf-icon">📄</div>
          <h2>No PDF Loaded</h2>
          <p>Upload a PDF file to get started</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pdf-viewer" id="viewerContainer">
      <div className="page-wrapper" ref={pageWrapperRef}>
        {/* PDF Canvas */}
        <canvas ref={canvasRef} className="pdf-canvas" />
        
        {/* Text Layer for Search */}
        {textContent && viewport && (
          <TextLayer
            textContent={textContent}
            viewport={viewport}
            pageNum={currentPage}
            searchMatches={Array.isArray(searchMatches) ? searchMatches.filter(m => m && m.pageNum === currentPage) : []}
            currentMatchIndex={currentMatchIndex}
          />
        )}
        
        {/* Overlay Layer for Coordinates */}
        {overlaysVisible && viewport && (
          <OverlayLayer
            overlayData={Array.isArray(overlayData) ? overlayData.filter(o => o && o.page === currentPage) : []}
            viewport={viewport}
            pageNum={currentPage}
          />
        )}
        
        {/* Loading Indicator */}
        {rendering && (
          <div className="rendering-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;

