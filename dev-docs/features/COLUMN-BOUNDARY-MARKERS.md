# Column Boundary Marker System

## Overview

This system provides automatic tracking of column boundaries in LaTeX documents with mixed single/double column layouts. It's particularly useful for documents where the first page has a single-column header (title, authors, abstract) followed by double-column content.

## Problem Statement

In documents with mixed column layouts:
- **First page**: Title, authors, abstract in single column or variable widths (30%, 70%, etc.)
- **Subsequent content**: Double-column layout starting from left to right

The challenge is tracking where content actually flows across columns, especially when:
- Right column calculations consider the entire page height
- Actual content starts mid-page after the header
- Coordinate splitting alone doesn't capture the flow pattern

## Solution

The `NeopageColumnMarker.sty` package marks coordinates at both the **top** and **bottom** of each column segment, enabling:

1. Precise tracking of where content starts and ends in each column
2. Understanding left-to-right flow across columns
3. Page-to-page flow analysis
4. Accurate coordinate ranges for layout algorithms

## Installation

### 1. Add the Package to Your LaTeX Project

Copy `NeopageColumnMarker.sty` to your LaTeX layouts directory:

```bash
cp layouts/elsevier/NeopageColumnMarker.sty <your-latex-dir>/
```

### 2. Include in Your Document

Add to your main `.tex` file or style file:

```latex
\usepackage{NeopageColumnMarker}
```

**Important**: Load this package AFTER:
- `zref-savepos`
- Any packages that define `\paraid`
- Column layout packages (`multicol`, `twocolumn`, etc.)

## Usage

### Automatic Tracking

The package automatically integrates with the existing `\paraid` system:

```latex
\paraid{para001}
This paragraph will automatically have its column boundaries marked.

\paraid{para002}
Another paragraph in the column.
```

When you switch columns or pages, the system automatically:
1. Marks the **bottom** of the previous column
2. Marks the **top** of the new column

### Manual Marking

For explicit control:

```latex
% Mark just the top of a column
\markColumnTop

% Mark just the bottom of a column
\markColumnBottom

% Mark both top and bottom around content
\markColumnSegment{
  This content will have markers at top and bottom.
}
```

### Visual Debugging

Enable visual markers in the margin (for development):

```latex
\showColumnMarkers  % Enable visual markers
... your content ...
\hideColumnMarkers  % Disable visual markers
```

Visual markers appear as tiny "L-T" (Left-Top), "L-B" (Left-Bottom), "R-T" (Right-Top), "R-B" (Right-Bottom) in the margins.

## Output Format

The package generates a file: `<jobname>-column-markers.ndjson`

Each line is a JSON object:

```json
{"id": "colmark-1-top", "type": "column-top", "column": "left", "page": 1, "x_pt": 72.5, "y_pt": 100.3, "x_sp": 4718592, "y_sp": 6531072}
{"id": "colmark-1-bottom", "type": "column-bottom", "column": "left", "page": 1, "x_pt": 72.5, "y_pt": 650.8, "x_sp": 4718592, "y_sp": 42373120}
{"id": "colmark-2-top", "type": "column-top", "column": "right", "page": 1, "x_pt": 320.4, "y_pt": 100.3, "x_sp": 20905984, "y_sp": 6531072}
```

**Fields**:
- `id`: Unique marker identifier
- `type`: Either `"column-top"` or `"column-bottom"`
- `column`: Either `"left"` or `"right"`
- `page`: Page number
- `x_pt`, `y_pt`: Coordinates in points (from top-left)
- `x_sp`, `y_sp`: Raw LaTeX coordinates in scaled points

## Analysis Tools

### JavaScript Analysis Script

Analyze the marker file to understand flow patterns:

```bash
node scripts/analyze-column-markers.js document-generated-column-markers.ndjson
```

**Output**:
```
=== Column Marker Analysis ===

Statistics:
  Total markers: 24
  Pages: 1, 2, 3
  Top markers: 12
  Bottom markers: 12
  Left column markers: 12
  Right column markers: 12

Column Segments:

  Page 1:
    Left column: 2 segments
      colmark-1: Complete (100.3 -> 650.8)
      colmark-3: Complete (660.0 -> 720.5)
    Right column: 2 segments
      colmark-2: Complete (100.3 -> 650.8)
      colmark-4: Complete (660.0 -> 720.5)

Flow Patterns:
  left-to-right: 8 transitions
  page-to-page: 3 transitions

Coordinate Ranges:
  Page 1 (left): X=[72.5, 72.5], Y=[100.3, 720.5] (2 segments)
  Page 1 (right): X=[320.4, 320.4], Y=[100.3, 720.5] (2 segments)
```

