#!/usr/bin/env node

/**
 * Column Marker Analysis Tool
 * 
 * Analyzes column boundary markers from LaTeX output to understand
 * text flow patterns across columns, particularly for documents with
 * mixed single/double column layouts (e.g., title/abstract followed by columns).
 * 
 * Usage:
 *   node analyze-column-markers.js <column-markers-file.ndjson>
 * 
 * Output:
 *   - Column segments with their boundaries
 *   - Flow analysis (left-to-right, page-to-page)
 *   - Coordinate ranges for each column
 */

const fs = require('fs');
const path = require('path');

class ColumnMarkerAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.markers = [];
    this.segments = [];
    this.stats = {
      totalMarkers: 0,
      pages: new Set(),
      leftColumns: 0,
      rightColumns: 0,
      topMarkers: 0,
      bottomMarkers: 0
    };
  }

  /**
   * Load and parse NDJSON marker file
   */
  loadMarkers() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('%'));
    
    this.markers = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error(`Failed to parse line: ${line}`);
        return null;
      }
    }).filter(m => m !== null);

    // Update statistics
    this.stats.totalMarkers = this.markers.length;
    this.markers.forEach(m => {
      this.stats.pages.add(m.page);
      if (m.column === 'left') this.stats.leftColumns++;
      if (m.column === 'right') this.stats.rightColumns++;
      if (m.type === 'column-top') this.stats.topMarkers++;
      if (m.type === 'column-bottom') this.stats.bottomMarkers++;
    });

    console.log(`Loaded ${this.markers.length} markers`);
  }

  /**
   * Group markers into column segments
   * A segment is a continuous column area with a top and bottom marker
   */
  buildSegments() {
    // Sort markers by page, column, then type
    const sorted = [...this.markers].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (a.column !== b.column) {
        return a.column === 'left' ? -1 : 1;
      }
      // tops before bottoms
      if (a.type !== b.type) {
        return a.type === 'column-top' ? -1 : 1;
      }
      return 0;
    });

    // Pair up top and bottom markers
    let currentTop = null;
    
    sorted.forEach(marker => {
      if (marker.type === 'column-top') {
        if (currentTop) {
          // We have a top without a bottom - create incomplete segment
          this.segments.push({
            id: currentTop.id.replace('-top', ''),
            page: currentTop.page,
            column: currentTop.column,
            top: currentTop,
            bottom: null,
            complete: false
          });
        }
        currentTop = marker;
      } else if (marker.type === 'column-bottom') {
        if (currentTop && 
            currentTop.page === marker.page && 
            currentTop.column === marker.column) {
          // Complete segment
          this.segments.push({
            id: currentTop.id.replace('-top', ''),
            page: currentTop.page,
            column: currentTop.column,
            top: currentTop,
            bottom: marker,
            complete: true,
            height: Math.abs(currentTop.y_pt - marker.y_pt)
          });
          currentTop = null;
        } else {
          // Bottom without matching top
          this.segments.push({
            id: marker.id.replace('-bottom', ''),
            page: marker.page,
            column: marker.column,
            top: null,
            bottom: marker,
            complete: false
          });
        }
      }
    });

    // Handle final unpaired top
    if (currentTop) {
      this.segments.push({
        id: currentTop.id.replace('-top', ''),
        page: currentTop.page,
        column: currentTop.column,
        top: currentTop,
        bottom: null,
        complete: false
      });
    }

    console.log(`Built ${this.segments.length} column segments`);
  }

  /**
   * Analyze flow patterns
   */
  analyzeFlow() {
    const flowPatterns = [];
    
    for (let i = 0; i < this.segments.length - 1; i++) {
      const current = this.segments[i];
      const next = this.segments[i + 1];
      
      let flowType = 'unknown';
      
      if (current.page === next.page) {
        if (current.column === 'left' && next.column === 'right') {
          flowType = 'left-to-right';
        } else if (current.column === 'right' && next.column === 'left') {
          flowType = 'right-to-left (unusual)';
        } else {
          flowType = 'same-column';
        }
      } else {
        flowType = 'page-to-page';
      }
      
      flowPatterns.push({
        from: {
          page: current.page,
          column: current.column,
          segment: current.id
        },
        to: {
          page: next.page,
          column: next.column,
          segment: next.id
        },
        type: flowType
      });
    }
    
    return flowPatterns;
  }

  /**
   * Get coordinate ranges for each column on each page
   */
  getCoordinateRanges() {
    const ranges = {};
    
    this.segments.forEach(seg => {
      const key = `page-${seg.page}-${seg.column}`;
      
      if (!ranges[key]) {
        ranges[key] = {
          page: seg.page,
          column: seg.column,
          x_min: Infinity,
          x_max: -Infinity,
          y_min: Infinity,
          y_max: -Infinity,
          segments: 0
        };
      }
      
      const range = ranges[key];
      range.segments++;
      
      if (seg.top) {
        range.x_min = Math.min(range.x_min, seg.top.x_pt);
        range.x_max = Math.max(range.x_max, seg.top.x_pt);
        range.y_min = Math.min(range.y_min, seg.top.y_pt);
        range.y_max = Math.max(range.y_max, seg.top.y_pt);
      }
      
      if (seg.bottom) {
        range.x_min = Math.min(range.x_min, seg.bottom.x_pt);
        range.x_max = Math.max(range.x_max, seg.bottom.x_pt);
        range.y_min = Math.min(range.y_min, seg.bottom.y_pt);
        range.y_max = Math.max(range.y_max, seg.bottom.y_pt);
      }
    });
    
    return ranges;
  }

  /**
   * Generate a comprehensive report
   */
  generateReport() {
    const report = {
      summary: {
        totalMarkers: this.stats.totalMarkers,
        totalSegments: this.segments.length,
        pages: Array.from(this.stats.pages).sort((a, b) => a - b),
        leftColumnSegments: this.stats.leftColumns / 2, // tops + bottoms
        rightColumnSegments: this.stats.rightColumns / 2
      },
      segments: this.segments.map(seg => ({
        id: seg.id,
        page: seg.page,
        column: seg.column,
        complete: seg.complete,
        top_x: seg.top?.x_pt,
        top_y: seg.top?.y_pt,
        bottom_x: seg.bottom?.x_pt,
        bottom_y: seg.bottom?.y_pt,
        height: seg.height
      })),
      flow: this.analyzeFlow(),
      coordinateRanges: this.getCoordinateRanges()
    };
    
    return report;
  }

  /**
   * Print human-readable summary
   */
  printSummary() {
    console.log('\n=== Column Marker Analysis ===\n');
    
    console.log('Statistics:');
    console.log(`  Total markers: ${this.stats.totalMarkers}`);
    console.log(`  Pages: ${Array.from(this.stats.pages).sort((a, b) => a - b).join(', ')}`);
    console.log(`  Top markers: ${this.stats.topMarkers}`);
    console.log(`  Bottom markers: ${this.stats.bottomMarkers}`);
    console.log(`  Left column markers: ${this.stats.leftColumns}`);
    console.log(`  Right column markers: ${this.stats.rightColumns}`);
    
    console.log('\nColumn Segments:');
    const byPage = {};
    this.segments.forEach(seg => {
      if (!byPage[seg.page]) byPage[seg.page] = { left: [], right: [] };
      byPage[seg.page][seg.column].push(seg);
    });
    
    Object.keys(byPage).sort((a, b) => a - b).forEach(page => {
      console.log(`\n  Page ${page}:`);
      
      if (byPage[page].left.length > 0) {
        console.log(`    Left column: ${byPage[page].left.length} segments`);
        byPage[page].left.forEach(seg => {
          console.log(`      ${seg.id}: ${seg.complete ? 'Complete' : 'Incomplete'} ` +
                     `(${seg.top?.y_pt?.toFixed(1) || '?'} -> ${seg.bottom?.y_pt?.toFixed(1) || '?'})`);
        });
      }
      
      if (byPage[page].right.length > 0) {
        console.log(`    Right column: ${byPage[page].right.length} segments`);
        byPage[page].right.forEach(seg => {
          console.log(`      ${seg.id}: ${seg.complete ? 'Complete' : 'Incomplete'} ` +
                     `(${seg.top?.y_pt?.toFixed(1) || '?'} -> ${seg.bottom?.y_pt?.toFixed(1) || '?'})`);
        });
      }
    });
    
    console.log('\nFlow Patterns:');
    const flow = this.analyzeFlow();
    const flowCounts = {};
    flow.forEach(f => {
      flowCounts[f.type] = (flowCounts[f.type] || 0) + 1;
    });
    
    Object.entries(flowCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} transitions`);
    });
    
    console.log('\nCoordinate Ranges:');
    const ranges = this.getCoordinateRanges();
    Object.keys(ranges).sort().forEach(key => {
      const r = ranges[key];
      console.log(`  Page ${r.page} (${r.column}): X=[${r.x_min.toFixed(1)}, ${r.x_max.toFixed(1)}], ` +
                 `Y=[${r.y_min.toFixed(1)}, ${r.y_max.toFixed(1)}] (${r.segments} segments)`);
    });
  }

  /**
   * Main analysis workflow
   */
  analyze() {
    this.loadMarkers();
    this.buildSegments();
    this.printSummary();
    
    return this.generateReport();
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node analyze-column-markers.js <column-markers-file.ndjson>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const analyzer = new ColumnMarkerAnalyzer(filePath);
  const report = analyzer.analyze();
  
  // Optionally save JSON report
  if (args.includes('--json')) {
    const outPath = filePath.replace(/\.ndjson$/, '-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved to: ${outPath}`);
  }
}

module.exports = ColumnMarkerAnalyzer;
