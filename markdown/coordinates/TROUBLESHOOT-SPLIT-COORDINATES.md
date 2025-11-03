# Troubleshooting: Split Coordinates Not Visible

## Quick Diagnostic Steps

### Step 1: Verify Coordinates Were Generated with Splitting

```bash
# Regenerate coordinates with splitting enabled
node scripts/external/sync_from_aux.js TeX/ENDEND10921-generated.aux --force
```

**Look for output like:**
```
✂️  Split "para-..." into 2 segments (pages: 1,1, cols: 0,1)
📊 Split: 25 | Single: 95
```

If you don't see the ✂️ scissors emoji, the splitting didn't happen.

### Step 2: Check the JSON File

```bash
# Check if segmented items exist
cat TeX/ENDEND10921-generated-marked-boxes.json | jq '.[] | select(.totalSegments > 1) | {id, originalId, page, segmentColumn}'
```

**Expected output:**
```json
{
  "id": "para-sec1-p-001_seg1of2",
  "originalId": "para-sec1-p-001",
  "page": 1,
  "segmentColumn": 0
}
{
  "id": "para-sec1-p-001_seg2of2",
  "originalId": "para-sec1-p-001",
  "page": 1,
  "segmentColumn": 1
}
```

If you don't see items with `_seg1of2` suffixes, regenerate the coordinates.

### Step 3: Verify JSON Format

```bash
# Check if w_pt and h_pt fields exist (required for UI)
cat TeX/ENDEND10921-generated-marked-boxes.json | jq '.[0]'
```

**Must have these fields:**
- `x_pt`, `y_pt`, `w_pt`, `h_pt` (NOT `width_pt`, `height_pt`)
- `x_mm`, `y_mm`, `w_mm`, `h_mm`
- `x_px`, `y_px`, `w_px`, `h_px`

### Step 4: Copy Files to UI Directory

```bash
# Ensure UI has the latest files
cp TeX/ENDEND10921-generated.pdf ui/
cp TeX/ENDEND10921-generated-marked-boxes.json ui/
```

### Step 5: Check Browser Console

Open browser DevTools (F12) and look for:

**Good signs:**
```
Drawing 156 overlays for page 1 using unit: pt
Item para-sec1-p-001_seg1of2: Final position - left: 56, top: 100, width: 235, height: 50
```

**Bad signs:**
```
No valid coordinates found for item: {id: "para-..._seg1of2", ...}
Skipping item para-..._seg1of2 with invalid dimensions
```

### Step 6: Reload the Page

1. Open `http://localhost:3000/ui/`
2. Make sure the correct JSON file is loaded in the dropdown
3. Check "Page info" at the bottom - should show overlay count

### Step 7: Check Overlay Toggle

Make sure "Show Overlays" toggle is ON (green).

---

## Common Issues

### Issue 1: JSON Still Has Old Format

**Symptom:** No ✂️ in console output when regenerating

**Fix:**
```bash
# Delete old files and regenerate
rm TeX/ENDEND10921-generated-marked-boxes.json
rm TeX/ENDEND10921-generated-texpos.ndjson
node scripts/external/sync_from_aux.js TeX/ENDEND10921-generated.aux --force
```

### Issue 2: UI Cached Old JSON

**Symptom:** Browser shows old overlay count

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Re-upload the JSON file manually

### Issue 3: Wrong JSON File Loaded

**Symptom:** Overlays appear but not split ones

**Fix:**
1. Check dropdown in UI - make sure you're loading the right file
2. Manually upload: `TeX/ENDEND10921-generated-marked-boxes.json`

### Issue 4: Coordinates Out of Bounds

**Symptom:** Browser console shows "Skipping item ... out of bounds"

**Fix:**
```bash
# Check coordinate values
cat TeX/ENDEND10921-generated-marked-boxes.json | jq '.[] | select(.totalSegments > 1) | {id, x_pt, y_pt, w_pt, h_pt}'
```

Coordinates should be reasonable:
- x_pt: 0-600 (for A4 width)
- y_pt: 0-850 (for A4 height)
- w_pt: > 0
- h_pt: > 0

---

## Verification Checklist

- [ ] Coordinates regenerated with latest code
- [ ] Console shows "✂️ Split ... into N segments"
- [ ] JSON file has `_seg1of2` suffixes
- [ ] JSON has `w_pt`/`h_pt` fields (not `width_pt`/`height_pt`)
- [ ] Files copied to `ui/` directory
- [ ] Browser shows correct overlay count
- [ ] Browser console shows "Drawing N overlays"
- [ ] "Show Overlays" toggle is ON
- [ ] No console errors

---

## Still Not Working?

Run the diagnostic command:

```bash
echo "=== Checking Coordinate Generation ==="
ls -lh TeX/ENDEND10921-generated-marked-boxes.json
echo ""
echo "=== Checking for Segmented Items ==="
cat TeX/ENDEND10921-generated-marked-boxes.json | jq '[.[] | select(.totalSegments > 1)] | length'
echo ""
echo "=== Sample Segmented Item ==="
cat TeX/ENDEND10921-generated-marked-boxes.json | jq '.[] | select(.totalSegments > 1) | {id, originalId, x_pt, y_pt, w_pt, h_pt, page, segmentColumn}' | head -20
```

Send the output for debugging.

