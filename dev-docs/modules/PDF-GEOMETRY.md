# 📍 PDF Geometry Module (pdf-geometry.js)

The **PDF Geometry** module extracts precise element positions from compiled PDFs using coordinate data from LaTeX's `zref-savepos` system.

---

## 📋 Overview

**File**: `src/pdf-geometry.js`  
**Purpose**: Extract and process coordinate data from PDFs  
**Dependencies**: `pdfjs-dist`, `fs`, built on LaTeX `zref-savepos`

### Key Responsibilities
- Parse `.aux` files for zref coordinate markers
- Process NDJSON coordinate data
- Extract text and element positions from PDFs
- Calculate bounding boxes for elements
- Handle multi-page and multi-column layouts
- Generate final geometry JSON

---

## 🏗️ Coordinate Extraction Pipeline

```
LaTeX Source with \saveTextPos markers
    ↓
LuaLaTeX Compilation
    ↓
.aux file (zref@newlabel data)
    ↓
Parse .aux → Extract coordinates
    ↓
.ndjson file (raw coordinate pairs)
    ↓
Process NDJSON → Calculate bounds
    ↓
.json file (final geometry with bounding boxes)
```

---

## 📐 Coordinate System

### LaTeX Coordinates

LaTeX uses **absolute positioning** from bottom-left corner of page:

```
(0, 0) = Bottom-left corner
X increases → Right
Y increases → Up
```

### PDF/Screen Coordinates

PDFs use **top-left origin**:

```
(0, 0) = Top-left corner
X increases → Right  
Y increases → Down
```

### Conversion

```javascript
// LaTeX Y → PDF Y
pdfY = pageHeight - latexY;

// Example: Page height = 792pt
// LaTeX Y = 720pt → PDF Y = 72pt (72pt from top)
```

---

## 🔧 LaTeX Marker System

### Saving Positions

In LaTeX templates or `geom-marks.tex`:

```tex
\saveTextPos{element-id}{start}
Content here
\saveTextPos{element-id}{end}
```

**Example**:
```tex
\saveTextPos{para-1}{start}
This is a paragraph with some text content.
\saveTextPos{para-1}{end}
```

### Generated .aux File

```tex
\zref@newlabel{para-1-start}{\default{}{}\page{1}\abspage{1}\posx{7227400}\posy{50934386}}
\zref@newlabel{para-1-end}{\default{}{}\page{1}\abspage{1}\posx{23422817}\posy{50934386}}
```

**Fields**:
- `\page{1}` - Logical page number
- `\abspage{1}` - Absolute page number
- `\posx{...}` - X position in sp units (1sp = 1/65536 pt)
- `\posy{...}` - Y position in sp units

---

## 📊 Data Formats

### NDJSON Format (intermediate)

**File**: `TeX/document-generated-texpos.ndjson`

```json
{"id":"para-1-start","page":1,"x":72.0,"y":720.0}
{"id":"para-1-end","page":1,"x":288.0,"y":720.0}
{"id":"fig-1-start","page":1,"x":72.0,"y":500.0}
{"id":"fig-1-end","page":1,"x":288.0,"y":400.0}
```

**Fields**:
- `id` - Element ID with `-start` or `-end` suffix
- `page` - Page number
- `x` - X coordinate in points
- `y` - Y coordinate in points (from bottom)

---

### Geometry JSON Format (final)

**File**: `TeX/document-generated-geometry.json`

```json
{
  "para-1": {
    "page": 1,
    "bounds": {
      "left": 72.0,
      "top": 72.0,
      "width": 216.0,
      "height": 20.0,
      "right": 288.0,
      "bottom": 92.0
    },
    "type": "paragraph",
    "coords": {
      "start": {"x": 72.0, "y": 720.0},
      "end": {"x": 288.0, "y": 720.0}
    }
  },
  "fig-1": {
    "page": 1,
    "bounds": {
      "left": 72.0,
      "top": 292.0,
      "width": 216.0,
      "height": 100.0,
      "right": 288.0,
      "bottom": 392.0
    },
    "type": "figure"
  }
}
```

**Bounding Box Fields**:
- `left` - Left edge (X from left)
- `top` - Top edge (Y from top)
- `width` - Width of element
- `height` - Height of element
- `right` - Right edge (`left + width`)
- `bottom` - Bottom edge (`top + height`)

---

## 🔍 Extraction Process

### 1. Parse .aux File

```javascript
// Regex to extract zref labels
const zrefPattern = /\\zref@newlabel\{([^}]+)\}\{[^}]*\\page\{(\d+)\}[^}]*\\posx\{(\d+)\}[^}]*\\posy\{(\d+)\}/g;

// Extract coordinates
while ((match = zrefPattern.exec(auxContent)) !== null) {
    const id = match[1];
    const page = parseInt(match[2]);
    const posX = parseInt(match[3]) / 65536; // Convert sp to pt
    const posY = parseInt(match[4]) / 65536;
    
    coordinates.push({ id, page, x: posX, y: posY });
}
```

---

### 2. Process Start/End Pairs

```javascript
// Group by element ID
const elements = {};
coordinates.forEach(coord => {
    const baseId = coord.id.replace(/-(start|end)$/, '');
    if (!elements[baseId]) {
        elements[baseId] = {};
    }
    
    if (coord.id.endsWith('-start')) {
        elements[baseId].start = coord;
    } else if (coord.id.endsWith('-end')) {
        elements[baseId].end = coord;
    }
});
```

