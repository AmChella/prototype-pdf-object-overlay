# Solving the Right Column Split Issue

## Your Specific Problem

### Scenario
```
┌─────────────────────────────────────┐
│         TITLE (full width)          │  ← Single column
│      Authors (full width)           │  ← Single column
│                                     │
│    ABSTRACT (70% width)             │  ← Partial width
│                                     │
├──────────────────┬─────────────────┤
│                  │                  │
│  Para 1 (left)   │  Para 3 (right) │  ← Double column starts HERE
│                  │                  │
│  Para 2 (left)   │  Para 4 (right) │
│                  │                  │
└──────────────────┴─────────────────┘
```

### The Issue
When you calculate the right column split, the algorithm sees:
- **Page height**: 792pt (full page)
- **Assumes right column starts**: y=0 (top of page)
- **Actually starts**: y=150pt (below title/abstract)

Result: **Right column split calculates wrong boundaries**

### Why Coordinate Splitting Fails
```javascript
// Wrong approach
const midX = pageWidth / 2;
const leftCol = coords.filter(c => c.x < midX);
const rightCol = coords.filter(c => c.x >= midX);
// ❌ This includes title/abstract in left column
// ❌ Doesn't know where double-column actually starts
```

## The Solution: Mark Boundaries in LaTeX

### What the System Does

#### 1. LaTeX Marks Actual Positions

When LaTeX processes your document:

```latex
% Title/Abstract area - NO column markers

\twocolumn[
  \maketitle
  \begin{abstract}...\end{abstract}
]

% HERE is where double-column actually starts!
% System automatically marks this point:

\paraid{para001}        % ← Marks: LEFT column TOP at (x=72, y=150)
First paragraph...

\paraid{para002}
Second paragraph...
                        % ← Marks: LEFT column BOTTOM at (x=72, y=650)

% Now flows to right column

\paraid{para003}        % ← Marks: RIGHT column TOP at (x=320, y=150)
Third paragraph...

\paraid{para004}
Fourth paragraph...
                        % ← Marks: RIGHT column BOTTOM at (x=320, y=650)
```

#### 2. Output: Precise Boundaries

The system generates `document-column-markers.ndjson`:

```json
{"id": "colmark-1-top", "type": "column-top", "column": "left", "page": 1, "x_pt": 72, "y_pt": 150}
{"id": "colmark-1-bottom", "type": "column-bottom", "column": "left", "page": 1, "x_pt": 72, "y_pt": 650}
{"id": "colmark-2-top", "type": "column-top", "column": "right", "page": 1, "x_pt": 320, "y_pt": 150}
{"id": "colmark-2-bottom", "type": "column-bottom", "column": "right", "page": 1, "x_pt": 320, "y_pt": 650}
```

**Key insight**: Both columns start at y=150, not y=0!

#### 3. Use Real Boundaries for Splitting

```javascript
const splitter = new ColumnAwareCoordinateSplitter('document-column-markers.ndjson');
await splitter.initialize();

// Get actual boundaries
const leftBounds = splitter.getColumnBoundary(1, 'left');
// Returns: { x_min: 72, x_max: 72, y_min: 150, y_max: 650 }

const rightBounds = splitter.getColumnBoundary(1, 'right');
// Returns: { x_min: 320, x_max: 320, y_min: 150, y_max: 650 }

// Now split coordinates using ACTUAL boundaries
const split = splitter.splitCoordinatesByColumn(allCoordinates);

// split.left: Only coords in (x≈72, y=150-650)
// split.right: Only coords in (x≈320, y=150-650)
// split.unknown: Title/abstract/headers/footers (y<150 or y>650)
```

## Before vs After

### BEFORE (Without Column Markers)

```javascript
// Guessing approach
function splitColumns(coords, page) {
  const midX = 306;  // Guessed page center
  
  return {
    left: coords.filter(c => c.page === page && c.x < midX),
    right: coords.filter(c => c.page === page && c.x >= midX)
  };
}

// Problems:
// ❌ Title goes to "left column" (x < 306)
// ❌ Abstract goes to "left column" (x < 306)  
// ❌ Right column includes everything with x >= 306
// ❌ Can't tell where double-column actually starts
```

### AFTER (With Column Markers)

