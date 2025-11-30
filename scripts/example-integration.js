/**
 * Example Integration: Column Markers with PDF Geometry Extraction
 * 
 * This example shows how to integrate the column marker system
 * with existing PDF coordinate extraction workflow.
 */

const fs = require('fs');
const path = require('path');
const ColumnAwareCoordinateSplitter = require('./column-coordinate-integration');

/**
 * Enhanced PDF geometry extraction with column awareness
 */
class ColumnAwarePDFGeometry {
  constructor(pdfGeometryModule, columnMarkersFile) {
    this.pdfGeometry = pdfGeometryModule;
    this.columnMarkersFile = columnMarkersFile;
    this.columnSplitter = null;
  }

  /**
   * Initialize column marker system
   */
  async initialize() {
    if (fs.existsSync(this.columnMarkersFile)) {
      this.columnSplitter = new ColumnAwareCoordinateSplitter(this.columnMarkersFile);
      await this.columnSplitter.initialize();
      console.log('✓ Column markers loaded');
    } else {
      console.warn('⚠ Column markers file not found - using fallback splitting');
    }
  }

  /**
   * Extract geometry with column information
   */
  async extractWithColumns(pdfPath) {
    // Use your existing PDF extraction
    const geometry = await this.pdfGeometry.extractGeometry(pdfPath);
    
    if (!this.columnSplitter) {
      console.warn('⚠ No column markers available');
      return geometry;
    }

    // Enhance geometry with column information
    const enhanced = {
      ...geometry,
      columnBoundaries: this.columnSplitter.report.coordinateRanges,
      textItems: geometry.textItems.map(item => ({
        ...item,
        column: this.columnSplitter.determineColumn(
          item.page,
          item.x || item.left,
          item.y || item.top
        )
      }))
    };

    // Split text items by column
    const split = this.columnSplitter.splitCoordinatesByColumn(
      geometry.textItems.map(item => ({
        page: item.page,
        x: item.x || item.left,
        y: item.y || item.top,
        ...item
      }))
    );

    enhanced.byColumn = {
      left: split.left,
      right: split.right,
      other: split.unknown
    };

    // Get reading order
    enhanced.readingOrder = this.columnSplitter.getReadingOrder(
      geometry.textItems.map(item => ({
        page: item.page,
        x: item.x || item.left,
        y: item.y || item.top,
        ...item
      }))
    );

    return enhanced;
  }

  /**
   * Split coordinates by column with fallback
   */
  splitByColumn(coordinates) {
    if (this.columnSplitter) {
      return this.columnSplitter.splitCoordinatesByColumn(coordinates);
    }
    
    // Fallback: simple X-based splitting
    console.warn('⚠ Using fallback column splitting (less accurate)');
    const midX = 306; // Approximate page center
    
    return {
      left: coordinates.filter(c => c.x < midX),
      right: coordinates.filter(c => c.x >= midX),
      unknown: []
    };
  }

  /**
   * Get column boundary for layout calculations
   */
  getColumnBoundary(page, column) {
    if (this.columnSplitter) {
      return this.columnSplitter.getColumnBoundary(page, column);
    }
    
    // Fallback: estimated boundaries
    const leftMargin = 72;
    const rightMargin = 72;
    const pageWidth = 612;
    const pageHeight = 792;
    const columnGap = 18;
    
    const columnWidth = (pageWidth - leftMargin - rightMargin - columnGap) / 2;
    
    if (column === 'left') {
      return {
        x_min: leftMargin,
        x_max: leftMargin + columnWidth,
        y_min: 100, // Estimated
        y_max: 700  // Estimated
      };
    } else {
      return {
        x_min: leftMargin + columnWidth + columnGap,
        x_max: pageWidth - rightMargin,
        y_min: 100, // Estimated
        y_max: 700  // Estimated
      };
    }
  }

  /**
   * Calculate column-aware layout metrics
   */
  calculateColumnMetrics(page) {
    const leftBounds = this.getColumnBoundary(page, 'left');
    const rightBounds = this.getColumnBoundary(page, 'right');
    
    return {
      page,
      left: {
        x: leftBounds.x_min,
        width: leftBounds.x_max - leftBounds.x_min,
        y_start: leftBounds.y_min,
        height: leftBounds.y_max - leftBounds.y_min,
        actual: !!this.columnSplitter // True if using real markers
      },
      right: {
        x: rightBounds.x_min,
        width: rightBounds.x_max - rightBounds.x_min,
        y_start: rightBounds.y_min,
        height: rightBounds.y_max - rightBounds.y_min,
        actual: !!this.columnSplitter
      }
    };
  }
}

