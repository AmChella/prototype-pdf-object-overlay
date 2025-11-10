import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../Toast/ToastContainer';
import './InstructionStack.css';

const InstructionStack = () => {
  const { 
    instructionStack, 
    removeInstruction, 
    clearInstructionStack, 
    sendBatchInstructions,
    enableInstructionStack
  } = useAppContext();
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRemove = (instructionId) => {
    const remainingCount = instructionStack.length - 1;
    removeInstruction(instructionId);
    toast.showInfo(`Instruction removed (${remainingCount} remaining)`);
    
    // Auto-collapse if no instructions left
    if (remainingCount === 0) {
      setIsExpanded(false);
    }
  };

  const handleClearAll = () => {
    if (instructionStack.length > 0) {
      if (window.confirm(`Clear all ${instructionStack.length} instructions?`)) {
        clearInstructionStack();
        toast.showInfo('All instructions cleared');
        setIsExpanded(false); // Auto-collapse after clearing
      }
    }
  };

  const handleUpdate = async () => {
    if (instructionStack.length === 0) {
      toast.showWarning('No instructions to send');
      return;
    }

    const success = await sendBatchInstructions();
    if (success) {
      toast.showInfo(`Processing ${instructionStack.length} instructions...`);
      setIsExpanded(false); // Collapse after sending
    } else {
      toast.showError('Failed to send instructions. Please check connection.');
    }
  };

  const toggleExpanded = () => {
    // Only allow expanding if there are instructions
    if (instructionStack.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  // Don't render if feature is disabled
  if (!enableInstructionStack) {
    return null;
  }

  const hasInstructions = instructionStack.length > 0;

  return (
    <div className={`instruction-stack ${isExpanded ? 'expanded' : 'collapsed'} ${!hasInstructions ? 'empty' : ''}`}>
        <button 
          className="instruction-stack-toggle" 
          onClick={toggleExpanded}
          title={hasInstructions ? (isExpanded ? 'Collapse' : 'Expand') : 'No instructions'}
          disabled={!hasInstructions}
        >
          <span className="instruction-stack-label">📝</span>
          <span className="instruction-stack-count">{instructionStack.length || 0}</span>
          {hasInstructions && <span className="instruction-stack-arrow">{isExpanded ? '▼' : '▶'}</span>}
        </button>

      {isExpanded && (
        <div className="instruction-stack-dropdown">
          <div className="instruction-stack-header">
            <span className="instruction-stack-title">{instructionStack.length} Instructions</span>
            <button 
              className="instruction-stack-clear" 
              onClick={handleClearAll}
              title="Clear All"
            >
              🗑️
            </button>
          </div>

          <div className="instruction-stack-list">
            {instructionStack.map((instruction, index) => (
              <div key={instruction.id} className="instruction-stack-item">
                <div className="instruction-stack-item-content">
                  <span className="instruction-stack-item-number">#{index + 1}</span>
                  <div className="instruction-stack-item-info">
                    <div className="instruction-stack-item-element">{instruction.elementId}</div>
                    <div className="instruction-stack-item-action">{instruction.instructionLabel || instruction.instruction}</div>
                  </div>
                  <button
                    className="instruction-stack-item-remove"
                    onClick={() => handleRemove(instruction.id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="instruction-stack-footer">
            <button 
              className="btn-primary instruction-stack-update" 
              onClick={handleUpdate}
            >
              🚀 Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructionStack;

