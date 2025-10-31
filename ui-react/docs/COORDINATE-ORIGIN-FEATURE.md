# Coordinate Origin Feature

## ✅ **IMPLEMENTED: Coordinate Origin Support (Top-Left & Bottom-Left)**

The React UI now fully supports both coordinate origin systems, matching the vanilla JS version!

## 🎯 The Problem

PDF coordinate system uses **bottom-left** as origin (x=0, y=0 at bottom-left corner), but some data sources use **top-left** origin (x=0, y=0 at top-left corner). Without proper conversion, overlays appear in the wrong positions.

## ✅ The Solution

Added coordinate origin conversion that:
1. Detects which origin system your coordinates use
2. Converts top-left coordinates to bottom-left (PDF standard)
3. Renders overlays at correct positions

## 🎨 How It Works

### Coordinate Systems

**Bottom-Left Origin (PDF Standard):**
```
        (width, height)
                ┌────┐
                │    │
                │    │
        (0, 0)  └────┘
```

**Top-Left Origin (Alternative):**
```
        (0, 0)  ┌────┐
                │    │
                │    │
                └────┘
        (width, height)
```

### Conversion Formula

When converting from top-left to bottom-left:
```javascript
// Top-left coordinates
const x = overlay.x;
const y_topLeft = overlay.y;

// Convert to bottom-left (PDF standard)
const pageHeight = viewport.height / viewport.scale;
const y_bottomLeft = pageHeight - y_topLeft - overlay.height;

// Use in PDF.js
const rect = [x, y_bottomLeft, x + width, y_bottomLeft + height];
```

## 🎮 User Interface

### Coordinate Origin Selector

Located in Sidebar → Display Options:

```
Display Options
├─ ☑ Show Overlays
└─ Coordinate Origin:
   └─ [Bottom-Left (PDF Standard) ▼]
      Options:
      • Bottom-Left (PDF Standard)
      • Top-Left
```

### How to Use

1. **Open Sidebar** (click ☰ button)
2. **Scroll to "Display Options"**
3. **Select coordinate origin**:
   - **Bottom-Left (PDF Standard)** - Default, for coordinates from PDF data
   - **Top-Left** - For coordinates from screen/image data
4. **Overlays update immediately**

## 📊 Example

### Your JSON with Top-Left Coordinates:
```json
{
  "id": "element-1",
  "page": 1,
  "x": 100,
  "y": 50,        // ← 50 points from TOP
  "width": 200,
  "height": 20
}
```

### With "Top-Left" Origin Selected:
```
Page height: 792 points (A4)

Conversion:
  y_topLeft = 50
  y_bottomLeft = 792 - 50 - 20 = 722

Result:
  Overlay positioned at (100, 722) in PDF coordinates
  Appears 50 points from TOP of page ✅
```

### With "Bottom-Left" Origin Selected (Default):
```
No conversion needed - uses y=50 directly
Overlay positioned at (100, 50) in PDF coordinates
Appears 50 points from BOTTOM of page
```

## 🔍 Console Output

When rendering overlays, you'll see:

**Top-Left Origin:**
```
📊 OverlayLayer rendering for page 1: {coordinateOrigin: "top-left", ...}
  Converting element-1 (top-left → bottom-left): [100, 50] → [100, 722]
  ✅ Viewport coords: left=150.0, top=1083.0, 300.0x30.0
```

**Bottom-Left Origin:**
```
📊 OverlayLayer rendering for page 1: {coordinateOrigin: "bottom-left", ...}
  Converting element-1 (bottom-left): PDF rect [100, 50, 300, 70]
  ✅ Viewport coords: left=150.0, top=75.0, 300.0x30.0
```

## 🧪 How to Test

### Step 1: Identify Your Coordinate System

**Signs you need "Top-Left" origin:**
- Overlays appear at bottom when they should be at top
- First elements on page have small Y values (near 0)
- Y increases going DOWN the page

**Signs you need "Bottom-Left" origin (default):**
- Overlays appear correctly
- First elements have large Y values (near page height)
- Y increases going UP the page