```javascript
// Precise approach
const splitter = new ColumnAwareCoordinateSplitter('doc-column-markers.ndjson');
await splitter.initialize();

const split = splitter.splitCoordinatesByColumn(coords);

// Advantages:
// ✅ Title/abstract excluded (outside column areas)
// ✅ Left column: Only y=150-650 range
// ✅ Right column: Only y=150-650 range
// ✅ Knows exactly where double-column starts
```

## Concrete Example

### Input Coordinates
```javascript
const coords = [
  {page: 1, x: 200, y: 50,  text: "Title"},           // Header area
  {page: 1, x: 150, y: 100, text: "Abstract"},        // Header area
  {page: 1, x: 72,  y: 200, text: "Para 1"},          // Left column
  {page: 1, x: 72,  y: 300, text: "Para 2"},          // Left column
  {page: 1, x: 320, y: 200, text: "Para 3"},          // Right column
  {page: 1, x: 320, y: 300, text: "Para 4"},          // Right column
];
```

### Without Markers (Wrong)
```javascript
// Split by X only
const leftWrong = coords.filter(c => c.x < 200);
// Result: ["Title", "Abstract", "Para 1", "Para 2"] ❌

const rightWrong = coords.filter(c => c.x >= 200);
// Result: ["Para 3", "Para 4"] ✓ (but only by luck)
```

### With Markers (Correct)
```javascript
const split = splitter.splitCoordinatesByColumn(coords);

// split.left:
// [
//   {page: 1, x: 72, y: 200, text: "Para 1", column: "left"},
//   {page: 1, x: 72, y: 300, text: "Para 2", column: "left"}
// ] ✅

// split.right:
// [
//   {page: 1, x: 320, y: 200, text: "Para 3", column: "right"},
//   {page: 1, x: 320, y: 300, text: "Para 4", column: "right"}
// ] ✅

// split.unknown:
// [
//   {page: 1, x: 200, y: 50, text: "Title", column: null},
//   {page: 1, x: 150, y: 100, text: "Abstract", column: null}
// ] ✅ (correctly excluded from columns)
```

## Reading Order

The system also gives you correct reading order:

```javascript
const ordered = splitter.getReadingOrder(coords);

// Returns in reading order:
// [
//   "Para 1" (left),
//   "Para 2" (left),
//   "Para 3" (right),
//   "Para 4" (right)
// ]
// (Note: Title and Abstract excluded as they're outside column areas)
```

## Why This Works

### The Key Insight

**You can't fix this by splitting coordinates alone** because:
- Coordinates don't tell you where columns *should* be
- Page geometry doesn't know about variable-height headers
- X-position alone is ambiguous (title vs left column)

**But LaTeX knows exactly**:
- When it switches from single to double column
- Where each column starts (top coordinate)
- Where each column ends (bottom coordinate)
- Whether you're in left or right column (`\if@firstcolumn`)

**So mark it at the source!**

## Implementation in Your Document

### Minimal Change Needed

Add one line to your LaTeX:

```latex
\usepackage{NeopageColumnMarker}  % ← Add this
```

That's it! The system:
- Automatically integrates with `\paraid`
- Marks column boundaries as content flows
- Generates `.ndjson` file with coordinates
- No changes to your existing `\paraid` calls needed

### Use the Markers

In your JavaScript/processing code:

```javascript
const ColumnAwareCoordinateSplitter = 
  require('./scripts/column-coordinate-integration');

// Load markers
const splitter = new ColumnAwareCoordinateSplitter(
  'document-column-markers.ndjson'
);
await splitter.initialize();

// Use everywhere you split coordinates
const split = splitter.splitCoordinatesByColumn(coordinates);
const ordered = splitter.getReadingOrder(coordinates);
```

## Summary

| Aspect | Without Markers | With Markers |
|--------|----------------|--------------|
| **Column detection** | Guess from X position | Exact from LaTeX |
| **Y-range** | Assume full page | Actual content area |
| **Title/Abstract** | Mixed with columns ❌ | Correctly excluded ✅ |
| **Right column start** | Calculated wrong ❌ | Marked precisely ✅ |
| **Flow tracking** | Impossible | Automatic ✅ |
| **Reading order** | Guessed | Precise ✅ |

**Bottom line**: LaTeX knows where columns are. Mark it there, use it everywhere else.

---

**Files to use**:
- LaTeX: `layouts/elsevier/NeopageColumnMarker.sty`
- JavaScript: `scripts/column-coordinate-integration.js`
- Docs: `dev-docs/features/COLUMN-BOUNDARY-MARKERS.md`
