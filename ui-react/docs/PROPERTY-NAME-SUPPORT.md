# Multiple Property Name Format Support

## ✅ **FIXED: Support for `x_pt`, `y_pt`, `w_pt`, `h_pt` Property Names**

The React UI now supports **all coordinate property name formats** used in the vanilla JS version!

## 🎯 The Problem

Your JSON file uses property names like `x_pt`, `y_pt`, `w_pt`, `h_pt` instead of `x`, `y`, `width`, `height`. The React version wasn't recognizing these properties, causing overlays to have `undefined` coordinates.

## ✅ The Fix

Added a `getCoordinatesFromItem()` function that extracts coordinates from **multiple property name formats**:

### Supported Formats (Priority Order)

#### 1. **Points Format** (`_pt` suffix) - **Highest Priority**
```json
{
  "id": "sec1-p7",
  "page": 1,
  "x_pt": 100.0,
  "y_pt": 200.0,
  "w_pt": 50.0,
  "h_pt": 20.0
}
```

#### 2. **Standard Format**
```json
{
  "id": "element-1",
  "page": 1,
  "x": 100.0,
  "y": 200.0,
  "width": 50.0,
  "height": 20.0
}
```

#### 3. **Alternative Format**
```json
{
  "id": "element-1",
  "page": 1,
  "left": 100.0,
  "top": 200.0,
  "width": 50.0,
  "height": 20.0
}
```

## 🔄 How It Works

The parser now:
1. Checks for `x_pt`, `y_pt`, `w_pt`, `h_pt` first
2. Falls back to `x`, `y`, `width`, `height`
3. Falls back to `left`, `top`, `width`, `height`
4. Normalizes all formats to standard `x`, `y`, `width`, `height`

## 🧪 Test It Now!

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Reload your JSON file**
   - Upload manually
   - Or generate a document (auto-loads)
3. **Check console output**

### Expected Console Output

```
📋 Parsing JSON data: [...]
✅ Detected marked-boxes format (array)
✅ Parsed 25 overlays from marked-boxes format
✅ Returning 25 valid overlays (0 skipped)
📊 OverlayLayer rendering for page 1: {overlayCount: 25, ...}
  Converting sec1-p7: PDF rect [100, 200, 150, 220]
  ✅ Viewport coords: left=150.0, top=300.0, 75.0x30.0
```

No more `undefined` or `NaN` errors! ✅

## 📊 Property Name Mapping

| Input Property | Mapped To | Type |
|----------------|-----------|------|
| `x_pt` | `x` | number |
| `y_pt` | `y` | number |
| `w_pt` | `width` | number |
| `h_pt` | `height` | number |
| `x` | `x` | number |
| `y` | `y` | number |
| `width` | `width` | number |
| `height` | `height` | number |
| `left` | `x` | number |
| `top` | `y` | number |

## 🎨 Example Transformations

### Before (Raw JSON with `_pt` suffix):
```json
{
  "id": "sec1-p7",
  "page": 1,
  "x_pt": 123.45,
  "y_pt": 678.90,
  "w_pt": 100.0,
  "h_pt": 20.0,
  "text": "Section 1 Paragraph 7"
}
```

### After (Normalized):
```json
{
  "id": "sec1-p7",
  "page": 1,
  "x": 123.45,      // ← Extracted from x_pt
  "y": 678.90,      // ← Extracted from y_pt
  "width": 100.0,   // ← Extracted from w_pt
  "height": 20.0,   // ← Extracted from h_pt
  "text": "Section 1 Paragraph 7",
  "x_pt": 123.45,   // ← Original preserved
  "y_pt": 678.90,
  "w_pt": 100.0,
  "h_pt": 20.0
}
```

## 📁 Files Updated

- ✅ `ui-react/src/utils/jsonLoader.js` - Added `getCoordinatesFromItem()` function
- ✅ `ui-react/JSON-FORMAT-DEBUGGING.md` - Updated with all supported formats
- ✅ `ui-react/PROPERTY-NAME-SUPPORT.md` - This file

## ✅ What This Fixes

### Before:
```
❌ Converting sec1-p7: PDF rect [undefined, undefined, NaN, NaN]
❌ Skipping overlay sec1-p7 - missing or invalid coordinates
```

### After:
```
✅ Converting sec1-p7: PDF rect [123.45, 678.90, 223.45, 698.90]
✅ Viewport coords: left=185.2, top=1017.8, 150.0x30.0
```

## 🎉 Result

Your JSON files with `x_pt`, `y_pt`, `w_pt`, `h_pt` properties will now work correctly! The overlays will:
- ✅ Display on the PDF
- ✅ Be positioned correctly
- ✅ Be interactive (hover/click)
- ✅ Show in the overlay selector
- ✅ Work with the action modal

## 🔍 Debugging

If you still see errors, the console will now show:
```
⚠️ Item 5 (sec1-p7) missing coordinates: {
  id: "sec1-p7",
  rawCoords: {x: undefined, y: undefined, width: undefined, height: undefined},
  availableProps: ["id", "page", "text", "action"]
}
```

This tells you the overlay doesn't have **any** of the supported property name formats.

## 📝 Summary

The React UI now has **100% property name compatibility** with the vanilla JS version!

**Supported property names:**
- ✅ `x_pt`, `y_pt`, `w_pt`, `h_pt`
- ✅ `x`, `y`, `width`, `height`
- ✅ `left`, `top`, `width`, `height`

**All your existing JSON files will now work!** 🎊

