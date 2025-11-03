# JSON Coordinate Loading Feature

## ✨ Overview

The React UI now fully supports JSON coordinate overlay loading, matching the vanilla JS implementation. This feature allows users to:
1. **Upload JSON files** containing coordinate data
2. **Auto-load JSON** when documents are generated
3. Support **multiple JSON formats** (marked-boxes and geometry)

## 🎯 Features Implemented

### 1. JSON File Upload
- Drag-and-drop or click to upload JSON files
- Automatic format detection and conversion
- Visual feedback with toast notifications
- Located in sidebar under "Load Coordinates"

### 2. Auto-Load on Document Generation
- When a document is generated, both PDF and JSON are loaded automatically
- Preferred format detection (marked-boxes over geometry)
- Retry mechanism with 5 attempts and 1-second delays
- Progress updates during loading

### 3. Format Support

#### Marked-Boxes Format (Preferred)
```json
[
  {
    "id": "element-id",
    "page": 1,
    "x": 100,
    "y": 200,
    "width": 50,
    "height": 20,
    "text": "Sample Text",
    "action": { ... }
  }
]
```

#### Geometry Format (Auto-converted)
```json
{
  "pdfGeometryV1": {
    "pages": [
      {
        "index": 1,
        "elements": [
          {
            "id": "element-id",
            "x": 100,
            "y": 200,
            "width": 50,
            "height": 20,
            "text": "Sample Text",
            "action": { ... }
          }
        ]
      }
    ]
  }
}
```

## 📁 New Files

### Components
- `ui-react/src/components/JSONUploader/JSONUploader.jsx`
- `ui-react/src/components/JSONUploader/JSONUploader.css`

### Utilities
- `ui-react/src/utils/jsonLoader.js`
  - `loadOverlayJSON(url, maxRetries)` - Load JSON from URL
  - `parseOverlayData(jsonData)` - Parse different formats
  - `findPreferredJSONPath(jsonPath)` - Find marked-boxes variant
  - `convertToRelativeUrl(filePath)` - Convert paths to URLs

## 🔄 Updated Files

### App.jsx
- Import `jsonLoader` utilities
- Updated `onComplete` handler to load both PDF and JSON
- Added `setOverlayData` from context
- Enhanced progress status messages

### Sidebar.jsx
- Added `JSONUploader` component import
- Added "Load Coordinates" section

### AppContext.jsx (already had)
- `overlayData` state
- `setOverlayData` action

## 🚀 How It Works

### Upload Flow
```
User uploads JSON file
    ↓
JSONUploader reads file
    ↓
parseOverlayData() detects format
    ↓
Format converted if needed
    ↓
setOverlayData() updates context
    ↓
Overlays rendered on PDF
```

### Auto-Load Flow
```
Document generation completes
    ↓
Server sends pdfPath & jsonPath
    ↓
convertToRelativeUrl() creates URLs
    ↓
findPreferredJSONPath() checks for marked-boxes
    ↓
loadOverlayJSON() fetches with retries
    ↓
parseOverlayData() converts format
    ↓
setOverlayData() updates context
    ↓
Overlays rendered on PDF
```

## 🎨 User Interface

### JSONUploader Component
- Drag-and-drop zone
- Click to select file
- File type validation (.json)
- Visual feedback on hover
- Toast notifications for success/errors

### Sidebar Section
```
┌─────────────────────────────┐
│ Load Coordinates            │
│ ┌─────────────────────────┐ │
│ │      📋                  │ │
│ │  Upload Coordinate JSON │ │
│ │ Click or drag JSON here │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## 💡 Usage Examples

### Upload JSON Manually
```javascript
// User clicks/drags JSON file
// JSONUploader handles:
const handleFileSelect = async (file) => {
  const text = await file.text();
  const jsonData = JSON.parse(text);
  const overlays = parseOverlayData(jsonData);
  setOverlayData(overlays);
  toast.showSuccess(`Loaded ${overlays.length} overlays`);
};
```

### Auto-Load on Generation
```javascript
// In App.jsx onComplete handler:
const pdfUrl = `http://localhost:8081${pdfRelative}`;
const jsonUrl = await findPreferredJSONPath(jsonUrl);

// Load PDF and JSON in sequence
const pdf = await loadPDF(pdfUrl);
const overlays = await loadOverlayJSON(jsonUrl);

contextLoadPDF(pdf);
setOverlayData(overlays);
```

## 🔧 Error Handling

### JSON Upload Errors
- ❌ Wrong file type → Toast: "Please select a JSON file"
- ❌ Invalid JSON → Toast: "Failed to load JSON: [error]"
- ❌ Unsupported format → Toast: "Unsupported JSON format"

### Auto-Load Errors
- 🔄 Retry 5 times with 1-second delays
- ❌ After 5 failures → Toast: "Failed to load files: [error]"
- 📊 Console logs all attempts and errors

## ✅ Testing Checklist

- [x] Upload marked-boxes JSON format
- [x] Upload geometry JSON format
- [x] Drag-and-drop JSON file
- [x] Click to select JSON file
- [x] Auto-load JSON on document generation
- [x] Preferred format detection (marked-boxes)
- [x] Retry mechanism for network delays
- [x] Toast notifications for all states
- [x] Overlays display correctly
- [x] Overlay selector shows loaded overlays
- [x] Action modal works with loaded overlays

## 🎊 Benefits

### For Users
- ✅ Same functionality as vanilla JS version
- ✅ Seamless document generation workflow
- ✅ Visual feedback at every step
- ✅ Support for multiple JSON formats
- ✅ No manual reload needed

### For Developers
- ✅ Clean separation of concerns
- ✅ Reusable utility functions
- ✅ Comprehensive error handling
- ✅ Easy to extend with new formats
- ✅ Well-documented code

## 🔮 Future Enhancements

Potential improvements:
- [ ] JSON format validation with schema
- [ ] Preview JSON data before loading
- [ ] Export modified overlays as JSON
- [ ] Batch upload multiple JSON files
- [ ] JSON format conversion tool
- [ ] Overlay editing and saving

## 📝 Summary

The JSON coordinate loading feature is now **fully implemented** and matches the vanilla JS version. Users can:
- ✅ Upload JSON coordinate files manually
- ✅ Auto-load JSON when generating documents
- ✅ Use both marked-boxes and geometry formats
- ✅ Get visual feedback and notifications
- ✅ See overlays immediately after loading

**All coordinate overlay functionality from the vanilla JS version is now available in the React UI!** 🎉

