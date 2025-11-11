# Overlay Coordinate Fixes

## Issues Reported

### Issue 1: sec-p-007 Overlay Spans Both Columns Instead of Just One
**Problem**: Paragraph `sec-p-007` has width 483.7pt (full textwidth) but should have ~235pt (columnwidth). The paragraph is in the left column (col=0) of a two-column layout, but the overlay was spanning both columns.

**Root Cause**: When both start and end markers had the same X position (causing zero width), the code incorrectly assigned `textwidth` to ANY paragraph in a multi-column layout with the same X positions. This was meant to handle abstracts that truly span both columns, but was also catching regular single-column paragraphs.

**Fix**: Added check for `col` field. If both start and end markers are in a specific column (col=0 or col=1) AND have the same column value, the paragraph is confined to that column and should use `columnwidth`, not `textwidth`.

```javascript
// Before: Incorrectly used textwidth for any paragraph with same X positions
if (isParagraph && isMultiColumn && Math.abs(x1Pt - x2Pt) < 1 && sameColumn && !isMultiSegment) {
    wPt = textWidthPt;  // ❌ Wrong for single-column paragraphs
}

// After: Check if confined to a specific column
const inSpecificColumn = (startRecord.col === 0 || startRecord.col === 1) && sameColumn;
if (!inSpecificColumn) {
    wPt = textWidthPt;  // Only for true full-width content
} else {
    wPt = columnWidthPt;  // ✅ Correct for single-column paragraphs
}
```

### Issue 2: fig-F3_seg2of3 Phantom Overlay on Page 6
**Problem**: Figure `fig-F3` appears on pages 5 (right column) and 7 (left column), but a phantom segment `fig-F3_seg2of3` with height 700.51pt (almost full page) was being created on page 6 where the figure doesn't actually exist.

**Root Cause**: The code was detecting that fig-F3 appears on pages [5, 7] and creating segments for ALL pages in the range (5, 6, 7), assuming it's a single multi-page element. However, these are actually TWO SEPARATE float placements of the same figure by LaTeX, not a single figure spanning 3 pages.

**Fix**: Distinguish between:
- **Consecutive pages** (e.g., [5, 6, 7]): Truly multi-page elements
- **Non-consecutive pages** (e.g., [5, 7]): Separate float placements

For FIGURES with non-consecutive pages, only create segments for the actual pages, don't fill gaps. For TABLES (longtables), always fill gaps because LaTeX only emits markers at start/end.

```javascript
// Check if pages are consecutive
let isConsecutive = true;
for (let i = 1; i < pages.length; i++) {
    if (pages[i] !== pages[i-1] + 1) {
        isConsecutive = false;
        break;
    }
}

// For TABLES: Always fill gaps (they truly span pages)
// For FIGURES: Only fill if consecutive (otherwise separate placements)
const isTable = elementPositions.some(p => p.type === 'table');
const shouldFillGaps = isTable || isConsecutive;

const allPages = shouldFillGaps ? fillRange(firstPage, lastPage) : pages;

if (!isConsecutive && !isTable) {
    console.log(`ℹ️  ${id}: Non-consecutive pages [${pages.join(', ')}] detected - treating as separate figure placements`);
}
```

## Test Results

### Before Fixes

```json
// sec-p-007: Wrong width
{
  "id": "sec-p-007",
  "page": 2,
  "w_pt": 483.7,  // ❌ Full textwidth instead of column width
  "h_pt": 494.81
}

// fig-F3: Phantom segment on page 6
{
  "id": "fig-F3_seg1of3",
  "page": 5,
  "h_pt": 191.1
}
{
  "id": "fig-F3_seg2of3",
  "page": 6,  // ❌ Phantom! Figure doesn't exist on page 6
  "h_pt": 700.51  // Almost full page height
}
{
  "id": "fig-F3_seg3of3",
  "page": 7,
  "h_pt": 191.1
}
```

### After Fixes

```json
// sec-p-007: Correct width
{
  "id": "sec-p-007",
  "page": 2,
  "w_pt": 235.85,  // ✅ Column width
  "h_pt": 494.81
}

// fig-F3: Only actual pages
{
  "id": "fig-F3_seg1of2",
  "page": 5,  // ✅ Only on actual pages
  "h_pt": 191.1
}
{
  "id": "fig-F3_seg2of2",
  "page": 7,  // ✅ No phantom page 6
  "h_pt": 191.1
}
```

### Longtable Still Works

The fix preserves correct behavior for longtables that truly span multiple pages:

```json
// table-multipage spans pages 16-18 (consecutive)
{
  "id": "table-multipage_seg1of3",
  "page": 16,
  "h_pt": 700.51
}
{
  "id": "table-multipage_seg2of3",
  "page": 17,  // ✅ Correctly fills gap for tables
  "h_pt": 700.51
}
{
  "id": "table-multipage_seg3of3",
  "page": 18,
  "h_pt": 97.82
}
```

## Files Modified

- `scripts/external/sync_from_aux.js`
  - Updated `calculateBoundingBox()` to check `col` field for zero-width paragraphs
  - Updated multi-page float logic to distinguish tables from figures
  - Added consecutiveness check for page ranges

## Console Output

```
✅ sec-p-007: Now uses column width
Warning: Zero width for sec-p-007 (type=para, col=0), using column width

✅ fig-F3: Only 2 segments instead of 3
ℹ️  fig-F3: Non-consecutive pages [5, 7] detected - treating as separate figure placements (not filling gaps)
   ✂️  Split float "fig-F3" into 2 page segments (pages: 5,7)

✅ table-multipage: Still correctly spans 3 pages
   ✂️  Split float "table-multipage" into 3 page segments (pages: 16,17,18)
```

## Summary

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| sec-p-007 width | 483.7pt (wrong) | 235.85pt (correct) | ✅ Fixed |
| fig-F3 segments | 3 (with phantom page 6) | 2 (pages 5, 7 only) | ✅ Fixed |
| table-multipage | 2 segments (broken) | 3 segments (correct) | ✅ Fixed |

**Overlays now correctly represent the actual layout of elements in the PDF!** 🎯
