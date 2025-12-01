# Column Boundary Marker System - Complete Guide

## 📋 Quick Summary

**Problem**: In documents with mixed single/double column layouts, coordinate-based column splitting fails because:
- Title/abstract area uses variable widths (30%, 70%, etc.)
- Right column calculations assume full page height
- Actual double-column content starts mid-page
- Cannot determine actual column boundaries from coordinates alone

**Solution**: Mark column boundaries **at the LaTeX level** using position tracking macros, then use these precise markers for all downstream coordinate processing.

## 🎯 What You Get

1. **Precise column boundaries** - Know exactly where left/right columns start and end
2. **Automatic tracking** - Integrates with existing `\paraid` system
3. **Flow analysis** - Understand left-to-right, page-to-page flow
4. **Integration tools** - JavaScript API for coordinate splitting
5. **Visual debugging** - Optional margin markers for development

## 📦 Components Created

### LaTeX Package
**File**: `layouts/elsevier/NeopageColumnMarker.sty`

Automatically marks column boundaries with x,y coordinates:
```latex
\usepackage{NeopageColumnMarker}
```

### Analysis Tool
**File**: `scripts/analyze-column-markers.js`

Analyzes marker files and generates reports:
```bash
node scripts/analyze-column-markers.js document-column-markers.ndjson
```

### Integration Module
**File**: `scripts/column-coordinate-integration.js`

Splits coordinates using actual boundaries:
```javascript
const splitter = new ColumnAwareCoordinateSplitter('markers.ndjson');
await splitter.initialize();
const split = splitter.splitCoordinatesByColumn(coordinates);
```

### Documentation
- **Full Guide**: `dev-docs/features/COLUMN-BOUNDARY-MARKERS.md`
- **Quick Reference**: `COLUMN-MARKERS-QUICKREF.md`
- **Problem Solution**: `SOLVING-RIGHT-COLUMN-SPLIT.md`
- **Implementation**: `COLUMN-MARKER-IMPLEMENTATION.md`

### Examples
- **LaTeX Example**: `layouts/elsevier/examples/example-column-markers.tex`
- **Integration Example**: `scripts/example-integration.js`
- **Test Script**: `scripts/test-column-markers.sh`

## 🚀 Getting Started

### Step 1: Add Package to LaTeX

Add one line to your LaTeX document or style file:

```latex
\usepackage{NeopageColumnMarker}
```

**That's it!** The system auto-integrates with existing `\paraid` commands.

### Step 2: Compile Your Document

```bash
pdflatex your-document.tex
```

This generates:
- `your-document.pdf` (normal PDF output)
- `your-document-column-markers.ndjson` (marker file)

### Step 3: Use Markers in Your Code

```javascript
const ColumnAwareCoordinateSplitter = 
  require('./scripts/column-coordinate-integration');

const splitter = new ColumnAwareCoordinateSplitter(
  'your-document-column-markers.ndjson'
);
await splitter.initialize();

// Now use it for all coordinate operations
const split = splitter.splitCoordinatesByColumn(coordinates);
```

## 🔧 How It Works

### The Problem in Detail

```
Page 1 Layout:
┌────────────────────────────────────┐ ← y=0 (top)
│         TITLE (centered)           │
│      Author Names                  │ 
│                                    │
│   ABSTRACT (70% width)             │
│                                    │ ← y=150 (where columns ACTUALLY start)
├─────────────────┬──────────────────┤
│                 │                  │
│  Left Column    │  Right Column    │
│  Content        │  Content         │
│                 │                  │
└─────────────────┴──────────────────┘ ← y=650 (where columns end)
```

**Without markers**: System assumes columns run from y=0 to y=792 (full page)  
**With markers**: System knows columns run from y=150 to y=650 (actual content)

### The Solution Flow

```
1. LaTeX Processing
   ↓
   Detects column switches (\if@firstcolumn)
   ↓
   Marks top/bottom positions (\zsavepos)
   ↓
   Writes to .ndjson file

2. JavaScript Processing
   ↓
   Loads marker file
   ↓
   Builds column boundary map
   ↓
   Provides column detection API

3. Your Code
   ↓
   Uses precise boundaries
   ↓
   Accurate column splitting
   ↓
   Correct reading order
```

