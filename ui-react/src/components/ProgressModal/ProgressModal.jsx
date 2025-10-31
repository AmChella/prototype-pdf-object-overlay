import React from 'react';
import './ProgressModal.css';

const ProgressModal = ({ isOpen, title, progress, status, stages, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="progress-modal-overlay">
      <div className="progress-modal">
        <div className="progress-modal-header">
          <h3>{title || 'Processing...'}</h3>
          {onCancel && (
            <button className="close-btn" onClick={onCancel} title="Cancel">
              ✕
            </button>
          )}
        </div>
        
        <div className="progress-modal-body">
          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }}
            >
              <span className="progress-text">{Math.round(progress || 0)}%</span>
            </div>
          </div>
          
          {/* Status Message */}
          {status && (
            <div className="progress-status">
              {status}
            </div>
          )}
          
          {/* Stages */}
          {stages && stages.length > 0 && (
            <div className="progress-stages">
              {stages.map((stage, index) => (
                <div 
                  key={index} 
                  className={`progress-stage ${stage.status || 'pending'}`}
                >
                  <span className="stage-icon">
                    {stage.status === 'completed' && '✓'}
                    {stage.status === 'active' && '⟳'}
                    {stage.status === 'error' && '✗'}
                    {!stage.status || stage.status === 'pending' ? '○' : ''}
                  </span>
                  <span className="stage-label">{stage.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;