/**
 * Example usage with your existing code
 */
async function exampleUsage() {
  // Your existing PDF geometry module
  const pdfGeometry = require('./pdf-geometry');
  
  // Create enhanced geometry extractor
  const enhancedGeometry = new ColumnAwarePDFGeometry(
    pdfGeometry,
    'TeX/document-generated-column-markers.ndjson'
  );
  
  // Initialize
  await enhancedGeometry.initialize();
  
  // Extract with column information
  const geometry = await enhancedGeometry.extractWithColumns(
    'TeX/document-generated.pdf'
  );
  
  console.log('\n=== Extraction Results ===\n');
  console.log(`Total text items: ${geometry.textItems.length}`);
  console.log(`Left column items: ${geometry.byColumn.left.length}`);
  console.log(`Right column items: ${geometry.byColumn.right.length}`);
  console.log(`Other items: ${geometry.byColumn.other.length}`);
  
  // Get column metrics for page 1
  const page1Metrics = enhancedGeometry.calculateColumnMetrics(1);
  console.log('\nPage 1 Column Metrics:');
  console.log('Left column:', {
    x: page1Metrics.left.x,
    y_start: page1Metrics.left.y_start,
    height: page1Metrics.left.height,
    source: page1Metrics.left.actual ? 'markers' : 'estimated'
  });
  console.log('Right column:', {
    x: page1Metrics.right.x,
    y_start: page1Metrics.right.y_start,
    height: page1Metrics.right.height,
    source: page1Metrics.right.actual ? 'markers' : 'estimated'
  });
  
  // Use reading order for processing
  console.log('\nReading order (first 5 items):');
  geometry.readingOrder.slice(0, 5).forEach((item, i) => {
    console.log(`${i + 1}. [${item.column}] ${item.str || item.text}`);
  });
  
  return geometry;
}

/**
 * Integration with figure placement
 */
function enhanceFigurePlacement(figurePlacementModule, columnMarkers) {
  const originalPlacement = figurePlacementModule.calculatePlacement;
  
  figurePlacementModule.calculatePlacement = async function(figure, page) {
    // Get actual column boundaries instead of guessing
    const leftBounds = columnMarkers.getColumnBoundary(page, 'left');
    const rightBounds = columnMarkers.getColumnBoundary(page, 'right');
    
    // Calculate placement using actual boundaries
    const placement = await originalPlacement.call(this, figure, page);
    
    // Adjust placement based on actual column content area
    if (placement.column === 'left') {
      placement.y_min = leftBounds.y_min;
      placement.y_max = leftBounds.y_max;
      placement.x = leftBounds.x_min;
      placement.width = leftBounds.x_max - leftBounds.x_min;
    } else if (placement.column === 'right') {
      placement.y_min = rightBounds.y_min;
      placement.y_max = rightBounds.y_max;
      placement.x = rightBounds.x_min;
      placement.width = rightBounds.x_max - rightBounds.x_min;
    }
    
    return placement;
  };
}

/**
 * Drop-in replacement for existing column splitting
 */
function createColumnSplitter(columnMarkersFile) {
  let splitter = null;
  
  return {
    async init() {
      if (fs.existsSync(columnMarkersFile)) {
        splitter = new ColumnAwareCoordinateSplitter(columnMarkersFile);
        await splitter.initialize();
      }
    },
    
    split(coordinates) {
      if (splitter) {
        // Use real column boundaries
        return splitter.splitCoordinatesByColumn(coordinates);
      } else {
        // Fallback to old method
        const midX = 306;
        return {
          left: coordinates.filter(c => c.x < midX),
          right: coordinates.filter(c => c.x >= midX),
          unknown: []
        };
      }
    },
    
    getColumn(page, x, y) {
      if (splitter) {
        return splitter.determineColumn(page, x, y);
      } else {
        return x < 306 ? 'left' : 'right';
      }
    }
  };
}

// Export for use in other modules
module.exports = {
  ColumnAwarePDFGeometry,
  enhanceFigurePlacement,
  createColumnSplitter,
  exampleUsage
};

// CLI
if (require.main === module) {
  exampleUsage().catch(console.error);
}
