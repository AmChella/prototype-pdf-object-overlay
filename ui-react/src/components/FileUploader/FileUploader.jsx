import React, { useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { usePDF } from '../../hooks/usePDF';
import './FileUploader.css';

const FileUploader = () => {
  const { loadPDF: contextLoadPDF } = useAppContext();
  const { loadPDF } = usePDF();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleFileSelect = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📂 Loading PDF:', file.name);
      const pdfDoc = await loadPDF(file);
      contextLoadPDF(pdfDoc);
      console.log('✅ PDF loaded successfully:', pdfDoc.numPages, 'pages');
    } catch (err) {
      console.error('❌ Error loading PDF:', err);
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="file-uploader">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        {loading ? (
          <>
            <div className="upload-spinner"></div>
            <p>Loading PDF...</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📄</div>
            <p className="upload-text">
              Drop PDF file here or <span className="upload-link">browse</span>
            </p>
            <p className="upload-hint">Supports PDF files only</p>
          </>
        )}
      </div>
      
      {error && (
        <div className="upload-error">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;

