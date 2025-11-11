# Element Type Determination - LaTeX vs JavaScript

## Issue
Previously, the JavaScript code was parsing the `role` field (e.g., "P-start", "TABLE-end", "FIG-start") to determine the element type (paragraph, table, figure). This was inefficient and error-prone.

## Solution
Element types are now explicitly marked in LaTeX and passed through the NDJSON, rather than being inferred from the role string in JavaScript.

## Changes Made

### 1. LaTeX Already Had Type Support
The `geom-marks.tex` package already supported a `type` parameter in `\geomemit`:
```latex
\def\geomemit#1#2#3{%% #1=id, #2=role, #3=type (para, table, figure, section, etc.)
```

And it was already being output to NDJSON:
```latex
\immediate\write\geomout{ {"id":"\gid","role":"\grole","type":"\gtype",...} }
```

Templates were already using it:
```latex
\geommarkinline{[[@id | raw]]}{P-start}{para}
\geommarkfloat{[[@id | raw]]}{TABLE-start}{table}
\geommarkfloat{[[@id | raw]]}{FIG-start}{figure}
```

### 2. JavaScript Now Uses Type Field

**Before (parsing role):**
```javascript
const isFloat = /TABLE|FIG/i.test(pos.role); // ❌ Parsing string
const isTable = startRecord.role && startRecord.role.includes('TABLE'); // ❌ Parsing string
```

**After (using type field):**
```javascript
const isFloat = pos.type === 'table' || pos.type === 'figure'; // ✅ Using type field
const isTable = startRecord.type === 'table'; // ✅ Using type field
const isParagraph = startRecord.type === 'para'; // ✅ Using type field
```

### 3. Script Now Reads LaTeX-Generated NDJSON First

**Before:**
- Always parsed `.aux` file
- Regenerated NDJSON without type info
- Had to infer type from role

**After:**
- Tries to read LaTeX-generated NDJSON first (which has `type` field)
- Falls back to `.aux` file only if NDJSON doesn't exist
- When falling back, infers and adds `type` field to the output

```javascript
// Try to read LaTeX-generated NDJSON first (which has type field)
let positions = readPositionsFromNdjson(ndjsonPath);

if (!positions || positions.length === 0) {
    // Fallback: Parse aux file if NDJSON doesn't exist
    positions = parseAuxFile(auxFile);
    generateNdjson(positions, ...); // Adds inferred type
    positions = readPositionsFromNdjson(ndjsonPath); // Re-read with type
}
```

### 4. Type Inference as Fallback

When parsing from `.aux` file (fallback mode), the type is inferred from role:

```javascript
let type = pos.type; // Use type if already available
if (!type) {
    // Fallback: infer from role
    if (/TABLE/i.test(pos.role)) type = 'table';
    else if (/FIG/i.test(pos.role)) type = 'figure';
    else if (/P-/i.test(pos.role)) type = 'para';
    else if (/SEC|TITLE/i.test(pos.role)) type = 'section';
    else type = 'unknown';
}
```

## Benefits

1. **✅ Cleaner Code**: JavaScript no longer parses strings to determine type
2. **✅ More Reliable**: Type is explicitly set in LaTeX templates
3. **✅ Extensible**: Easy to add new types without changing JavaScript
4. **✅ Single Source of Truth**: Type is determined in LaTeX where elements are defined
5. **✅ Better Performance**: Direct field access vs regex matching

## NDJSON Format

Each record now has explicit `type` field:

```json
{
  "id": "sec-p-005",
  "role": "P-start",
  "type": "para",
  "xsp": "3729359",
  "ysp": "23987694",
  "page": 1,
  ...
}

{
  "id": "table-fullpage",
  "role": "TABLE-start",
  "type": "table",
  "xsp": "3729359",
  "ysp": "18390024",
  "page": 2,
  ...
}

{
  "id": "fig-F1",
  "role": "FIG-start",
  "type": "figure",
  "xsp": "19972354",
  "ysp": "50719291",
  "page": 5,
  ...
}
```

## Supported Types

- `para` - Paragraph
- `table` - Table (floats and longtables)
- `figure` - Figure
- `section` - Section heading
- `title` - Title
- `unknown` - Fallback for unrecognized types

## Testing

Verified with both document types:

**ENDEND10921 (medical paper):**
```
Warning: Zero width for fig-F2 (type=figure), using default column width
Warning: Zero width for sec-p-031 (type=para, single-column para in two-column doc), using textwidth
✅ 67 marked boxes generated
```

**document.xml (sample with tables):**
```
Warning: Zero width for table-multipage (type=table, longtable), using textwidth
✅ 121 marked boxes generated
```

## Files Modified

1. **`scripts/external/sync_from_aux.js`**
   - Updated `main()` to read LaTeX-generated NDJSON first
   - Changed type detection from parsing `role` to using `type` field
   - Added type inference for fallback mode
   - Updated `generateNdjson()` to include `type` in output
   - Updated `calculateBoundingBox()` to use `type` field

## Migration

No migration needed! The change is backward compatible:
- LaTeX already outputs `type` field
- JavaScript uses `type` if available, falls back to parsing `role`
- Existing NDJSON files are automatically updated on next PDF generation

**Element types are now properly determined in LaTeX, not JavaScript!** 🎯

## Update: Type Field Now in marked-boxes.json

The `type` field is now included in the `marked-boxes.json` file that the UI uses, not just in the NDJSON.

### marked-boxes.json Format (Updated)

