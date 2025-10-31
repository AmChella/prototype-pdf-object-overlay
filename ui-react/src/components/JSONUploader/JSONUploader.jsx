import React, { useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../Toast/ToastContainer';
import { parseOverlayData } from '../../utils/jsonLoader';
import './JSONUploader.css';

const JSONUploader = () => {
  const { setOverlayData } = useAppContext();
  const toast = useToast();
  const fileInputRef = useRef(null);
  
  const handleFileSelect = async (file) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.showError('Please select a JSON file');
      return;
    }
    
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      // Use centralized parsing logic
      const overlayArray = parseOverlayData(jsonData);
      
      if (overlayArray.length === 0) {
        toast.showWarning('No valid overlays found in JSON file');
        return;
      }
      
      // Count valid overlays
      const validOverlays = overlayArray.filter(o => 
        typeof o.x === 'number' && typeof o.y === 'number' && 
        typeof o.width === 'number' && typeof o.height === 'number'
      );
      
      setOverlayData(overlayArray);
      
      if (validOverlays.length < overlayArray.length) {
        toast.showWarning(`Loaded ${validOverlays.length} valid overlays (${overlayArray.length - validOverlays.length} invalid)`);
      } else {
        toast.showSuccess(`Loaded ${overlayArray.length} overlays from ${file.name}`);
      }
      
      console.log('📊 Loaded overlay data:', overlayArray);
    } catch (error) {
      console.error('❌ Error loading JSON:', error);
      toast.showError('Failed to load JSON: ' + error.message);
    }
  };
  
  const handleFileInput = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  return (
    <div className="json-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
      
      <div
        className="json-upload-area"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="upload-icon">📋</div>
        <div className="upload-text">
          <strong>Upload Coordinate JSON</strong>
          <span>Click or drag JSON file here</span>
        </div>
      </div>
    </div>
  );
};

export default JSONUploader;

