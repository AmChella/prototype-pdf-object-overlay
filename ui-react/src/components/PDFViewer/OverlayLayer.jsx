import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './OverlayLayer.css';

const OverlayLayer = ({ overlayData, viewport, pageNum }) => {
  const { selectedOverlayId, setSelectedOverlayId, hoveredOverlayId, coordinateOrigin } = useAppContext();
  
  console.log(`📊 OverlayLayer rendering for page ${pageNum}:`, {
    overlayCount: overlayData?.length || 0,
    coordinateOrigin,
    viewportSize: viewport ? `${viewport.width}x${viewport.height}` : 'none'
  });
  
  if (!overlayData || overlayData.length === 0) {
    console.log('⚠️ No overlay data to render');
    return null;
  }
  
  // Helper function to convert coordinates using PDF.js viewport
  const convertCoordinates = (overlay) => {
    // Validate that overlay has required coordinate properties
    if (!overlay || 
        typeof overlay.x !== 'number' || 
        typeof overlay.y !== 'number' || 
        typeof overlay.width !== 'number' || 
        typeof overlay.height !== 'number') {
      console.warn(`  ❌ Skipping overlay ${overlay?.id || 'unknown'} - missing or invalid coordinates:`, {
        id: overlay?.id,
        x: overlay?.x,
        y: overlay?.y,
        width: overlay?.width,
        height: overlay?.height,
        allProps: Object.keys(overlay || {})
      });
      return null;
    }
    
    // Handle both top-left and bottom-left origin coordinate systems
    const useTopLeftOrigin = coordinateOrigin === 'top-left';
    
    // Get the PDF page dimensions in points
    const pageHeight = viewport.height / viewport.scale; // Convert back to points
    
    let x1, y1, x2, y2;
    
    if (useTopLeftOrigin) {
      // Convert from top-left origin to bottom-left origin (PDF standard)
      x1 = overlay.x;
      const y1_topLeft = overlay.y;
      y1 = pageHeight - y1_topLeft - overlay.height; // Convert to bottom-left origin
      x2 = overlay.x + overlay.width;
      y2 = pageHeight - y1_topLeft; // Bottom-left origin
      
      console.log(`  Converting ${overlay.id} (top-left → bottom-left): [${overlay.x}, ${y1_topLeft}] → [${x1}, ${y1}]`);
    } else {
      // Coordinates are already in bottom-left origin (PDF standard)
      x1 = overlay.x;
      y1 = overlay.y;
      x2 = overlay.x + overlay.width;
      y2 = overlay.y + overlay.height;
      
      console.log(`  Converting ${overlay.id} (bottom-left): PDF rect [${x1}, ${y1}, ${x2}, ${y2}]`);
    }
    
    // Skip items with invalid dimensions
    if (x2 <= x1 || y2 <= y1) {
      console.warn(`  ❌ Skipping overlay ${overlay.id} with invalid dimensions`);
      return null;
    }
    
    // Convert from PDF coordinate system to viewport coordinates
    const vb = viewport.convertToViewportRectangle([x1, y1, x2, y2]);
    
    // Calculate position and dimensions
    const left = Math.min(vb[0], vb[2]);
    const top = Math.min(vb[1], vb[3]);
    const width = Math.abs(vb[2] - vb[0]);
    const height = Math.abs(vb[3] - vb[1]);
    
    console.log(`  ✅ Viewport coords: left=${left.toFixed(1)}, top=${top.toFixed(1)}, ${width.toFixed(1)}x${height.toFixed(1)}`);
    
    // Skip items that are too small to be visible
    if (width < 1 || height < 1) {
      console.warn(`  ❌ Skipping overlay ${overlay.id} with too small dimensions: ${width}x${height}`);
      return null;
    }
    
    return { left, top, width, height };
  };
  
  // Get color based on overlay type
  const getOverlayColor = (type) => {
    const colors = {
      'text': 'rgba(59, 130, 246, 0.3)',      // Blue
      'image': 'rgba(16, 185, 129, 0.3)',     // Green
      'table': 'rgba(245, 158, 11, 0.3)',     // Orange
      'header': 'rgba(139, 92, 246, 0.3)',    // Purple
      'footer': 'rgba(236, 72, 153, 0.3)',    // Pink
      'default': 'rgba(239, 68, 68, 0.3)'     // Red
    };
    return colors[type] || colors['default'];
  };

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

  // Get icon for overlay type
  const getTypeIcon = (type) => {
    const icons = {
      'figure': '🖼',
      'table': '📊',
      'paragraph': '📝',
      'unknown': '📄'
    };
    return icons[type] || icons['unknown'];
  };

  // Get label for overlay type
  const getTypeLabel = (type) => {
    const labels = {
      'figure': 'Figure',
      'table': 'Table',
      'paragraph': 'Para',
      'unknown': 'Elem'
    };
    return labels[type] || labels['unknown'];
  };
  
  return (
    <div 
      className="overlay-layer"
      style={{
        width: viewport.width + 'px',
        height: viewport.height + 'px'
      }}
    >
      {overlayData.map((overlay, index) => {
        const coords = convertCoordinates(overlay);
        
        // Skip if coordinates couldn't be converted
        if (!coords) return null;
        
        const isSelected = overlay.id === selectedOverlayId;
        const isHovered = overlay.id === hoveredOverlayId;
        const overlayType = detectOverlayType(overlay.id);
        
        return (
          <div
            key={overlay.id || index}
            data-elem-id={overlay.id}
            className={`overlay-box overlay-type-${overlayType} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
            style={{
              left: Math.round(coords.left) + 'px',
              top: Math.round(coords.top) + 'px',
              width: Math.round(coords.width) + 'px',
              height: Math.round(coords.height) + 'px',
              backgroundColor: getOverlayColor(overlay.type),
              borderColor: isSelected ? '#6366f1' : isHovered ? '#ffc107' : 'rgba(255, 255, 255, 0.5)'
            }}
            onClick={() => setSelectedOverlayId(overlay.id)}
            title={`${getTypeLabel(overlayType)}: ${overlay.id}${overlay.text ? ` - ${overlay.text}` : ''}`}
          >
            <div className="overlay-label">
              <span className="overlay-label-icon">{getTypeIcon(overlayType)}</span>
              <span className="overlay-label-type">{getTypeLabel(overlayType)}</span>
              <span className="overlay-label-id">{overlay.id}</span>
              {overlay.page && (
                <span className="overlay-label-page">P{overlay.page}</span>
              )}
            </div>
            {overlay.text && (
              <div className="overlay-label-text">
                {overlay.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OverlayLayer;

