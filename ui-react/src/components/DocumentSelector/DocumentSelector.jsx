import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import './DocumentSelector.css';

const DocumentSelector = ({ onGenerate }) => {
  const { isConnected } = useAppContext();
  const [availableDocuments, setAvailableDocuments] = useState([
    { id: 'document', name: 'Default Document', description: 'Standard document template' },
    { id: 'ENDEND10921', name: 'ENDEND10921', description: 'Custom document template' },
  ]);
  const [selectedDoc, setSelectedDoc] = useState('document');
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = async () => {
    if (!isConnected || generating) return;
    
    setGenerating(true);
    
    try {
      await onGenerate(selectedDoc);
      // Wait a bit to show the button animation
      setTimeout(() => setGenerating(false), 1000);
    } catch (err) {
      console.error('Error generating document:', err);
      setGenerating(false);
    }
  };
  
  return (
    <div className="document-selector">
      <div className="selector-group">
        <label htmlFor="document-select" className="selector-label">
          Select Document Template:
        </label>
        <select
          id="document-select"
          className="document-select"
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          disabled={!isConnected || generating}
        >
          {availableDocuments.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="document-description">
        {availableDocuments.find(d => d.id === selectedDoc)?.description}
      </div>
      
      <button
        className={`generate-btn ${generating ? 'generating' : ''}`}
        onClick={handleGenerate}
        disabled={!isConnected || generating}
      >
        {generating ? (
          <>
            <span className="spinner-small"></span>
            Generating...
          </>
        ) : (
          <>
            <span>📄</span>
            Generate Document
          </>
        )}
      </button>
    </div>
  );
};

export default DocumentSelector;

