# Column Boundary Markers - Quick Reference

## Quick Start

### 1. Add to LaTeX Document

```latex
\usepackage{NeopageColumnMarker}
```

### 2. Compile Your Document

```bash
pdflatex your-document.tex
```

### 3. Analyze Column Markers

```bash
node scripts/analyze-column-markers.js your-document-column-markers.ndjson
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `\markColumnTop` | Mark top of current column |
| `\markColumnBottom` | Mark bottom of current column |
| `\markColumnSegment{...}` | Mark content with top+bottom |
| `\showColumnMarkers` | Enable visual markers |
| `\hideColumnMarkers` | Disable visual markers |
| `\enableColumnMarkers` | Turn on tracking |
| `\disableColumnMarkers` | Turn off tracking |

## Output Files

| File | Content |
|------|---------|
| `<name>-column-markers.ndjson` | Column boundary coordinates |
| `<name>-column-markers-report.json` | Analysis report (with `--json` flag) |

## Integration Examples

### With Existing Coordinates

```javascript
const ColumnAwareCoordinateSplitter = require('./scripts/column-coordinate-integration');

const splitter = new ColumnAwareCoordinateSplitter('doc-column-markers.ndjson');
await splitter.initialize();

// Split your coordinates
const split = splitter.splitCoordinatesByColumn(coordinates);
console.log('Left:', split.left);
console.log('Right:', split.right);
```

### Determine Column from Coordinate

```javascript
const column = splitter.determineColumn(page, x, y);
// Returns: 'left', 'right', or null
```

### Get Reading Order

```javascript
const ordered = splitter.getReadingOrder(coordinates);
// Returns coordinates in left-to-right, top-to-bottom order
```

## LaTeX Patterns

### Standard Two-Column

```latex
\paraid{para001}
First paragraph (automatic markers).

\paraid{para002}
Second paragraph.
```

### Explicit Column Break

```latex
\paraid{para001}
Before break.

\markColumnBottom
\clearpage
\markColumnTop

\paraid{para002}
After break.
```

### Manual Segment

```latex
\markColumnSegment{
  \paraid{para001}
  This entire section is marked.
  
  Multiple paragraphs work too.
}
```

## Coordinate Format

```json
{
  "id": "colmark-1-top",
  "type": "column-top",
  "column": "left",
  "page": 1,
  "x_pt": 72.5,
  "y_pt": 120.3,
  "x_sp": 4718592,
  "y_sp": 7864320
}
```

- `x_pt`, `y_pt`: Points from top-left
- `x_sp`, `y_sp`: Scaled points (65536 sp = 1 pt)
- `type`: `column-top` or `column-bottom`
- `column`: `left` or `right`

## Common Issues

### No markers generated

✓ Check `\usepackage{NeopageColumnMarker}` is present  
✓ Verify using `\paraid{...}` commands  
✓ Check for output file: `*.ndjson`

### Wrong column detection

✓ Load package AFTER `zref-savepos`  
✓ Try explicit `\markColumnTop` / `\markColumnBottom`  
✓ Check X coordinates are in expected ranges

### Markers at wrong positions

✓ Use `\showColumnMarkers` for visual debugging  
✓ Check for conflicting output routine patches  
✓ Verify page layout settings

## Tips & Tricks

1. **Visual debugging**: Use `\showColumnMarkers` during development
2. **Selective tracking**: Use `\disable/\enableColumnMarkers` to control scope
3. **Integration**: Use `column-coordinate-integration.js` for existing pipelines
4. **Analysis**: Generate JSON report with `--json` flag for programmatic access
5. **Mixed layouts**: Markers automatically handle single/double column transitions

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| `NeopageColumnMarker.sty` | `layouts/elsevier/` | Main LaTeX package |
| `analyze-column-markers.js` | `scripts/` | Analysis tool |
| `column-coordinate-integration.js` | `scripts/` | Integration helper |
| `COLUMN-BOUNDARY-MARKERS.md` | `dev-docs/features/` | Full documentation |
| `example-column-markers.tex` | `layouts/elsevier/examples/` | Example document |

## See Also

- [Full Documentation](../dev-docs/features/COLUMN-BOUNDARY-MARKERS.md)
- [Example Document](../layouts/elsevier/examples/example-column-markers.tex)
- [Analysis Script](../scripts/analyze-column-markers.js)
- [Integration Script](../scripts/column-coordinate-integration.js)
