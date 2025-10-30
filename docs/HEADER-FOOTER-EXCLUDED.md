# ✅ Header and Footer Areas Excluded from Overlays

## Problem
Overlay bounding boxes were extending into header and footer areas, covering content that shouldn't be highlighted.

## Solution
Modified the splitting logic to respect text body boundaries:

### Text Body Margins
Based on analysis of actual content Y-coordinates:
- **Header margin**: 71pt from top of page
- **Footer margin**: 69pt from bottom of page
- **Page height**: 845.04684pt
- **Text body top**: 774pt (845 - 71)
- **Text body bottom**: 69pt

### Implementation
Updated `splitIntoSegments()` in `sync_from_aux.js`:

```javascript
// Define text body area (excluding header and footer)
const headerMarginPt = 71;
const footerMarginPt = 69;
const textBodyTopPt = pageHeightPt - headerMarginPt; // ~774pt
const textBodyBottomPt = footerMarginPt; // ~69pt

// Convert to scaled points for synthetic markers
const textBodyTopSp = Math.round(textBodyTopPt * 65536);
const textBodyBottomSp = Math.round(textBodyBottomPt * 65536);
```

Synthetic markers (for page boundaries) now use:
- **Top boundary**: 774pt (not 845pt) - excludes header
- **Bottom boundary**: 69pt (not 0pt) - excludes footer

## Results

### Before
```
Y-coordinate range: 0pt to 845pt (full page)
❌ Overlays extended into header and footer areas
```

### After
```
Y-coordinate range: 71pt to 776pt (text body only)
✅ Overlays respect text body boundaries
```

### Verification
```
min_y: 71pt    (≈ text body bottom: 69pt) ✓
max_y: 776pt   (≈ text body top: 774pt) ✓
```

The slight difference (71 vs 69, 776 vs 774) is due to real content markers being slightly beyond the synthetic boundaries, which is accurate and acceptable.

## Impact on All Scenarios

### ✅ Scenario 1: Column Spanning
- Left and right column segments respect header/footer margins
- Example: `sec-p-032` properly bounded to text body

### ✅ Scenario 2: Page Spanning
- First page: Content → text body bottom (69pt)
- Last page: Text body top (774pt) → content
- Middle pages: Text body top → text body bottom

### ✅ Scenario 3: Columns AND Pages
- All segments (across columns and pages) respect margins
- Example: `sec-p-008` with 3 segments all properly bounded

## Technical Details

### Coordinate System
- **PDF coordinates**: Bottom-left origin
- y_pt: Bottom of bounding box
- y_pt + h_pt: Top of bounding box

### Synthetic Marker Placement
When creating synthetic markers for page boundaries:
- **First segment end**: `ysp = textBodyBottomSp` (69pt)
- **Middle segment start**: `ysp = textBodyTopSp` (774pt)
- **Middle segment end**: `ysp = textBodyBottomSp` (69pt)
- **Last segment start**: `ysp = textBodyTopSp` (774pt)

### Real Markers
Real markers from actual content are ALWAYS used as-is. Only synthetic markers (for page continuation) respect the text body boundaries.

## Files Modified

| File | Changes |
|------|---------|
| `scripts/external/sync_from_aux.js` | Added header/footer margin constants, updated synthetic marker Y positions |

**Lines changed**: ~15 lines

## Usage

The change is **automatic** - just regenerate coordinates:

```bash
node scripts/external/sync_from_aux.js TeX/document.aux --force
```

All generated overlays will now respect text body boundaries!

## Testing

1. **Regenerate coordinates**:
   ```bash
   node scripts/external/sync_from_aux.js TeX/ENDEND10921-generated.aux --force
   ```

2. **Verify Y-range**:
   ```bash
   cat TeX/ENDEND10921-generated-marked-boxes.json | \
     jq '[.[] | {y_bottom: .y_pt, y_top: (.y_pt + .h_pt)}] | 
         (map(.y_bottom) | min) as $min | 
         (map(.y_top) | max) as $max | 
         {min_y: $min, max_y: $max}'
   ```
   
   Expected: min_y ≈ 69-71pt, max_y ≈ 774-776pt

3. **Visual check in browser**:
   - Reload UI
   - Navigate through pages
   - Overlays should NOT extend into header/footer areas

## Benefits

✅ **Accurate overlays** - Only highlight actual content area  
✅ **No header/footer overlap** - Headers and footers remain clear  
✅ **All scenarios supported** - Works for single, column-spanning, and page-spanning elements  
✅ **Automatic** - No manual configuration needed  

---

**Date:** October 30, 2025  
**Issue:** Overlays extending into header/footer areas  
**Status:** ✅ FIXED  
**Ready to Use:** ✅ YES

