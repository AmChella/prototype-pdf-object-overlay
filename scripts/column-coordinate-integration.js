/**
 * Column-Aware Coordinate Splitting
 * 
 * Integration module for using column boundary markers with existing
 * coordinate extraction and splitting logic.
 * 
 * This module enhances coordinate splitting by using actual column
 * boundaries instead of page-based estimates.
 */

const fs = require('fs');
const ColumnMarkerAnalyzer = require('./analyze-column-markers');

class ColumnAwareCoordinateSplitter {
  constructor(columnMarkersFile) {
    this.markersFile = columnMarkersFile;
    this.analyzer = null;
    this.report = null;
    this.columnBoundaries = new Map();
  }

  /**
   * Load and analyze column markers
   */
  async initialize() {
    if (!fs.existsSync(this.markersFile)) {
      throw new Error(`Column markers file not found: ${this.markersFile}`);
    }

    this.analyzer = new ColumnMarkerAnalyzer(this.markersFile);
    this.report = this.analyzer.analyze();
    
    this._buildColumnBoundaries();
    
    return this.report;
  }

  /**
   * Build efficient lookup structure for column boundaries
   */
  _buildColumnBoundaries() {
    const ranges = this.report.coordinateRanges;
    
    Object.entries(ranges).forEach(([key, range]) => {
      const pageKey = `${range.page}-${range.column}`;
      this.columnBoundaries.set(pageKey, {
        page: range.page,
        column: range.column,
        x_min: range.x_min,
        x_max: range.x_max,
        y_min: range.y_min,
        y_max: range.y_max,
        x_center: (range.x_min + range.x_max) / 2,
        width: range.x_max - range.x_min,
        height: range.y_max - range.y_min
      });
    });
  }

  /**
   * Get column boundaries for a specific page and column
   */
  getColumnBoundary(page, column) {
    const key = `${page}-${column}`;
    return this.columnBoundaries.get(key);
  }

  /**
   * Determine which column a coordinate belongs to
   * 
   * @param {number} page - Page number
   * @param {number} x - X coordinate in points
   * @param {number} y - Y coordinate in points
   * @returns {string|null} 'left', 'right', or null if outside columns
   */
  determineColumn(page, x, y) {
    const leftBoundary = this.getColumnBoundary(page, 'left');
    const rightBoundary = this.getColumnBoundary(page, 'right');
    
    // Check if coordinate is in the actual content area (Y range)
    const inLeftY = leftBoundary && y >= leftBoundary.y_min && y <= leftBoundary.y_max;
    const inRightY = rightBoundary && y >= rightBoundary.y_min && y <= rightBoundary.y_max;
    
    if (!inLeftY && !inRightY) {
      return null; // Outside column content area (e.g., in header/footer)
    }
    
    // Use X coordinate to determine left vs right
    if (leftBoundary && Math.abs(x - leftBoundary.x_center) < leftBoundary.width) {
      return 'left';
    }
    
    if (rightBoundary && Math.abs(x - rightBoundary.x_center) < rightBoundary.width) {
      return 'right';
    }
    
    // Fallback: use X position relative to page midpoint
    if (leftBoundary && rightBoundary) {
      const midpoint = (leftBoundary.x_center + rightBoundary.x_center) / 2;
      return x < midpoint ? 'left' : 'right';
    }
    
    return null;
  }

  /**
   * Split coordinates by column using actual boundaries
   * 
   * @param {Array} coordinates - Array of {page, x, y, ...} objects
   * @returns {Object} {left: [], right: [], unknown: []}
   */
  splitCoordinatesByColumn(coordinates) {
    const result = {
      left: [],
      right: [],
      unknown: []
    };
    
    coordinates.forEach(coord => {
      const column = this.determineColumn(coord.page, coord.x, coord.y);
      
      if (column === 'left') {
        result.left.push({ ...coord, column: 'left' });
      } else if (column === 'right') {
        result.right.push({ ...coord, column: 'right' });
      } else {
        result.unknown.push({ ...coord, column: null });
      }
    });
    
    return result;
  }

  /**
   * Get flow sequence showing reading order
   * 
   * @param {Array} coordinates - Coordinates with column assignments
   * @returns {Array} Coordinates sorted by reading order
   */
  getReadingOrder(coordinates) {
    // Group by page
    const byPage = {};
    coordinates.forEach(coord => {
      if (!byPage[coord.page]) {
        byPage[coord.page] = { left: [], right: [] };
      }
      
      const column = coord.column || this.determineColumn(coord.page, coord.x, coord.y);
      if (column === 'left' || column === 'right') {
        byPage[coord.page][column].push(coord);
      }
    });
    
    // Sort within columns by Y position
    Object.values(byPage).forEach(page => {
      page.left.sort((a, b) => a.y - b.y);
      page.right.sort((a, b) => a.y - b.y);
    });
    
    // Interleave left and right columns in reading order
    const result = [];
    const pages = Object.keys(byPage).sort((a, b) => a - b);
    
    pages.forEach(pageNum => {
      const page = byPage[pageNum];
      const leftBoundary = this.getColumnBoundary(pageNum, 'left');
      const rightBoundary = this.getColumnBoundary(pageNum, 'right');
      
      // If we have actual column boundaries, use them to determine flow
      if (leftBoundary && rightBoundary) {
        // Check if columns start at same Y (typical two-column)
        const sameStart = Math.abs(leftBoundary.y_min - rightBoundary.y_min) < 5;
        
        if (sameStart) {
          // Standard two-column: left first, then right
          result.push(...page.left);
          result.push(...page.right);
        } else {
          // Unusual layout: interleave by Y position
          let li = 0, ri = 0;
          while (li < page.left.length || ri < page.right.length) {
            if (li >= page.left.length) {
              result.push(page.right[ri++]);
            } else if (ri >= page.right.length) {
              result.push(page.left[li++]);
            } else if (page.left[li].y < page.right[ri].y) {
              result.push(page.left[li++]);
            } else {
              result.push(page.right[ri++]);
            }
          }
        }
      } else {
        // No boundary info: assume standard left-right
        result.push(...page.left);
        result.push(...page.right);
      }
    });
    
    return result;
  }

