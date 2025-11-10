# Coordinate-Based Approach for PDF Overlays

## Problem with Column-Based Approach

The previous approach used column detection (`col:0`, `col:1`) which had fundamental limitations:

### Limitations:
1. **Only works for 2-column layouts** - Breaks with 3+ columns
2. **Assumes symmetric columns** - Fails with asymmetric layouts (30/70, 20/80 splits)
3. **Uses heuristics** - Guesses column from X position (error-prone)
4. **Breaks for floats** - Tries to split tables/figures across "columns"

## New Pure Coordinate Approach

### Philosophy:
**Use actual coordinates (xsp, ysp) directly - no column assumptions**

### How It Works:

1. **TeX generates markers** with actual X, Y positions in scaled points (sp)
2. **Calculate bounding boxes** using pure coordinate math:
   - `x = min(x1, x2)` - leftmost position
   - `y = min(y1, y2)` - bottom position (after PDF coordinate conversion)
   - `width = abs(x2 - x1)` - actual width from coordinates
   - `height = abs(y2 - y1)` - actual height from coordinates

3. **No column detection needed** - coordinates tell the full story

### Benefits:

✅ **Works with any column layout:**
   - 2-column symmetric
   - 3+ column layouts
   - Asymmetric columns (30/70, 20/80)
   - Complex grid layouts

✅ **Robust for floats:**
   - Tables and figures are atomic units
   - Width/height calculated from actual rendered positions
   - No artificial splitting

✅ **Simpler logic:**
   - Pure math: `min()`, `max()`, `abs()`
   - No heuristics or guesswork
   - Easy to debug and maintain

## Implementation

### Files Updated:

1. **`scripts/external/sync_from_aux.js`**
   - `calculateBoundingBox()` - Uses pure coordinate math, no column assumptions
   - `generateNdjson()` - Calculates column using actual settings (cwsp + colsep/2), not hardcoded 300pt
   - `detectSpanning()` - Uses proper column boundary calculation
   - Float splitting logic - Floats never split by column, only by page
   - **Column field is for reference only**, not used in bounding box calculations

2. **`src/tex-to-pdf.js`**
   - `calculateBoundingBox()` - Same pure coordinate approach
   - Consistent with sync_from_aux.js

3. **`scripts/external/split_multi_column_page.js`**
   - `detectSpanning()` - Updated to use actual column settings instead of hardcoded heuristics
   - Floats treated as atomic units

### Column Info in NDJSON:

The NDJSON contains essential measurements:
- **`cwsp`** (column width in scaled points)
- **`twsp`** (text width in scaled points) 
- **`colsep`** (column separation in scaled points)
- **`col`** (calculated column index - for reference only)

**Key Improvements:**

1. **`twocolumn` flag removed** - multi-column layout is auto-detected:
   ```javascript
   isMultiColumn = textWidth > (columnWidth * 1.5)
   ```

2. **`col` calculated intelligently** - different logic for floats vs text:
   - **Floats (tables/figures)**: Always `col = 0` (atomic units, not split across columns)
     - Enforced in `TeX-lib/geom-marks.tex` (during TeX compilation)
     - Also enforced in JavaScript post-processing (`sync_from_aux.js`, `split_multi_column_page.js`)
   - **Paragraphs**: Calculated from X position: `col = xPosition > (columnWidth + columnSep/2) ? 1 : 0`
   - This ensures TABLE-start and TABLE-end have the same column value

3. **Table marker placement** - critical for capturing full dimensions:
   - **TABLE-start**: Placed before `\caption` at left edge to capture top-left corner
   - **TABLE-end**: Placed after `\end{tabularx}` at right edge to capture bottom-right corner
   - Uses `\makebox[tablewidth][r]{...}` to position end marker at the right edge
   - Uses `\par\nointerlineskip` to ensure proper vertical position without extra spacing
   - This ensures both full width and full height are captured:
     - **Width**: Distance from left edge (start) to right edge (end)
     - **Height**: Distance from top (start) to bottom (end) including caption and spacing

This works for:
- Single column: `twsp ≈ cwsp` → all elements in col 0
- Two columns: `twsp ≈ 2 × cwsp + colsep` → elements split by X position
- Three+ columns: `twsp > cwsp * 2.5` → can be extended

**Bounding box calculation uses pure X,Y coordinates** - doesn't depend on column field.

## Result:

- ✅ Tables get correct width (full textwidth or columnwidth)
- ✅ Tables get correct height (caption to bottom)
- ✅ Works with any future column layout
- ✅ Robust and maintainable

## Future Enhancements:

If needed, we could add to NDJSON:
- `column_left_edge_sp` - explicit left edge of current column
- `column_right_edge_sp` - explicit right edge
- `column_number` - 0-indexed column in N-column layout

But for now, **actual X, Y coordinates are sufficient**.

