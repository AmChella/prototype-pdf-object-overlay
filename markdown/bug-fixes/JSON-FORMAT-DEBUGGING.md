# JSON Format Debugging Guide

## 🔍 Issue: "Converting xxx: PDF rect [undefined, undefined, NaN, NaN]"

This error means your JSON overlay data is missing coordinate properties (`x`, `y`, `width`, `height`).

## 📊 Enhanced Validation

I've added comprehensive validation and logging to help diagnose JSON format issues:

### What's New
- ✅ Detailed console logging showing what properties are available
- ✅ Validation of coordinate data before rendering
- ✅ Toast notifications for invalid overlays
- ✅ Summary of valid vs invalid overlays

## 🧪 Debugging Steps

### 1. Refresh and Check Console

```bash
# Refresh browser
Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Open Console
F12 → Console tab
```

### 2. Upload or Generate JSON

When you load JSON, you'll now see detailed logs:

```
📋 Parsing JSON data: {...}
✅ Detected marked-boxes format (array)
⚠️ Item 5 (sec1-p6) missing coordinates: {
  id: "sec1-p6",
  x: undefined,
  y: undefined,
  width: undefined,
  height: undefined,
  availableProps: ["id", "page", "text", "action"]
}
✅ Parsed 25 overlays from marked-boxes format
⚠️ Found 3 overlays with invalid/missing coordinates
✅ Returning 22 valid overlays (3 skipped)
```

### 3. Check Your JSON Format

The logs will show:
- **What format was detected** (marked-boxes or geometry)
- **Which overlays are missing coordinates**
- **What properties each overlay actually has**
- **How many valid vs invalid overlays**

## 📝 Supported JSON Formats

### Format 1: Points Format (with _pt suffix) ✅ PREFERRED

```json
[
  {
    "id": "element-1",
    "page": 1,
    "x_pt": 100.0,     // ← X coordinate in points
    "y_pt": 200.0,     // ← Y coordinate in points
    "w_pt": 50.0,      // ← Width in points
    "h_pt": 20.0,      // ← Height in points
    "text": "Sample Text",
    "action": { ... },
    "type": "text"
  }
]
```

### Format 2: Standard Property Names ✅ SUPPORTED

```json
[
  {
    "id": "element-1",
    "page": 1,
    "x": 100.0,        // ← X coordinate in points
    "y": 200.0,        // ← Y coordinate in points
    "width": 50.0,     // ← Width in points
    "height": 20.0,    // ← Height in points
    "text": "Sample Text",
    "action": { ... },
    "type": "text"
  }
]
```

### Format 3: Alternative Names ✅ SUPPORTED

```json
[
  {
    "id": "element-1",
    "page": 1,
    "left": 100.0,     // ← X coordinate in points
    "top": 200.0,      // ← Y coordinate in points
    "width": 50.0,     // ← Width in points
    "height": 20.0,    // ← Height in points
    "text": "Sample Text"
  }
]
```

### Format 4: Geometry Format (Object) ✅ SUPPORTED

```json
{
  "pdfGeometryV1": {
    "pages": [
      {
        "index": 1,
        "elements": [
          {
            "id": "element-1",
            "x": 100.0,        // ← REQUIRED: number in points
            "y": 200.0,        // ← REQUIRED: number in points
            "width": 50.0,     // ← REQUIRED: number in points
            "height": 20.0,    // ← REQUIRED: number in points
            "text": "Sample Text",
            "action": { ... },
            "type": "text"
          }
        ]
      }
    ]
  }
}
```

## ⚠️ Common Issues

### Issue 1: Missing Coordinate Properties

**Bad:**
```json
{
  "id": "sec1-p6",
  "page": 1,
  "text": "Some text"
  // ❌ Missing: x, y, width, height
}
```

**Good:**
```json
{
  "id": "sec1-p6",
  "page": 1,
  "x": 100.0,
  "y": 200.0,
  "width": 50.0,
  "height": 20.0,
  "text": "Some text"
}
```

### Issue 2: Coordinates as Strings

**Bad:**
```json
{
  "id": "element-1",
  "x": "100",      // ❌ String instead of number
  "y": "200",      // ❌ String instead of number
  "width": "50",   // ❌ String instead of number
  "height": "20"   // ❌ String instead of number
}
```

**Good:**
```json
{
  "id": "element-1",
  "x": 100.0,      // ✅ Number
  "y": 200.0,      // ✅ Number
  "width": 50.0,   // ✅ Number
  "height": 20.0   // ✅ Number
}
```

