import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../Toast/ToastContainer';
import './ActionModal.css';

const ActionModal = ({ isOpen, overlay, onClose, onSubmit }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const { dropdownOptions: serverDropdownOptions } = useAppContext();
  const toast = useToast();
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Reset selected action when modal opens/closes or overlay changes
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('');
    }
  }, [isOpen, overlay?.id]);
  
  // Detect overlay type from ID
  const detectOverlayType = (id) => {
    if (!id) return 'unknown';
    
    // Strip segment suffix first (e.g., "para-123_seg1of2" -> "para-123")
    const baseId = id.replace(/_seg\d+of\d+$/i, '');
    
    // Use startsWith for more accurate detection (matching vanilla JS logic)
    if (baseId.startsWith('fig-') || baseId.includes('figure')) return 'figure';
    if (baseId.startsWith('tbl-') || baseId.includes('table')) return 'table';
    if (baseId.includes('-p') || baseId.startsWith('sec') || baseId.includes('para')) return 'paragraph';
    return 'unknown';
  };
  
  const overlayType = detectOverlayType(overlay?.id);
  
  // Get available actions based on overlay type
  const actionOptions = useMemo(() => {
    // If server has provided dropdown options, use them
    if (serverDropdownOptions && serverDropdownOptions[overlayType]) {
      console.log(`📋 Using server dropdown options for ${overlayType}:`, serverDropdownOptions[overlayType]);
      return serverDropdownOptions[overlayType];
    }
    
    // Fallback to default options if server config not yet received
    console.log(`📋 Using default dropdown options for ${overlayType} (server config not loaded)`);
    const defaultOptions = {
      figure: [
        { value: 'resize', label: 'Resize Figure' },
        { value: 'reposition', label: 'Reposition Figure' },
        { value: 'caption_edit', label: 'Edit Caption' },
        { value: 'remove', label: 'Remove Figure' }
      ],
      table: [
        { value: 'resize', label: 'Resize Table' },
        { value: 'reposition', label: 'Reposition Table' },
        { value: 'edit_data', label: 'Edit Table Data' },
        { value: 'add_row', label: 'Add Row' },
        { value: 'add_column', label: 'Add Column' },
        { value: 'remove', label: 'Remove Table' }
      ],
      paragraph: [
        { value: 'edit_text', label: 'Edit Text' },
        { value: 'reformat', label: 'Reformat Paragraph' },
        { value: 'change_style', label: 'Change Style' },
        { value: 'remove', label: 'Remove Paragraph' }
      ],
      unknown: [
        { value: 'identify', label: 'Identify Element' },
        { value: 'annotate', label: 'Add Annotation' }
      ]
    };
    
    return defaultOptions[overlayType] || defaultOptions.unknown;
  }, [overlayType, serverDropdownOptions]);
  
  // Strip segment suffix from element ID (e.g., "para-123_seg1of2" -> "para-123")
  // This is necessary because XML files only contain base IDs, not segmented IDs
  const getBaseElementId = (id) => {
    if (!id) return id;
    
    // Remove segment patterns like _seg1of2, _seg2of3, etc.
    const baseId = id.replace(/_seg\d+of\d+$/i, '');
    
    if (baseId !== id) {
      console.log(`📝 Stripped segment suffix: "${id}" -> "${baseId}"`);
    }
    
    return baseId;
  };
  
  const handleSubmit = () => {
    if (!selectedAction) {
      toast.showWarning('Please select an action');
      return;
    }
    
    if (onSubmit) {
      const baseElementId = getBaseElementId(overlay.id);
      
      onSubmit({
        elementId: baseElementId, // Use base ID without segment suffix
        overlayType: overlayType,
        instruction: selectedAction,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📤 Sending instruction for element: ${baseElementId} (original: ${overlay.id})`);
    }
    
    onClose();
  };
  
  // Don't render if modal is not open or no overlay
  if (!isOpen || !overlay) {
    return null;
  }
  
  return (
    <div className="action-modal-backdrop" onClick={onClose}>
      <div className="action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="action-modal-header">
          <h3>Instruction Panel</h3>
          <button className="close-btn" onClick={onClose} title="Close (ESC)">✕</button>
        </div>
        
        <div className="action-modal-body">
          {/* Overlay Information */}
          <div className="overlay-info">
            <div className="info-field">
              <label>Element ID</label>
              <span className="info-value">{overlay.id}</span>
            </div>
            <div className="info-field">
              <label>Type</label>
              <span className={`type-badge type-${overlayType}`}>
                {overlayType}
              </span>
            </div>
            <div className="info-field">
              <label>Location</label>
              <span className="info-value">Page {overlay.page}</span>
            </div>
            {overlay.text && (
              <div className="info-field" style={{ gridColumn: '1 / -1' }}>
                <label>Content</label>
                <span className="info-value">{overlay.text}</span>
              </div>
            )}
          </div>
          
          {/* Action Selection */}
          <div className="action-selection">
            <h4>Select Action</h4>
            <select
              className="action-dropdown"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              autoFocus
            >
              <option value="">Choose an action to perform...</option>
              {actionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {selectedAction && (
              <div className="action-description">
                <span className="description-label">Selected</span>
                <span className="description-text">
                  {actionOptions.find(opt => opt.value === selectedAction)?.label}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="action-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSubmit}
            disabled={!selectedAction}
            title={!selectedAction ? 'Please select an action first' : 'Send instruction to server'}
          >
            {selectedAction ? 'Send Instruction' : 'Select Action First'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;