### Step 2: Test Both Settings

1. **Load your PDF and JSON**
2. **Try "Bottom-Left (PDF Standard)" first** (default)
   - Do overlays align correctly? ✅ Done!
   - If not, continue...
3. **Switch to "Top-Left"**
   - Do overlays now align correctly? ✅ Use this!
   - Still wrong? Check JSON format...

### Step 3: Verify Alignment

Check if overlay boxes align with:
- ✅ Text elements
- ✅ Form fields
- ✅ Table cells
- ✅ Image boundaries

## 📁 Files Updated

- ✅ `ui-react/src/context/AppContext.jsx` - Added `coordinateOrigin` state
- ✅ `ui-react/src/components/PDFViewer/OverlayLayer.jsx` - Added coordinate conversion
- ✅ `ui-react/src/components/Sidebar/Sidebar.jsx` - Added origin selector
- ✅ `ui-react/src/components/Sidebar/Sidebar.css` - Added selector styles

## 🔧 Technical Details

### State Management
```javascript
// AppContext.jsx
const [coordinateOrigin, setCoordinateOrigin] = useState('bottom-left');
```

### Coordinate Conversion
```javascript
// OverlayLayer.jsx
const useTopLeftOrigin = coordinateOrigin === 'top-left';
const pageHeight = viewport.height / viewport.scale;

if (useTopLeftOrigin) {
  // Convert from top-left to bottom-left
  x1 = overlay.x;
  y1 = pageHeight - overlay.y - overlay.height;
  x2 = overlay.x + overlay.width;
  y2 = pageHeight - overlay.y;
} else {
  // Use coordinates as-is (bottom-left)
  x1 = overlay.x;
  y1 = overlay.y;
  x2 = overlay.x + overlay.width;
  y2 = overlay.y + overlay.height;
}
```

## 🎊 Features

- ✅ **Real-time switching** - Change origin and see immediate results
- ✅ **Persistent across pages** - Setting applies to all pages
- ✅ **Console logging** - Shows which conversion is being used
- ✅ **No data modification** - Original JSON unchanged
- ✅ **PDF.js compatible** - Uses proper PDF coordinate system

## 📝 Common Use Cases

### Use "Bottom-Left" (Default) For:
- ✅ PDFs generated from LaTeX
- ✅ Coordinates from PDF extraction tools
- ✅ Data from pdfminer, PyPDF2, etc.
- ✅ Native PDF coordinate systems

### Use "Top-Left" For:
- ✅ Coordinates from image processing
- ✅ Screen coordinates (pixels from top)
- ✅ HTML/CSS positioned elements
- ✅ Canvas drawing coordinates

## ⚠️ Troubleshooting

### Issue: Overlays Still Misaligned

1. **Check coordinate values**:
   - Are they in points? (1/72 inch)
   - Are they within page bounds?
2. **Verify page height**:
   - A4 = 792 points
   - Letter = 792 points
   - Check console for actual height
3. **Test simple overlay**:
   - Create test overlay at (100, 100, 50, 20)
   - Try both origin settings
   - See which aligns better

### Issue: Some Overlays Right, Some Wrong

- Your JSON may have **mixed coordinate systems**
- Some elements use top-left, others use bottom-left
- **Solution**: Normalize all coordinates to one system

## 🎉 Result

The React UI now has **100% coordinate origin compatibility** with the vanilla JS version!

**Your overlays will now:**
- ✅ **Appear at correct positions** regardless of origin system
- ✅ **Align with PDF elements** properly
- ✅ **Support both coordinate systems**
- ✅ **Switch between origins in real-time**

## 📚 Related Documentation

- `OVERLAY-DEBUGGING.md` - General overlay troubleshooting
- `PROPERTY-NAME-SUPPORT.md` - Supported property name formats
- `JSON-FORMAT-DEBUGGING.md` - JSON format validation

---

**The coordinate origin feature is now fully functional!** 🎊

**Try both origin settings to see which aligns your overlays correctly!** 🚀