## 📊 Output Format

### Marker File (NDJSON)

Each line is a JSON object:

```json
{"id": "colmark-1-top", "type": "column-top", "column": "left", "page": 1, "x_pt": 72.5, "y_pt": 150.0, "x_sp": 4718592, "y_sp": 9830400}
{"id": "colmark-1-bottom", "type": "column-bottom", "column": "left", "page": 1, "x_pt": 72.5, "y_pt": 650.0, "x_sp": 4718592, "y_sp": 42598400}
```

**Fields**:
- `id`: Unique marker identifier
- `type`: `"column-top"` or `"column-bottom"`
- `column`: `"left"` or `"right"`
- `page`: Page number
- `x_pt`, `y_pt`: Coordinates in points (from top-left)
- `x_sp`, `y_sp`: Raw LaTeX scaled points

## 🎯 Use Cases

### 1. Accurate Coordinate Splitting

**Before** (wrong):
```javascript
const left = coords.filter(c => c.x < 300);  // Includes title!
const right = coords.filter(c => c.x >= 300); // Wrong start!
```

**After** (correct):
```javascript
const split = splitter.splitCoordinatesByColumn(coords);
// split.left: Only actual left column content
// split.right: Only actual right column content
// split.unknown: Title, abstract, headers, footers
```

### 2. Figure Placement

**Before** (estimated):
```javascript
const rightColStart = 300; // Guess
const rightColHeight = 792; // Full page
```

**After** (precise):
```javascript
const rightBounds = splitter.getColumnBoundary(page, 'right');
const rightColStart = rightBounds.x_min;     // Actual: 320
const rightColHeight = rightBounds.y_max - rightBounds.y_min; // Actual: 500
```

### 3. Reading Order

```javascript
const ordered = splitter.getReadingOrder(textItems);
// Returns items in actual reading order:
// 1. Left column (top to bottom)
// 2. Right column (top to bottom)
// 3. Next page left column
// etc.
```

### 4. Content Area Detection

```javascript
// Filter to only column content (exclude headers/footers)
const contentOnly = splitter.filterToColumnContent(coordinates);
```

## 📈 Integration Patterns

### Pattern 1: Drop-In Replacement

Replace existing column splitting:

```javascript
// OLD CODE
function splitColumns(coords) {
  const midX = 306;
  return {
    left: coords.filter(c => c.x < midX),
    right: coords.filter(c => c.x >= midX)
  };
}

// NEW CODE
const splitter = await createColumnSplitter('doc-column-markers.ndjson');
function splitColumns(coords) {
  return splitter.split(coords);
}
```

### Pattern 2: Enhanced Extraction

Augment existing PDF extraction:

```javascript
const geometry = await extractPDFGeometry(pdf);
const split = splitter.splitCoordinatesByColumn(geometry.textItems);

return {
  ...geometry,
  byColumn: split,
  readingOrder: splitter.getReadingOrder(geometry.textItems)
};
```

### Pattern 3: Layout Calculations

Use real boundaries for layout:

```javascript
function calculateLayout(page) {
  const leftBounds = splitter.getColumnBoundary(page, 'left');
  const rightBounds = splitter.getColumnBoundary(page, 'right');
  
  return {
    left: {
      x: leftBounds.x_min,
      y: leftBounds.y_min,
      width: leftBounds.x_max - leftBounds.x_min,
      height: leftBounds.y_max - leftBounds.y_min
    },
    right: {
      x: rightBounds.x_min,
      y: rightBounds.y_min,
      width: rightBounds.x_max - rightBounds.x_min,
      height: rightBounds.y_max - rightBounds.y_min
    }
  };
}
```

## 🐛 Debugging

### Enable Visual Markers

In LaTeX:
```latex
\showColumnMarkers  % Adds tiny markers in margins
```

### Analyze Markers

```bash
node scripts/analyze-column-markers.js document-column-markers.ndjson
```

Shows:
- Total markers
- Markers per page/column
- Flow patterns
- Coordinate ranges

### Check Integration

```bash
node scripts/column-coordinate-integration.js \
  document-column-markers.ndjson \
  your-coordinates.json
```

Shows statistics and creates enhanced coordinate file.

## ⚙️ Advanced Usage

