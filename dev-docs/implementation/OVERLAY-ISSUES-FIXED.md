# Overlay Issues Fixed - document.pdf

## Issues Reported

### Issue 1: sec3-p5_seg2of2 Overlays Figure (fig-sec3)
**Problem**: On page 3, paragraph `sec3-p5` flows from left column to right column. The second segment `sec3-p5_seg2of2` was drawn over `fig-sec3` which is also in the right column.

**Root Cause**: Figures (floats) are marked with `col=0` regardless of their actual column placement. The figure avoidance logic was comparing `fig.col` (always 0) with `segment.column` (actual column 0 or 1), so it never detected overlaps for figures in the right column (col=1).

**Fix**: Determine the actual column of figures based on their X position, not the `col` field.

```javascript
// Added helper function
function getActualColumn(xsp, col0StartPt, col1StartPt) {
    const xPt = parseInt(xsp) / 65536;
    const distToCol0 = Math.abs(xPt - col0StartPt);
    const distToCol1 = Math.abs(xPt - col1StartPt);
    return distToCol1 < distToCol0 ? 1 : 0;  // Closest column
}

// Updated extractFigureBounds to accept and use column start positions
function extractFigureBounds(positions, col0StartPt = 72.27, col1StartPt = 303.75) {
    // ...
    const actualCol = getActualColumn(startPos.xsp, col0StartPt, col1StartPt);
    figureBounds.push({ ...figure, col: actualCol });  // Use actual column
}
```

**Result**:
```bash
✅ Avoided figure "fig-sec3" in "sec3-p5" (page 3, col 1)
```

**Before**: 2 segments, seg2of2 overlapped figure
```json
{
  "id": "sec3-p5_seg1of2",  // Left column
  "y_pt": 702.61,
  "h_pt": 73.44
}
{
  "id": "sec3-p5_seg2of2",  // Right column, OVERLAPS figure ❌
  "y_pt": 71,
  "h_pt": 170.5
}
```

**After**: 2 segments, seg2of2 avoids figure
```json
{
  "id": "sec3-p5_seg1of2",  // Left column
  "y_pt": 702.61,
  "h_pt": 73.44
}
{
  "id": "sec3-p5_seg2of2_after-figure",  // Right column, AFTER figure ✅
  "y_pt": 197.36,  // Below figure (fig ends at ~191pt)
  "h_pt": 44.14
}
```

### Issue 2: sec5-p1_seg2of2 Too Narrow (Outside Left Margin)
**Problem**: Paragraph `sec5-p1_seg2of2` on page 5 had width of only 15.36pt instead of ~235pt (column width), making it appear outside the left margin.

**Root Cause**: Synthetic markers were using hardcoded `leftMarginPt = 56.91pt` (page margin), but in `document.pdf`, columns actually start at different positions:
- Left column (col=0): 72.27pt
- Right column (col=1): 303.75pt

The difference (72.27 - 56.91 = 15.36pt) is exactly the width error we were seeing!

**Fix**: Detect actual column start positions from paragraph data instead of using hardcoded values.

```javascript
// In splitIntoSegments, detect actual column starts
const col0Positions = positions.filter(p => p.col === 0 && p.type === 'para' && p.role.endsWith('-start'));
const col1Positions = positions.filter(p => p.col === 1 && p.type === 'para' && p.role.endsWith('-start'));

const col0StartPt = col0Positions.length > 0 ? spToPt(parseInt(col0Positions[0].xsp)) : 72.27;
const col1StartPt = col1Positions.length > 0 ? spToPt(parseInt(col1Positions[0].xsp)) : 303.75;

// Use detected values for synthetic markers
if (segment.column === 0) {
    syntheticStartXSp = String(Math.round(col0StartPt * 65536));  // 72.27pt, not 56.91pt
    syntheticEndXSp = String(Math.round((col0StartPt + cwPt) * 65536));
}
```

**Result**:
```bash
📐 Detected column starts: col0=72.27pt, col1=303.75pt
```

**Before**: Width 15.36pt ❌
```json
{
  "id": "sec5-p1_seg2of2",
  "page": 5,
  "x_pt": 56.91,  // Wrong X position
  "w_pt": 15.36   // Too narrow ❌
}
```

**After**: Width 235.85pt ✅
```json
{
  "id": "sec5-p1_seg2of2",
  "page": 5,
  "x_pt": 72.27,   // Correct column start
  "w_pt": 235.85   // Full column width ✅
}
```

## Files Modified

- `scripts/external/sync_from_aux.js`
  - Added `getActualColumn()` helper function
  - Updated `extractFigureBounds()` to accept column start positions and determine actual figure columns
  - Updated `generateMarkedBoxes()` to detect column starts and pass to extractFigureBounds
  - Updated `splitIntoSegments()` to detect actual column starts from data
  - Updated synthetic marker creation to use detected column starts instead of hardcoded values

## Summary

| Issue | Before | After | Status |
|-------|--------|-------|--------|
| **sec3-p5_seg2of2** overlap | Overlaps fig-sec3 ❌ | Avoids figure ✅ | **Fixed** |
| **sec5-p1_seg2of2** width | 15.36pt ❌ | 235.85pt ✅ | **Fixed** |

**Overlays now correctly:  
1. Avoid figures in the same column  
2. Use actual column boundaries from the document**  
🎯