```json
[
  {
    "id": "sec-p-002",
    "type": "para",
    "page": 1,
    "x_pt": 56.91,
    "y_pt": 376.53,
    "w_pt": 483.7,
    "h_pt": 34.84,
    "x_mm": 20.08,
    "y_mm": 132.83,
    "w_mm": 170.64,
    "h_mm": 12.29,
    "x_px": 56.91,
    "y_px": 376.53,
    "w_px": 483.7,
    "h_px": 34.84
  },
  {
    "id": "table-fullpage",
    "type": "table",
    "page": 14,
    ...
  },
  {
    "id": "fig-F1_seg1of2",
    "type": "figure",
    "page": 5,
    ...
  }
]
```

### Changes Made

**Updated `calculateBoundingBox()` to include type:**
```javascript
return {
    id: startRecord.id,
    type: startRecord.type || 'unknown',  // ← Added this line
    page: startRecord.page,
    x_pt: Math.round(xPt * 100) / 100,
    ...
};
```

### UI Can Now Use Type

The UI overlay components can now directly use the `type` field from `marked-boxes.json` instead of inferring it from the ID or other properties:

```javascript
// ✅ Use type field directly
markedBoxes.forEach(box => {
    if (box.type === 'table') {
        // Handle table overlay
    } else if (box.type === 'figure') {
        // Handle figure overlay
    } else if (box.type === 'para') {
        // Handle paragraph overlay
    }
});
```

### Testing

Verified type field in marked-boxes.json:

```bash
# Paragraphs
jq '.[] | select(.type == "para") | {id, type}' \
  TeX/ENDEND10921-generated-marked-boxes.json

# Figures
jq '.[] | select(.type == "figure") | {id, type}' \
  TeX/ENDEND10921-generated-marked-boxes.json

# Tables
jq '.[] | select(.type == "table") | {id, type}' \
  TeX/document-generated-marked-boxes.json
```

All element types now properly include the `type` field from LaTeX through NDJSON to marked-boxes.json to UI! 🎯

## UI Integration Complete

Both UIs now use the `type` field from `marked-boxes.json` instead of inferring it from IDs or role strings.

### Vanilla JS UI (`ui/app.js`)

**Changes:**
- Added `data-type` attribute to overlay elements
- Added type-based CSS class (`overlay-${item.type}`)
- Updated tooltip to show type label

```javascript
// Create overlay element
const el = document.createElement("div");
el.className = "overlay-rect";
el.dataset.elemId = item.id;
el.dataset.id = item.id;
el.dataset.unit = selectedUnit.toUpperCase();

// Add type-based class for styling (type field from LaTeX via NDJSON)
if (item.type) {
  el.dataset.type = item.type;
  el.classList.add(`overlay-${item.type}`);
}

// Create informative title with type label
const displayCoords = getDisplayCoordinates(item, selectedUnit);
const typeLabel = item.type ? ` [${item.type}]` : '';
el.title = `${item.id}${typeLabel} - ${displayCoords}`;
```

### React UI (`ui-react/src/components/PDFViewer/OverlayLayer.jsx`)

**Changes:**
- Uses `overlay.type` directly instead of inferring from ID
- Added `data-type` attribute to overlay elements
- Updated color mapping to support LaTeX types (`para`, `table`, `figure`, `section`, `title`)
- Updated icon and label helpers to support LaTeX types

```javascript
// Use type field from LaTeX (via NDJSON), fallback to ID detection
const overlayType = overlay.type || detectOverlayType(overlay.id);

return (
  <div
    key={overlay.id || index}
    data-elem-id={overlay.id}
    data-type={overlayType}
    className={`overlay-box overlay-type-${overlayType} ...`}
    style={{
      backgroundColor: getOverlayColor(overlayType),
      ...
    }}
    title={`${getTypeLabel(overlayType)}: ${overlay.id}...`}
  >
    <div className="overlay-label">
      <span className="overlay-label-icon">{getTypeIcon(overlayType)}</span>
      <span className="overlay-label-type">{getTypeLabel(overlayType)}</span>
      ...
    </div>
  </div>
);
```

### Type-Based Styling

Both UIs now support CSS styling based on element type:

```css
/* Style different element types */
.overlay-para {
  border-color: blue !important;
}

.overlay-table {
  border-color: orange !important;
}

.overlay-figure {
  border-color: green !important;
}

/* Or use data attribute */
[data-type="para"] {
  opacity: 0.8;
}

[data-type="table"] {
  opacity: 0.9;
}
```

### Type Mapping

| LaTeX Type | Icon | Color | Label |
|-----------|------|-------|-------|
| `para` | 📝 | Blue | Para |
| `table` | 📊 | Orange | Table |
| `figure` | 🖼 | Green | Figure |
| `section` | 📑 | Purple | Section |
| `title` | 📋 | Purple | Title |
| `unknown` | 📄 | Red | Elem |

## Complete Data Flow

```
LaTeX Template
   ↓
\geommarkinline{id}{role}{type}  ← Type explicitly set
   ↓
TeX-lib/geom-marks.tex
   ↓
\geomemit writes NDJSON: {"id":"...", "role":"...", "type":"para", ...}
   ↓
scripts/external/sync_from_aux.js
   ↓
Reads NDJSON, preserves type field
   ↓
calculateBoundingBox() includes type in output
   ↓
marked-boxes.json: [{id:"...", type:"para", ...}, ...]
   ↓
UI reads marked-boxes.json
   ↓
Vanilla JS: el.dataset.type = item.type
React: const overlayType = overlay.type
   ↓
Type-based styling, icons, labels, colors
```

## Summary

✅ **LaTeX**: Type explicitly set in templates  
✅ **NDJSON**: Type field output by `\geomemit`  
✅ **JavaScript**: Type field preserved in processing  
✅ **marked-boxes.json**: Type field included in output  
✅ **UI**: Type field used for styling and display  

**Element types are now determined in LaTeX and used throughout the entire pipeline!** 🎯
