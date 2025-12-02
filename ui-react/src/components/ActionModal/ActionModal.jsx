import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../Toast/ToastContainer';
import './ActionModal.css';

const ActionModal = ({ isOpen, overlay, onClose, onSubmit }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const { 
    dropdownOptions: serverDropdownOptions, 
    addInstruction,
    enableInstructionStack 
  } = useAppContext();
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
  
  // Normalize type from LaTeX (para) to UI format (paragraph)
  const normalizeType = (type) => {
    const typeMap = {
      'para': 'paragraph',
      'figure': 'figure',
      'table': 'table'
    };
    return typeMap[type] || type;
  };
  
  // Detect overlay type from ID (fallback only)
  const detectOverlayType = (id) => {
    if (!id) return 'unknown';
    
    // Strip segment suffix first (e.g., "para-123_seg1of2" -> "para-123")
    const baseId = id.replace(/_seg\d+of\d+$/i, '');
    
    // Use startsWith for more accurate detection (matching vanilla JS logic)
    if (baseId.startsWith('fig-') || baseId.startsWith('fig') || baseId.includes('figure')) return 'figure';
    if (baseId.startsWith('tbl-') || baseId.startsWith('tbl') || baseId.includes('table')) return 'table';
    if (baseId.includes('-p') || baseId.startsWith('sec') || baseId.includes('para') || baseId.startsWith('p0') || baseId.startsWith('abspara')) return 'paragraph';
    return 'unknown';
  };
  
  // Use type field from overlay if available, otherwise detect from ID; normalize both
  const overlayType = normalizeType(overlay?.type || detectOverlayType(overlay?.id));
  
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
    
    // Get the action label for display
    const actionOption = actionOptions.find(opt => opt.value === selectedAction);
    const actionLabel = actionOption ? actionOption.label : selectedAction;
    
      const baseElementId = getBaseElementId(overlay.id);
      
    const instruction = {
      elementId: baseElementId,
        overlayType: overlayType,
        instruction: selectedAction,
      instructionValue: undefined, // Can be extended in the future for actions that need values
      instructionLabel: actionLabel,
        timestamp: new Date().toISOString()
    };
    
    // Check if instruction stack feature is enabled
    if (enableInstructionStack) {
      // Add to stack - will be sent when "Update Document" is clicked
      const added = addInstruction(instruction);
      
      if (added) {
        toast.showSuccess(`✅ Instruction added to queue`, {
          duration: 2000
        });
        console.log(`📝 Added instruction to stack for element: ${baseElementId} (original: ${overlay.id})`);
      }
    } else {
      // Feature disabled - send immediately (legacy behavior)
      if (onSubmit) {
        onSubmit(instruction);
        toast.showInfo(`📤 Sending instruction...`);
        console.log(`📤 Sending instruction immediately for element: ${baseElementId} (original: ${overlay.id})`);
      }
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
              <label>Label</label>
              <span className="info-value">{overlay.label || overlay.id}</span>
            </div>
            {overlay.label && (
              <div className="info-field">
                <label>Element ID</label>
                <span className="info-value info-value-small">{overlay.id}</span>
              </div>
            )}
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
            title={!selectedAction ? 'Please select an action first' : (enableInstructionStack ? 'Add instruction to queue' : 'Send instruction to server')}
          >
            {selectedAction ? (enableInstructionStack ? 'Add to Queue' : 'Send Instruction') : 'Select Action First'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;