Save JSON report:

```bash
node scripts/analyze-column-markers.js document-generated-column-markers.ndjson --json
```

This creates `document-generated-column-markers-report.json` with detailed segment information.

## Integration with Existing Systems

### With PDF Geometry Extraction

```javascript
const ColumnMarkerAnalyzer = require('./scripts/analyze-column-markers');
const pdfGeometry = require('./your-pdf-geometry-module');

// Load column markers
const analyzer = new ColumnMarkerAnalyzer('document-column-markers.ndjson');
const report = analyzer.analyze();

// Use coordinate ranges for better splitting
const page1Left = report.coordinateRanges['page-1-left'];
const page1Right = report.coordinateRanges['page-1-right'];

// Now split coordinates more accurately
const leftCoords = coordinates.filter(c => 
  c.page === 1 && 
  c.x >= page1Left.x_min && c.x <= page1Left.x_max &&
  c.y >= page1Left.y_min && c.y <= page1Left.y_max
);
```

### With Column Detection

Instead of guessing where columns start/end, use actual markers:

```javascript
function getColumnBoundaries(page, column, markers) {
  const segments = markers.segments.filter(s => 
    s.page === page && s.column === column && s.complete
  );
  
  return {
    x: segments[0].top_x,
    y_start: Math.min(...segments.map(s => s.top_y)),
    y_end: Math.max(...segments.map(s => s.bottom_y)),
    height: Math.max(...segments.map(s => s.height))
  };
}
```

## Advanced Configuration

### Disable/Enable Tracking

```latex
\disableColumnMarkers  % Stop tracking
... content without markers ...
\enableColumnMarkers   % Resume tracking
```

### Custom Integration

Hook into the output routine for your specific layout:

```latex
% In your custom style file
\let\myoriginal@outputroutine\@outputdblcol
\def\@outputdblcol{%
  % Custom logic before output
  \markColumnBottom  % Mark end of column
  \myoriginal@outputroutine
  \markColumnTop     % Mark start of new column
  % Custom logic after output
}
```

## Example Use Cases

### 1. Mixed Layout First Page

```latex
\documentclass[twocolumn]{article}
\usepackage{NeopageColumnMarker}

\title{My Paper}
\author{Author Name}

\begin{document}

% This will be single column (via \maketitle)
\maketitle

\begin{abstract}
\paraid{abs001}
Abstract text here.
\end{abstract}

% Double-column content starts here
\paraid{para001}
First paragraph in left column.

\paraid{para002}
Second paragraph flows to right column.

\end{document}
```

The markers will show:
- Where the double-column region actually begins
- Exact boundaries of each column segment
- Flow from left to right column

### 2. Figure/Table Spanning Columns

```latex
\begin{figure*}
  \includegraphics{image}
  \caption{Wide figure}
\end{figure*}

\paraid{para003}
Text after the wide figure.
```

The markers will show where text resumes after the spanning element.

## Troubleshooting

### Issue: No markers generated

**Check**:
1. Package is loaded: `\usepackage{NeopageColumnMarker}`
2. Using `\paraid` commands in your document
3. Output file exists: `<jobname>-column-markers.ndjson`

### Issue: Markers in wrong locations

**Check**:
1. Package loaded AFTER `zref-savepos`
2. Not using incompatible output routines
3. Try manual `\markColumnTop` and `\markColumnBottom`

### Issue: Missing column transitions

**Solution**: Add explicit markers at column breaks:

```latex
\paraid{para001}
Text in left column.

\markColumnBottom  % Explicit end of left
% Column break happens here
\markColumnTop     % Explicit start of right

\paraid{para002}
Text in right column.
```

## Technical Details

### Coordinate System

- **X-axis**: Increases left to right
- **Y-axis**: Measured from top of page (0 = top, higher = lower on page)
- **Units**: Points (pt) and scaled points (sp, where 65536 sp = 1 pt)

### Marker ID Convention

Format: `colmark-<N>-<type>`
- `N`: Sequential counter
- `type`: Either `top` or `bottom`

### Performance

- Minimal overhead: ~2 `\zsavepos` calls per column segment
- NDJSON format allows streaming processing
- No impact on PDF output size

## Future Enhancements

Potential additions:
- Automatic column width detection
- Multi-column support (3+ columns)
- Integration with `multicol` package
- XML/JSON alternative output formats
- Real-time marker visualization in PDF

## Support

For issues or questions about the column marker system, check:
1. This documentation
2. Example files in `layouts/elsevier/examples/`
3. Analysis script: `scripts/analyze-column-markers.js`

## License

Same as the parent project.