  /**
   * Filter coordinates to only those within actual column content areas
   * 
   * Useful for removing header/footer/margin coordinates
   */
  filterToColumnContent(coordinates) {
    return coordinates.filter(coord => {
      const column = this.determineColumn(coord.page, coord.x, coord.y);
      return column !== null;
    });
  }

  /**
   * Get statistics about coordinate distribution
   */
  getCoordinateStats(coordinates) {
    const split = this.splitCoordinatesByColumn(coordinates);
    const stats = {
      total: coordinates.length,
      leftColumn: split.left.length,
      rightColumn: split.right.length,
      unknown: split.unknown.length,
      byPage: {}
    };
    
    coordinates.forEach(coord => {
      if (!stats.byPage[coord.page]) {
        stats.byPage[coord.page] = { left: 0, right: 0, unknown: 0 };
      }
      
      const column = coord.column || this.determineColumn(coord.page, coord.x, coord.y);
      if (column === 'left') {
        stats.byPage[coord.page].left++;
      } else if (column === 'right') {
        stats.byPage[coord.page].right++;
      } else {
        stats.byPage[coord.page].unknown++;
      }
    });
    
    return stats;
  }

  /**
   * Export enhanced coordinates with column information
   */
  exportEnhancedCoordinates(coordinates, outputFile) {
    const enhanced = coordinates.map(coord => ({
      ...coord,
      column: this.determineColumn(coord.page, coord.x, coord.y),
      columnBoundary: this.getColumnBoundary(
        coord.page,
        this.determineColumn(coord.page, coord.x, coord.y)
      )
    }));
    
    fs.writeFileSync(outputFile, JSON.stringify(enhanced, null, 2));
    console.log(`Enhanced coordinates written to ${outputFile}`);
    
    return enhanced;
  }
}

/**
 * Example usage with existing coordinate extraction
 */
async function exampleIntegration() {
  // 1. Load column markers
  const splitter = new ColumnAwareCoordinateSplitter(
    'document-generated-column-markers.ndjson'
  );
  
  await splitter.initialize();
  
  // 2. Load your existing coordinates (from PDF extraction, etc.)
  const coordinates = [
    { page: 1, x: 75.0, y: 120.5, text: 'First paragraph' },
    { page: 1, x: 75.0, y: 150.2, text: 'Second paragraph' },
    { page: 1, x: 325.0, y: 120.5, text: 'Third paragraph (right col)' },
    { page: 1, x: 325.0, y: 150.2, text: 'Fourth paragraph (right col)' },
    // ... more coordinates
  ];
  
  // 3. Split by column
  const split = splitter.splitCoordinatesByColumn(coordinates);
  console.log('Left column:', split.left.length);
  console.log('Right column:', split.right.length);
  console.log('Unknown:', split.unknown.length);
  
  // 4. Get reading order
  const readingOrder = splitter.getReadingOrder(coordinates);
  console.log('Reading order:', readingOrder.map(c => c.text));
  
  // 5. Get statistics
  const stats = splitter.getCoordinateStats(coordinates);
  console.log('Stats:', stats);
  
  // 6. Export enhanced coordinates
  splitter.exportEnhancedCoordinates(
    coordinates,
    'coordinates-with-columns.json'
  );
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node column-coordinate-integration.js <column-markers.ndjson> <coordinates.json>');
    console.error('');
    console.error('Enhances coordinate data with column boundary information.');
    process.exit(1);
  }
  
  const [markersFile, coordsFile] = args;
  
  (async () => {
    try {
      const splitter = new ColumnAwareCoordinateSplitter(markersFile);
      await splitter.initialize();
      
      const coordinates = JSON.parse(fs.readFileSync(coordsFile, 'utf8'));
      
      // Ensure coordinates are in array format
      const coordArray = Array.isArray(coordinates) ? coordinates : [coordinates];
      
      const stats = splitter.getCoordinateStats(coordArray);
      console.log('\n=== Coordinate Statistics ===');
      console.log(`Total coordinates: ${stats.total}`);
      console.log(`Left column: ${stats.leftColumn}`);
      console.log(`Right column: ${stats.rightColumn}`);
      console.log(`Unknown: ${stats.unknown}`);
      console.log('\nBy page:');
      Object.entries(stats.byPage).forEach(([page, counts]) => {
        console.log(`  Page ${page}: L=${counts.left}, R=${counts.right}, ?=${counts.unknown}`);
      });
      
      // Export enhanced version
      const outFile = coordsFile.replace('.json', '-enhanced.json');
      splitter.exportEnhancedCoordinates(coordArray, outFile);
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = ColumnAwareCoordinateSplitter;
