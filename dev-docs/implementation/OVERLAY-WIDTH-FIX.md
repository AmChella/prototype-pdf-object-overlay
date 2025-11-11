# Overlay Width Calculation Fix

## Problem

After fixing the column-specific width issue for `sec-p-007`, the overlays for abstract paragraphs on page 1 (`sec-p-002` through `sec-p-005`) were incorrectly using **column width** (235.85pt) instead of **full text width** (483.7pt).

### Previous Behavior
- ❌ Page 1 abstracts: 235.85pt (wrong - only half width)
- ✅ Page 2 paragraphs: 235.85pt (correct)

### Root Cause

The previous fix checked if a paragraph had `col=0` or `col=1` and assumed it was "confined to a specific column". However, this was wrong for:

1. **Abstracts on page 1**: Have `col=0` but span the full width (single-column mode)
2. **Regular paragraphs on page 2+**: Have `col=0` or `col=1` and truly are in that column (two-column mode)

The issue: **`col=0` doesn't always mean "left column" - it can also mean "full-width content starting at left margin"**.

## Solution

Detect whether each page is in **single-column mode** or **two-column mode** by analyzing the actual content distribution:

- **Single-column page**: Only has content in `col=0` (abstracts, title page)
- **Two-column page**: Has content in BOTH `col=0` AND `col=1` (body text)

### Implementation

**Step 1: Analyze page column modes**

```javascript
function analyzePageColumnMode(positions) {
    const pageColumnInfo = new Map();
    
    for (const pos of positions) {
        if (!pageColumnInfo.has(pos.page)) {
            pageColumnInfo.set(pos.page, new Set());
        }
        pageColumnInfo.get(pos.page).add(pos.col);
    }
    
    const result = new Map();
    for (const [page, cols] of pageColumnInfo.entries()) {
        // Page is two-column if it has content in both col=0 AND col=1
        const isTwoColumn = cols.has(0) && cols.has(1);
        result.set(page, isTwoColumn);
    }
    
    return result;
}
```

**Step 2: Use page mode for width calculation**

```javascript
// Before: Only checked col field
const inSpecificColumn = (startRecord.col === 0 || startRecord.col === 1) && sameColumn;
if (!inSpecificColumn) {
    wPt = textWidthPt;
} else {
    wPt = columnWidthPt;  // ❌ Wrong for single-column pages
}

// After: Check page mode
const page = startRecord.page;
const pageIsTwoColumn = pageColumnMode.get(page);

if (!pageIsTwoColumn) {
    // Single-column page (abstracts) → use textwidth
    wPt = textWidthPt;
} else {
    // Two-column page → use columnwidth
    wPt = columnWidthPt;
}
```

## Results

### Page Analysis

```
📄 Page analysis: P1=1col, P2=2col, P3=2col, P4=2col, P5=2col
```

### Width Assignments

**Before Fix:**
```json
// Page 1 (abstracts) - WRONG
{
  "id": "sec-p-002",
  "page": 1,
  "w_pt": 235.85  // ❌ Should be 483.7pt
}

// Page 2 (regular) - correct
{
  "id": "sec-p-007",
  "page": 2,
  "w_pt": 235.85  // ✅ Correct
}
```

**After Fix:**
```json
// Page 1 (abstracts) - CORRECT
{
  "id": "sec-p-002",
  "page": 1,
  "w_pt": 483.7  // ✅ Full textwidth
}
{
  "id": "sec-p-003",
  "page": 1,
  "w_pt": 483.7  // ✅ Full textwidth
}
{
  "id": "sec-p-004",
  "page": 1,
  "w_pt": 483.7  // ✅ Full textwidth
}
{
  "id": "sec-p-005",
  "page": 1,
  "w_pt": 483.7  // ✅ Full textwidth
}

// Page 2 (regular) - STILL CORRECT
{
  "id": "sec-p-007",
  "page": 2,
  "w_pt": 235.85  // ✅ Column width
}
```

### Console Output

```
Warning: Zero width for sec-p-002 (type=para, single-column page), using textwidth
Warning: Zero width for sec-p-003 (type=para, single-column page), using textwidth
Warning: Zero width for sec-p-004 (type=para, single-column page), using textwidth
Warning: Zero width for sec-p-005 (type=para, single-column page), using textwidth
Warning: Zero width for sec-p-007 (type=para, col=0, two-column page), using column width
```

## Document Structure

Scientific papers typically have this structure:

| Page | Section | Column Mode | Width |
|------|---------|-------------|-------|
| 1 | Title, Authors, Abstract | Single-column | 483.7pt (textwidth) |
| 2+ | Body text | Two-column | 235.85pt (columnwidth) |

This fix correctly detects and handles both modes.

## Files Modified

- `scripts/external/sync_from_aux.js`
  - Added `analyzePageColumnMode()` function
  - Updated `generateMarkedBoxes()` to call analysis and pass results
  - Updated `calculateBoundingBox()` to accept and use `pageColumnMode`
  - Updated `calculateBoundingBoxForSegment()` to pass `pageColumnMode`
  - Modified zero-width handling logic to check page mode instead of column field

## Summary

| Element | Before | After | Status |
|---------|--------|-------|--------|
| **sec-p-002** (abstract) | 235.85pt ❌ | 483.7pt ✅ | Fixed |
| **sec-p-003** (abstract) | 235.85pt ❌ | 483.7pt ✅ | Fixed |
| **sec-p-004** (abstract) | 235.85pt ❌ | 483.7pt ✅ | Fixed |
| **sec-p-005** (abstract) | 235.85pt ❌ | 483.7pt ✅ | Fixed |
| **sec-p-007** (body) | 235.85pt ✅ | 235.85pt ✅ | Still correct |
| **fig-F3** segments | 3 (phantom) ❌ | 2 (actual) ✅ | Still correct |

**Overlays now accurately represent both single-column and two-column page layouts!** 🎯
