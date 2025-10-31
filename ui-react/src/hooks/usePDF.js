import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker (configured in index.html)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const usePDF = () => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentObjectUrl = useRef(null);
  
  const loadPDF = useCallback(async (source) => {
    setLoading(true);
    setError(null);
    
    try {
      // Clean up previous object URL
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
        currentObjectUrl.current = null;
      }
      
      let pdfSource = source;
      
      // Handle File object
      if (source instanceof File) {
        const objectUrl = URL.createObjectURL(source);
        currentObjectUrl.current = objectUrl;
        pdfSource = objectUrl;
      }
      
      // Load PDF
      const loadingTask = pdfjsLib.getDocument({ url: pdfSource });
      const pdf = await loadingTask.promise;
      
      setPdfDocument(pdf);
      setLoading(false);
      
      return pdf;
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);
  
  const renderPage = useCallback(async (pageNumber, viewport, canvas) => {
    if (!pdfDocument) return null;
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const context = canvas.getContext('2d');
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      return page;
    } catch (err) {
      console.error('Error rendering page:', err);
      throw err;
    }
  }, [pdfDocument]);
  
  const getTextContent = useCallback(async (pageNumber) => {
    if (!pdfDocument) return null;
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      return textContent;
    } catch (err) {
      console.error('Error getting text content:', err);
      throw err;
    }
  }, [pdfDocument]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
      }
    };
  }, []);
  
  return {
    pdfDocument,
    loading,
    error,
    loadPDF,
    renderPage,
    getTextContent,
  };
};