### Manual Markers

For precise control:

```latex
\markColumnTop          % Mark top of current position
\markColumnBottom       % Mark bottom of current position
\markColumnSegment{...} % Mark entire block
```

### Conditional Tracking

Turn tracking on/off:

```latex
\disableColumnMarkers
% Content not tracked
\enableColumnMarkers
```

### Custom Output Routine

Integrate with custom layouts:

```latex
\let\myoriginal@output\@outputdblcol
\def\@outputdblcol{%
  \markColumnBottom  % Mark end of column
  \myoriginal@output
  \markColumnTop     % Mark start of new column
}
```

## 📊 Performance

- **LaTeX overhead**: ~2 `\zsavepos` calls per column segment (negligible)
- **File size**: ~100 bytes per marker (minimal)
- **JavaScript processing**: O(n) where n = number of markers (fast)
- **Memory usage**: Marker data typically < 1MB (small)

## ✅ Testing

Run the test suite:

```bash
./scripts/test-column-markers.sh
```

This:
1. Compiles example document
2. Verifies marker generation
3. Runs analysis
4. Tests integration
5. Reports results

## 🎓 Examples

### Example 1: Basic Two-Column

```latex
\documentclass[twocolumn]{article}
\usepackage{NeopageColumnMarker}
\begin{document}
\paraid{p1} Text in left column.
\paraid{p2} Text in right column.
\end{document}
```

### Example 2: Mixed Layout

```latex
\documentclass[twocolumn]{article}
\usepackage{NeopageColumnMarker}
\begin{document}

\twocolumn[
  \maketitle
  \begin{abstract}...\end{abstract}
]

\paraid{p1} First paragraph (left).
\paraid{p2} Second paragraph (right).
\end{document}
```

### Example 3: Explicit Control

```latex
\paraid{p1} Before break.

\markColumnBottom
\clearpage
\markColumnTop

\paraid{p2} After break.
```

## 📚 API Reference

### LaTeX Commands

| Command | Purpose |
|---------|---------|
| `\markColumnTop` | Mark top of column |
| `\markColumnBottom` | Mark bottom of column |
| `\markColumnSegment{...}` | Mark content block |
| `\showColumnMarkers` | Enable visual markers |
| `\hideColumnMarkers` | Disable visual markers |
| `\enableColumnMarkers` | Enable tracking |
| `\disableColumnMarkers` | Disable tracking |

### JavaScript API

```javascript
class ColumnAwareCoordinateSplitter {
  async initialize()
  splitCoordinatesByColumn(coords)
  determineColumn(page, x, y)
  getColumnBoundary(page, column)
  getReadingOrder(coords)
  filterToColumnContent(coords)
  getCoordinateStats(coords)
}
```

## 🔗 File Reference

| File | Purpose |
|------|---------|
| `NeopageColumnMarker.sty` | LaTeX package |
| `analyze-column-markers.js` | Analysis tool |
| `column-coordinate-integration.js` | Integration module |
| `example-integration.js` | Integration examples |
| `test-column-markers.sh` | Test script |
| `example-column-markers.tex` | Example document |
| `COLUMN-BOUNDARY-MARKERS.md` | Full documentation |
| `COLUMN-MARKERS-QUICKREF.md` | Quick reference |
| `SOLVING-RIGHT-COLUMN-SPLIT.md` | Problem explanation |

## 🎯 Next Steps

1. **Try the example**:
   ```bash
   ./scripts/test-column-markers.sh
   ```

2. **Add to your document**:
   ```latex
   \usepackage{NeopageColumnMarker}
   ```

3. **Integrate with your code**:
   ```javascript
   const splitter = new ColumnAwareCoordinateSplitter('markers.ndjson');
   ```

4. **Replace coordinate splitting**:
   Use `splitter.splitCoordinatesByColumn()` instead of X-based splitting

5. **Enjoy accurate results**! 🎉

## 💡 Key Takeaway

**You can't fix the right column split issue by processing coordinates alone.**

The information about where columns actually start and end exists **only at the LaTeX level** during typesetting.

**Mark it there, use it everywhere else.**

---

**Version**: 1.0  
**Date**: 2025-11-27  
**Status**: Complete and ready for production use  
**License**: Same as parent project
