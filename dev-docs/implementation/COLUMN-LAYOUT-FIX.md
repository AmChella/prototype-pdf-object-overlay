# Column Layout Overlay Fix for ENDEND10921

## Issue
In the ENDEND10921 PDF (and other two-column documents), paragraph overlays were not correctly covering the full width of single-column content (like abstracts) within a two-column document. 

### Symptoms:
1. **Abstract paragraphs**: Were only getting column width (235.85pt) instead of full text width (483.7pt)
2. **Multi-column paragraph segments**: Some segments were incorrectly using text width instead of column width

## Root Cause
The coordinate marking system places start/end markers for paragraphs. In two-column layouts:

1. **Single-column content** (like abstracts): Both P-start and P-end are at the same X position
2. **Multi-column content**: Start and end are in different columns

The zero-width detection logic was:
- Detecting when markers were at the same X position
- But not distinguishing between:
  - Single-column paragraphs (should use text width)
  - Segments of multi-column paragraphs (should use column width)

## Solution

### 1. Enhanced Synthetic Marker Creation
Updated `splitIntoSegments()` to create synthetic markers with proper X positions based on column boundaries:

```javascript
// Calculate X positions based on column
if (segment.column === 0) {
    // Left column: start at left margin, end at right edge of column
    syntheticStartXSp = leftMarginPt * 65536;
    syntheticEndXSp = (leftMarginPt + cwPt) * 65536;
} else {
    // Right column: start at left edge, end at right edge
    const rightColStartPt = leftMarginPt + cwPt + colsepPt;
    syntheticStartXSp = rightColStartPt * 65536;
    syntheticEndXSp = (rightColStartPt + cwPt) * 65536;
}
```

### 2. Improved Zero-Width Detection
Enhanced `calculateBoundingBox()` to:
- Accept `segmentInfo` parameter to know if it's part of a multi-segment element
- Only apply text width to single-element paragraphs in multi-column layouts
- Use column width for segments of multi-segment paragraphs

```javascript
// Check if this is a single-element paragraph (not part of a split)
const isMultiSegment = segmentInfo && segmentInfo.totalSegments > 1;

if (isParagraph && isMultiColumn && Math.abs(x1Pt - x2Pt) < 1 && sameColumn && !isMultiSegment) {
    // Single-column content in two-column doc: use textwidth
    wPt = textWidthPt;
} else {
    // Multi-segment paragraphs: use column width
    wPt = columnWidthPt;
}
```

## Results

### Before Fix:
```json
{
  "id": "sec-p-005",  // Abstract paragraph
  "x_pt": 56.91,
  "w_pt": 235.85      // ❌ Only column width
}
{
  "id": "sec-p-008_seg2of3",  // Right column segment
  "x_pt": 304.75,
  "w_pt": 483.7       // ❌ Text width (overlaps left column!)
}
```

### After Fix:
```json
{
  "id": "sec-p-005",  // Abstract paragraph
  "x_pt": 56.91,
  "w_pt": 483.7       // ✅ Full text width
}
{
  "id": "sec-p-008_seg1of3",  // Left column segment
  "x_pt": 56.91,
  "w_pt": 235.85      // ✅ Column width
}
{
  "id": "sec-p-008_seg2of3",  // Right column segment
  "x_pt": 304.75,
  "w_pt": 235.85      // ✅ Column width (no overlap)
}
```

## Files Modified

1. **`scripts/external/sync_from_aux.js`**
   - Updated `calculateBoundingBox()` signature to accept `segmentInfo`
   - Enhanced zero-width detection logic
   - Updated `splitIntoSegments()` to create synthetic markers with proper X positions
   - Updated `calculateBoundingBoxForSegment()` to pass segment information

## Testing

Tested with ENDEND10921 PDF:
- ✅ Single-column paragraphs (abstract, etc.) correctly span full text width
- ✅ Multi-column paragraph segments correctly use column width
- ✅ No overlapping overlays between columns
- ✅ 71 marked boxes generated successfully

## Technical Details

### Column Width Calculation:
- **Column width (`cwsp`)**: 15456563 sp = 235.85pt
- **Text width (`twsp`)**: 31699558 sp = 483.7pt  
- **Column separation**: 786432 sp = 12pt
- **Multi-column detection**: `textWidth > columnWidth * 1.5`

### Column Boundaries:
- **Left column**: x = 56.91pt to 292.76pt
- **Right column**: x = 304.75pt to 540.6pt

**Column layout overlays now work correctly for both single-column and multi-column content!** 🎯