---

### 3. Calculate Bounding Boxes

```javascript
// For each element with start/end
Object.keys(elements).forEach(id => {
    const elem = elements[id];
    if (!elem.start || !elem.end) return;
    
    // Calculate bounds
    const left = Math.min(elem.start.x, elem.end.x);
    const right = Math.max(elem.start.x, elem.end.x);
    const top = pageHeight - Math.max(elem.start.y, elem.end.y);
    const bottom = pageHeight - Math.min(elem.start.y, elem.end.y);
    
    geometry[id] = {
        page: elem.start.page,
        bounds: {
            left: left,
            top: top,
            width: right - left,
            height: bottom - top,
            right: right,
            bottom: bottom
        }
    };
});
```

---

## 📏 Multi-Column Support

### Column Detection

Elements spanning columns are detected and split:

```javascript
// Detect if element spans multiple columns
const columnWidth = pageWidth / 2;
if (elem.width > columnWidth * 1.5) {
    // Split into column segments
    const leftCol = {
        left: elem.left,
        right: columnWidth,
        top: elem.top,
        bottom: elem.bottom
    };
    const rightCol = {
        left: columnWidth,
        right: elem.right,
        top: elem.top,
        bottom: elem.bottom
    };
}
```

---

### Figure Avoidance

Paragraphs wrapping around figures have overlays split to exclude figure areas:

```javascript
// If paragraph overlaps with figure
if (overlaps(paragraph, figure)) {
    // Split paragraph overlay to exclude figure
    const segments = splitAroundFigure(paragraph, figure);
    // Returns multiple non-overlapping segments
}
```

---

## 🧪 Testing Coordinate Extraction

### Manual Testing

```bash
# Generate PDF with coordinates
node src/cli.js --input xml/document.xml --template template/document.tex.xml

# Check .aux file
cat TeX/document-generated.aux | grep zref

# Check NDJSON
cat TeX/document-generated-texpos.ndjson

# Check final geometry
cat TeX/document-generated-geometry.json | jq
```

---

### Validate Coordinates

```bash
# Use Python validation script
python3 scripts/external/validate_page_numbers.py \
  TeX/document-generated-texpos.ndjson \
  TeX/document-generated.pdf
```

---

### Visual Verification

```bash
# Draw bounding boxes on PDF
python3 scripts/external/draw_bounding_boxes.py \
  TeX/document-generated.pdf \
  TeX/document-generated-geometry.json \
  output-with-boxes.pdf
```

---

## 🐛 Common Issues

### Issue 1: Missing Coordinates

**Symptom**: Some elements have no coordinates in output

**Causes**:
- Markers not placed in LaTeX
- Element ID mismatch
- LaTeX compilation failed

**Solution**:
```bash
# Check .aux file for markers
grep "zref@newlabel{your-element-id" TeX/document-generated.aux

# Check LaTeX log
cat TeX/document-generated.log | grep -i error
```

---

### Issue 2: Incorrect Page Numbers

**Symptom**: Coordinates on wrong page

**Causes**:
- Float positioning issues
- Need 3-pass compilation

**Solution**:
```javascript
// Ensure 3-pass compilation in tex-to-pdf.js
await compileLatex(texFile); // Pass 1
await compileLatex(texFile); // Pass 2  
await compileLatex(texFile); // Pass 3 - Final positions
```

---

### Issue 3: Coordinate Offset

**Symptom**: Coordinates are shifted

**Causes**:
- Wrong page height
- Coordinate system mismatch
- Margin/padding issues

**Solution**:
```javascript
// Verify page dimensions
const pageHeight = 792; // Letter size in points
const pageWidth = 612;

// Check conversion
console.log('LaTeX Y:', latexY);
console.log('PDF Y:', pageHeight - latexY);
```

---

## 🔧 Extending Coordinate Extraction

### Add New Marker Type

```tex
% In geom-marks.tex
\newcommand{\saveCustomPos}[2]{%
  \zref@savepos
  \zref@labelbyprops{#1-#2}{page,abspage,posx,posy}%
}
```

### Custom Processing

```javascript
// In pdf-geometry.js
function processCustomElements(coordinates) {
    // Custom processing logic
    const customElements = coordinates.filter(c => 
        c.id.startsWith('custom-')
    );
    
    // Process and return geometry
    return customElements.map(elem => ({
        id: elem.id,
        page: elem.page,
        // ... custom calculations
    }));
}
```

---

## 📚 Related Documentation

- [Coordinate System Guide](../guides/COORDINATE-SYSTEM.md)
- [TeX to PDF Module](./TEX-TO-PDF.md)
- [Coordinate Extraction Workflow](../workflows/COORDINATE-EXTRACTION.md)
- [LaTeX geom-marks.tex](../../TeX-lib/geom-marks.tex)

---

## 📊 Performance

### Typical Processing Times

- Parse .aux file: ~10ms
- Process NDJSON: ~20ms
- Calculate geometry: ~50ms
- Total: ~100ms (for typical document)

### Optimization Tips

1. **Cache Results**: Cache geometry for unchanged documents
2. **Batch Processing**: Process multiple elements together
3. **Lazy Loading**: Only extract coordinates when needed
4. **Parallel Processing**: Process pages in parallel for large documents

---

**Last Updated**: November 3, 2025

