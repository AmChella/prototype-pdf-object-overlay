# PDF Object Overlay System

A comprehensive system for **XML-to-PDF conversion** with **precise coordinate extraction** and **interactive overlay visualization**. Transform XML documents into PDFs with accurate element positioning, then visualize and interact with the coordinates through a modern web interface.

[![Project Status](https://img.shields.io/badge/status-production--ready-brightgreen)]()
[![LaTeX](https://img.shields.io/badge/LaTeX-LuaLaTeX-blue)]()
[![Node.js](https://img.shields.io/badge/Node.js-23.x-green)]()

---

## 🎯 Key Features

- **📄 XML to PDF Pipeline**: Transform structured XML into professionally formatted PDFs
- **📍 Accurate Coordinates**: Extract precise element positions using zref-savepos
- **🎨 Modern Web UI**: Real-time processing with WebSocket updates
- **🔍 Interactive Overlays**: Visualize and interact with PDF elements
- **📊 Multi-page Support**: Handle complex documents with accurate page numbers
- **⚡ 3-Pass LaTeX**: Ensures accurate positioning, especially for floats
- **🔄 Live Updates**: WebSocket integration for real-time progress
- **🔀 Multi-Schema Support**: Auto-detects and adapts to different XML tag structures

---

## 🏗️ Architecture

```
prototype-pdf-object-overlay/
├── docs/                    # 📚 Documentation
│   ├── COORDINATE-ACCURACY-FIX.md       # Page number accuracy fix
│   ├── CODEBASE-OPTIMIZATION-SUMMARY.md # Optimization details
│   └── PROJECT-STRUCTURE.md             # Complete structure guide
├── scripts/                 # 🔧 Build Scripts
│   ├── generate-pdf-robust.sh          # Main PDF generation script
│   └── external/                        # Python utilities
│       ├── convert_ndjson_to_marked_boxes.py
│       ├── draw_bounding_boxes.py
│       └── validate_page_numbers.py
├── server/                  # 🖥️ Node.js Server
│   ├── server.js                       # Main server
│   ├── modules/                        # Server modules
│   │   ├── DocumentConverter.js        # Document processing
│   │   ├── ConfigManager.js            # Configuration
│   │   └── FileWatcher.js              # File monitoring
│   └── config/                         # Server config
├── src/                     # ⚙️ Core Engine
│   ├── cli.js                          # CLI interface
│   ├── engine.js                       # XML transformation engine
│   ├── pdf-geometry.js                 # Coordinate extraction
│   └── tex-to-pdf.js                   # LaTeX compilation
├── ui/                      # 🎨 Web Interface
│   ├── index.html                      # Main UI
│   └── app.js                          # UI logic
├── template/                # 📄 LaTeX Templates
│   ├── document.tex.xml                # Generic template
│   └── ENDEND10921-sample-style.tex.xml # Sample article style
├── TeX-lib/                 # 📚 LaTeX Libraries
│   └── geom-marks.tex                  # Coordinate marking system
├── xml/                     # 📑 Sample Documents
│   ├── document.xml
│   └── ENDEND10921.xml
└── images/                  # 🖼️ Document Assets
    └── LSA-99999_*.png
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Ensure LuaLaTeX is installed
which lualatex
# If not installed: brew install --cask mactex (macOS)
```

### Method 1: Web Interface (Recommended)

```bash
# Start the server
node server/server.js

# Open browser
open http://localhost:3000

# Use the UI to:
# 1. Select XML and template files
# 2. Generate PDF with coordinates
# 3. View overlays interactively
```

### Method 2: Command Line

```bash
# Generate PDF from XML
./scripts/generate-pdf-robust.sh \
  xml/ENDEND10921.xml \
  template/ENDEND10921-sample-style.tex.xml \
  my-output

# Output files:
# - TeX/my-output.pdf                  (PDF document)
# - TeX/my-output-texpos.ndjson        (Raw coordinates)
# - TeX/my-output-texpos-marked-boxes.json (Processed coordinates)
```

### Method 3: CLI Direct

```bash
# Step 1: XML to TeX
node src/cli.js xml/document.xml template/document.tex.xml -o output.tex

# Step 2: TeX to PDF (with coordinates)
node src/tex-to-pdf.js output.tex --geometry-json output-geometry.json
```

---

## 📖 Usage Guide

### Generating PDFs

The main script `generate-pdf-robust.sh` performs:

1. **XML Validation**: Checks XML structure
2. **XML → TeX Transform**: Applies XPath-based template
3. **TeX Processing**: Fixes math expressions and entities
4. **3-Pass LaTeX Compilation**:
   - Pass 1: Initial compilation
   - Pass 2: Update cross-references
   - Pass 3: Finalize coordinates (accurate page numbers)
5. **Coordinate Extraction**: Extracts element positions
6. **JSON Conversion**: Converts to marked-boxes format

**Example:**

```bash
./scripts/generate-pdf-robust.sh \
  xml/ENDEND10921.xml \
  template/ENDEND10921-sample-style.tex.xml \
  article-output
```

### Syncing Coordinates from AUX File

To ensure **perfect coordinate accuracy**, you can synchronize coordinates directly from the `.aux` file (the source of truth):

```bash
# Sync coordinates from aux file
make sync-aux AUX=TeX/ENDEND10921-generated.aux

# Or with custom output directory
make sync-aux AUX=TeX/document.aux OUTDIR=ui

# Direct script usage
node scripts/external/sync_from_aux.js TeX/document.aux
```

**Why sync from AUX?**
- The `.aux` file contains the exact coordinates (in scaled points) as computed by TeX
- Eliminates any lag from multi-pass compilation
- Ensures 100% accuracy between PDF and coordinate files
- Useful when coordinates seem misaligned or after manual aux file edits

See [AUX-SYNC-GUIDE.md](docs/AUX-SYNC-GUIDE.md) for detailed documentation.

### Server API

The server provides WebSocket-based real-time communication:

**Start Server:**
```bash
node server/server.js
# Server runs on http://localhost:3000
# WebSocket on ws://localhost:3000
```

**Server Features:**
- Real-time processing status updates
- File upload handling
- Document conversion orchestration
- Error reporting with full stdout/stderr capture

### Web UI Features

**Navigation:**
- Multi-page PDF viewing
- Page-by-page navigation (arrows, input, buttons)
- Zoom controls

**Overlays:**
- Toggle all overlays on/off
- Select individual overlays
- Color-coded by type (paragraph, figure, table)
- Hover for element details

**Processing:**
- Real-time progress modal
- Status updates from server
- Error display with full error messages
- Auto-load generated files

---

## 🔧 Configuration

### Server Configuration

Edit `server/config/server-config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "paths": {
    "xmlDir": "xml",
    "templateDir": "template",
    "outputDir": "TeX",
    "uiDir": "ui"
  },
  "latex": {
    "engine": "lualatex",
    "passes": 3
  }
}
```

### LaTeX Templates

Templates use **XPath selectors** to transform XML:

```xml
<!-- Example: template/document.tex.xml -->
<template>
  <para>
    <!-- Transform <p> elements to LaTeX paragraphs -->
    <xpath>article/body//p</xpath>
    <output>
      \paraid{{{@id}}}
      \geommarkinline{{{@id}}}{P-start}
      {{{.}}}
      \geommarkinline{{{@id}}}{P-end}
    </output>
  </para>
</template>
```

---

## 🔀 Multi-Schema XML Support

The system **automatically detects and adapts** to different XML tag structures!

### Supported Schemas

**ENDEND Schema** (ENDEND10921.xml):
```xml
<fig id="fig-F1">...</fig>
<p id="para-1">...</p>
```

**Standard Schema** (document.xml):
```xml
<figure id="figure-1">...</figure>
<para id="para-1">...</para>
```

### How It Works

1. **Auto-Detection**: System scans XML and detects which tags are present
2. **XPath Adaptation**: All XPath queries automatically converted to match schema
3. **Transparent**: No configuration needed - works automatically!

### Console Output

```
✅ XML document loaded: ENDEND10921.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
```

### Test Schema Detection

```bash
node scripts/test-schema-detection.js
```

**See:** [XML Schema Adaptation Guide](docs/XML-SCHEMA-ADAPTATION.md) for complete details.

---

## 📊 Coordinate System

### How It Works

1. **LaTeX Marks**: `\geommarkinline` and `\geommarkfloat` commands insert position markers
2. **zref-savepos**: Saves actual page numbers and positions to .aux file
3. **NDJSON Export**: Coordinates written during LaTeX compilation
4. **JSON Conversion**: NDJSON converted to marked-boxes format
5. **UI Display**: JSON loaded and overlays rendered

### Coordinate Accuracy

**Key Feature**: Uses **zref** for accurate page numbers, not LaTeX's page counter!

- ✅ Figures appear on correct pages (not all on page 1)
- ✅ Floats tracked accurately across pages
- ✅ Multi-page elements handled correctly
- ✅ 3-pass compilation ensures stability

**Coordinate Data Format:**

```json
[
  {
    "id": "sec-p-001",
    "page": 1,
    "page_source": "zref",
    "x_pt": 56.91,
    "y_pt": 441.59,
    "w_pt": 483.7,
    "h_pt": 30.88,
    "x_mm": 20.08,
    "y_mm": 155.78,
    "w_mm": 170.64,
    "h_mm": 10.89,
    "x_px": 56.91,
    "y_px": 441.59,
    "w_px": 483.7,
    "h_px": 30.88
  }
]
```

**Units Provided:**
- `pt` - Points (LaTeX standard)
- `mm` - Millimeters
- `px` - Pixels (72 DPI)

---

## 🛠️ Development

### Adding New Templates

1. Create template in `template/` directory
2. Define XPath selectors for XML elements
3. Specify LaTeX output format
4. Add geomarks for coordinate tracking
5. Test with sample XML

**Example:**

```xml
<figure>
  <xpath>article/body//fig</xpath>
  <output>
    \begin{figure}[ht]
      \geommarkfloat{{{@id}}}{FIG-start}
      \centering
      \includegraphics[width=0.8\textwidth]{{{graphic/@xlink:href}}}
      \caption{{{caption}}}
      \geommarkfloat{{{@id}}}{FIG-end}
    \end{figure}
  </output>
</figure>
```

### Modifying Coordinate Extraction

**LaTeX Side** (`TeX-lib/geom-marks.tex`):
```latex
% Inline mark for paragraphs
\def\geommarkinline#1#2{%
  \ifvmode
    \vspace{0pt}\zsavepos{gm:#1:#2}\geomemit{#1}{#2}%
  \else
    \vadjust{\zsavepos{gm:#1:#2}\geomemit{#1}{#2}}%
  \fi
}

% Float mark for figures/tables
\def\geommarkfloat#1#2{%
  \zsavepos{gm:#1:#2}%
  \label{geom:#1:#2}%
  \geomemit{#1}{#2}%
}
```

**Processing Side** (`scripts/external/convert_ndjson_to_marked_boxes.py`):
```python
def group_records_by_id(records):
    """Group by (id, page) to handle multi-page figures"""
    grouped = defaultdict(list)
    for record in records:
        key = (record['id'], record['page'])
        grouped[key].append(record)
    return grouped
```

### Extending UI

**Add New Overlay Types:**

1. Modify `ui/app.js` - add type detection in `detectOverlayType()`
2. Add color scheme in `getOverlayColor()`
3. Update rendering in `renderOverlays()`
4. Add UI controls if needed

---

## 📚 Documentation

Comprehensive guides available in `docs/`:

- **[PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)** - Complete project structure and component overview
- **[COORDINATE-ACCURACY-FIX.md](docs/COORDINATE-ACCURACY-FIX.md)** - How zref provides accurate page numbers
- **[CODEBASE-OPTIMIZATION-SUMMARY.md](docs/CODEBASE-OPTIMIZATION-SUMMARY.md)** - Optimization and cleanup details
- **[UI-REDESIGN.md](docs/UI-REDESIGN.md)** - Modern UI design documentation
- **[OVERLAY_TOGGLE_FEATURE.md](docs/OVERLAY_TOGGLE_FEATURE.md)** - Overlay feature documentation

---

## 🐛 Troubleshooting

### PDF Generation Issues

**Error: LaTeX compilation failed**
```bash
# Check the log file
cat TeX/[output-name].log

# Verify LaTeX installation
which lualatex
lualatex --version
```

**Error: Inaccurate page numbers**
- Ensure 3-pass compilation is enabled
- Check `page_source` in JSON (should be "zref", not "counter")
- Run script with full path: `./scripts/generate-pdf-robust.sh`

### Coordinate Issues

**Overlays misaligned:**
1. Check PDF coordinate origin (PDF uses bottom-left)
2. Verify JSON file loaded correctly
3. Check browser console for errors
4. Use browser dev tools to inspect overlay positions

**Missing coordinates:**
- Verify `\geommarkinline` or `\geommarkfloat` in template
- Check NDJSON file was created
- Ensure zref-savepos package loaded

### Server Issues

**Port already in use:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port in server-config.json
```

**WebSocket not connecting:**
- Check browser console for WebSocket errors
- Verify server is running: `curl http://localhost:3000`
- Check firewall settings

---

## 🚦 Testing

### Test PDF Generation

```bash
# Test basic generation
./scripts/generate-pdf-robust.sh \
  xml/document.xml \
  template/document.tex.xml \
  test-output

# Verify outputs
ls -lh TeX/test-output*

# Check page numbers
grep -o '"page":[0-9]*' TeX/test-output-texpos.ndjson | sort | uniq -c
```

### Test Server

```bash
# Start server
node server/server.js &

# Test HTTP
curl http://localhost:3000

# Test WebSocket (requires wscat)
npm install -g wscat
wscat -c ws://localhost:3000

# Stop server
kill %1
```

### Test UI

1. Open http://localhost:3000
2. Open browser console (F12)
3. Check for JavaScript errors
4. Test file upload
5. Generate PDF and verify auto-load
6. Test overlay toggling

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

[Add your license information here]

---

## 🙏 Acknowledgments

- **LuaLaTeX** - PDF generation engine
- **zref-savepos** - Accurate coordinate system
- **PDF.js** - PDF rendering in browser
- **Node.js** - Server runtime
- **WebSocket** - Real-time communication

---

## 📞 Support

For issues and questions:

1. Check `docs/` directory for detailed guides
2. Review troubleshooting section above
3. Check server logs: `server/logs/audit.log`
4. Open an issue on GitHub

---

## 🎯 Quick Reference

```bash
# Generate PDF
./scripts/generate-pdf-robust.sh xml/file.xml template/style.tex.xml output

# Start server
node server/server.js

# Run CLI
node src/cli.js xml/input.xml template/style.tex.xml -o output.tex

# Convert TeX to PDF
node src/tex-to-pdf.js input.tex

# Access UI
open http://localhost:3000
```

---

**Built with ❤️ for precise PDF coordinate extraction and visualization**
