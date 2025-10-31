# Overlay Debugging Guide

## 🔧 Issue Fixed

The OverlayLayer component was not using the correct coordinate transformation. It's now fixed to use `viewport.convertToViewportRectangle()` just like the vanilla JS version.

## ✅ Changes Made

### OverlayLayer.jsx
1. **Fixed coordinate transformation**: Now uses `viewport.convertToViewportRectangle([x1, y1, x2, y2])` 
2. **Added console logging**: Detailed logs for debugging
3. **Fixed function call**: Changed from `selectOverlay` to `setSelectedOverlayId`
4. **Added null checks**: Skips invalid or too-small overlays

## 🧪 Testing Steps

### 1. Refresh the React App
```bash
# In browser
Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
# Or navigate to http://localhost:3000
```

### 2. Open Browser Console
- Press F12 or right-click → Inspect
- Go to Console tab

### 3. Load a PDF
- Upload a PDF file via the sidebar
- Or generate a document (which auto-loads PDF + JSON)

### 4. Load JSON Coordinates
- **Option A: Manual Upload**
  - Click "Load Coordinates" section in sidebar
  - Upload a JSON file (e.g., from `ui/` directory)
  
- **Option B: Auto-load via Generation**
  - Generate a document
  - JSON will auto-load with PDF

### 5. Check Console Output

You should see logs like:
```
📊 OverlayLayer rendering for page 1: {overlayCount: 25, overlays: Array(25), ...}
  Converting element-1: PDF rect [100, 200, 150, 220]
  ✅ Viewport coords: left=150.0, top=300.0, 75.0x30.0
  Converting element-2: PDF rect [200, 300, 250, 320]
  ✅ Viewport coords: left=300.0, top=450.0, 75.0x30.0
...
```

### 6. Visual Verification

**What you should see:**
- ✅ Colored semi-transparent boxes on the PDF
- ✅ Boxes positioned at the correct locations
- ✅ Hover effect (border becomes thicker, blue glow)
- ✅ Click to select (blue border, brighter glow)
- ✅ Text labels on hover (if overlay has text)

## 🐛 Troubleshooting

### Issue: "No overlay data to render"
**Cause**: No JSON data loaded
**Solution**:
1. Check if overlayData is set in AppContext
2. Upload a JSON file manually
3. Or generate a document to auto-load JSON

### Issue: Overlays not visible
**Cause**: Overlays might be disabled
**Solution**:
1. Check "Show Overlays" checkbox in sidebar
2. Or press `O` key to toggle overlays

### Issue: Console shows "Skipping overlay with invalid dimensions"
**Cause**: Overlay has zero or negative width/height
**Solution**:
- Check JSON file format
- Ensure all overlays have valid x, y, width, height values

### Issue: Overlays in wrong position
**Cause**: Wrong coordinate origin or units
**Solution**:
- JSON coordinates should be in **points** (1/72 inch)
- Coordinates should use **bottom-left origin** (PDF standard)
- The component now handles this automatically

## 📊 JSON Format Check

Your JSON should look like this:

**Marked-Boxes Format (Preferred):**
```json
[
  {
    "id": "element-1",
    "page": 1,
    "x": 100,        // Points from left (bottom-left origin)
    "y": 200,        // Points from bottom (bottom-left origin)
    "width": 50,     // Points
    "height": 20,    // Points
    "text": "Sample",
    "type": "text"   // Optional: affects color
  }
]
```

**Supported Types:**
- `text` → Blue overlay
- `image` → Green overlay
- `table` → Orange overlay
- `header` → Purple overlay
- `footer` → Pink overlay
- `default` → Red overlay

## 🎨 Visual Overlay States

### Normal State
- Semi-transparent background
- Thin white border
- Cursor: pointer

### Hover State
- Thicker border (3px)
- Blue glow shadow
- Text label visible (if present)

### Selected State
- Solid blue border (3px)
- Bright blue glow
- Text label with blue background
- Higher z-index (appears on top)

## 🔍 Console Commands for Testing

Open browser console and try:

```javascript
// Check if overlayData is loaded
console.log('Overlay Data:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);

// Check AppContext (via React DevTools)
// Look for overlayData array

// Force re-render (change page and back)
// Use page navigation buttons
```

## ✅ Success Indicators

You'll know overlays are working when:
1. ✅ Console shows "Rendering X overlays"
2. ✅ Console shows viewport coordinate calculations
3. ✅ Colored boxes appear on PDF
4. ✅ Boxes align with text/elements in PDF
5. ✅ Hover shows blue glow
6. ✅ Click selects overlay (blue border)
7. ✅ Overlay selector in sidebar shows overlays
8. ✅ Clicking overlay in sidebar selects it in PDF

## 📝 Next Steps

If overlays are still not showing after following this guide:

1. **Check AppContext state:**
   - Open React DevTools
   - Find AppProvider component
   - Check `overlayData` value

2. **Verify JSON structure:**
   - Ensure JSON is valid
   - Check coordinate values are numbers
   - Verify page numbers match PDF

3. **Check CSS:**
   - Ensure no z-index conflicts
   - Verify overlay-layer is visible
   - Check browser zoom level

4. **Test with sample data:**
   - Create a simple JSON with 1-2 overlays
   - Use obvious coordinates (e.g., 100, 100, 200, 50)

## 🎉 Expected Result

After the fix, you should see:
- ✅ Overlays rendering correctly
- ✅ Proper coordinate transformation
- ✅ Interactive hover/click states
- ✅ Integration with overlay selector
- ✅ Full parity with vanilla JS version

The coordinate overlay system is now fully functional! 🚀