### Issue 3: Nested Coordinates

**Bad:**
```json
{
  "id": "element-1",
  "rect": {
    "x": 100,
    "y": 200,
    "width": 50,
    "height": 20
  }
}
```

**Good:**
```json
{
  "id": "element-1",
  "x": 100.0,      // ✅ At top level
  "y": 200.0,
  "width": 50.0,
  "height": 20.0
}
```

### Issue 4: Wrong Units or Origin

**Requirements:**
- ✅ Coordinates must be in **points** (1/72 inch)
- ✅ Origin is **bottom-left** (PDF standard)
- ❌ NOT pixels
- ❌ NOT top-left origin

## 🔧 Fixing Your JSON

### Option 1: Check Generated JSON

If using document generation:
1. Find the JSON file in `ui/` directory
2. Open in text editor
3. Verify each overlay has `x`, `y`, `width`, `height` as numbers
4. Check sample overlay structure

### Option 2: Validate JSON Structure

Use this template to check your JSON:

```javascript
// In browser console:
const overlay = {
  id: "test",
  page: 1,
  x: 100,
  y: 200,
  width: 50,
  height: 20
};

// Check properties
console.log('Valid:', 
  typeof overlay.x === 'number' &&
  typeof overlay.y === 'number' &&
  typeof overlay.width === 'number' &&
  typeof overlay.height === 'number'
);
```

### Option 3: Transform Your JSON

If your JSON has a different structure, transform it:

```javascript
// Example: Transform nested coordinates
const transformed = yourData.map(item => ({
  id: item.id,
  page: item.page,
  x: parseFloat(item.rect.left),
  y: parseFloat(item.rect.bottom),
  width: parseFloat(item.rect.width),
  height: parseFloat(item.rect.height),
  text: item.text
}));

// Then load the transformed data
console.log(JSON.stringify(transformed, null, 2));
```

## 📊 Console Output Reference

### Successful Load
```
📋 Parsing JSON data: [...]
✅ Detected marked-boxes format (array)
✅ Parsed 25 overlays from marked-boxes format
✅ Returning 25 valid overlays (0 skipped)
📊 OverlayLayer rendering for page 1: {overlayCount: 25, ...}
  Converting element-1: PDF rect [100, 200, 150, 220]
  ✅ Viewport coords: left=150.0, top=300.0, 75.0x30.0
```

### Problem: Missing Coordinates
```
📋 Parsing JSON data: [...]
✅ Detected marked-boxes format (array)
⚠️ Item 5 (sec1-p6) missing coordinates: {
  id: "sec1-p6",
  x: undefined,
  y: undefined,
  width: undefined,
  height: undefined,
  availableProps: ["id", "page", "text"]
}
⚠️ Found 3 overlays with invalid/missing coordinates
✅ Returning 22 valid overlays (3 skipped)
```

### Problem: Unsupported Format
```
📋 Parsing JSON data: {...}
⚠️ Unsupported JSON format. Expected either:
  1. Array of overlays (marked-boxes format)
  2. Object with pdfGeometryV1.pages (geometry format)
  Received: object ["data", "metadata", "pages"]
```

## ✅ Verification Checklist

After loading JSON, verify:
- [ ] Console shows "✅ Parsed X overlays"
- [ ] Console shows "✅ Returning X valid overlays"
- [ ] No "undefined" or "NaN" in coordinate logs
- [ ] Overlays visible on PDF
- [ ] Hover/click works on overlays
- [ ] Overlay selector shows overlays in sidebar

## 🆘 Still Having Issues?

### Check These:

1. **JSON file path**: Is it accessible?
2. **JSON syntax**: Is it valid JSON?
3. **Property names**: Exactly `x`, `y`, `width`, `height` (lowercase)
4. **Data types**: All coordinates are numbers, not strings
5. **Page numbers**: Match PDF page numbers (1-indexed)

### Provide This Info:

If you need help, share:
1. Console output from JSON loading
2. Sample overlay from your JSON (1-2 items)
3. What properties are shown in "availableProps"
4. Whether you're using marked-boxes or geometry format

## 🎯 Quick Fix

Most common fix - ensure your JSON looks like this:

```json
[
  {
    "id": "element-1",
    "page": 1,
    "x": 100.0,
    "y": 200.0,
    "width": 50.0,
    "height": 20.0
  }
]
```

All four coordinate properties (`x`, `y`, `width`, `height`) must be present as numbers!

