# Project Structure

## Overview

This project provides a system for XML-to-PDF conversion with precise coordinate extraction and overlay visualization.

## Directory Structure

```
prototype-pdf-object-overlay/
├── docs/                           # 📚 Documentation
│   ├── COORDINATE-ACCURACY-FIX.md  # Fix for accurate page numbers
│   ├── OVERLAY_TOGGLE_FEATURE.md   # Overlay toggle documentation
│   ├── UI-REDESIGN.md              # UI redesign notes
│   ├── UI-COMPARISON.md            # Before/after UI comparison
│   ├── BUGFIX-*.md                 # Various bug fix documentation
│   ├── README-SOLUTION.md          # Solution documentation
│   └── PROJECT_SUMMARY.json        # Project metadata
│
├── scripts/                        # 🔧 Utility Scripts
│   ├── generate-pdf-robust.sh      # Main PDF generation script (3-pass LaTeX)
│   └── external/                   # Python utility scripts
│       ├── build_pdf_json.py       # PDF JSON builder
│       ├── convert_ndjson_to_marked_boxes.py  # NDJSON to JSON converter
│       ├── draw_bounding_boxes.py  # Visual debugging tool
│       ├── draw_ndjson_marks.py    # NDJSON visualization
│       └── validate_page_numbers.py # Page number validation
│
├── server/                         # 🖥️ Node.js Server
│   ├── server.js                   # Main server entry point
│   ├── modules/                    # Server modules
│   │   ├── ConfigManager.js        # Configuration management
│   │   ├── DocumentConverter.js    # Document conversion orchestration
│   │   ├── FileWatcher.js          # File system watcher
│   │   └── XMLProcessor.js         # XML processing
│   ├── config/                     # Server configuration
│   │   └── server-config.json      # Server settings
│   └── logs/                       # Server logs (gitignored)
│       └── audit.log
│
├── src/                            # ⚙️ Core Transformation Engine
│   ├── cli.js                      # Command-line interface
│   ├── engine.js                   # XML transformation engine
│   ├── pdf-geometry.js             # PDF coordinate extraction
│   └── tex-to-pdf.js               # LaTeX to PDF compilation
│
├── ui/                             # 🎨 Web Interface
│   ├── index.html                  # Main UI HTML
│   └── app.js                      # UI JavaScript
│
├── template/                       # 📄 LaTeX Templates
│   ├── document.tex.xml            # Generic document template
│   ├── ENDEND10921-sample-style.tex.xml  # Sample style template
│   └── main.tex.xml                # Main template
│
├── TeX-lib/                        # 📚 LaTeX Libraries
│   └── geom-marks.tex              # Geometry marker package (zref-based)
│
├── xml/                            # 📑 Sample XML Documents
│   ├── document.xml                # Sample document
│   ├── ENDEND10921.xml             # Sample article
│   ├── example.xml                 # Example XML
│   ├── BBREP_41021.xml             # Another sample
│   └── TNQ1580368500270.xml        # Another sample
│
├── images/                         # 🖼️ Document Images
│   └── LSA-99999_*.png             # Sample images (PNG format)
│
├── TeX/                            # 📦 Generated LaTeX/PDF (gitignored)
│   ├── *.tex                       # Generated LaTeX files
│   ├── *.pdf                       # Generated PDFs
│   ├── *.ndjson                    # Coordinate data
│   └── *.json                      # Processed coordinates
│
├── fix-math-body-only.js           # 🔧 Active math expression fixer
├── Makefile                        # 🔨 Build automation
├── package.json                    # 📦 Node.js dependencies
├── .gitignore                      # 🚫 Git ignore rules
├── PROJECT-STRUCTURE.md            # 📖 This file
└── README.md                       # 📘 Main documentation
```

## Key Components

### 1. PDF Generation Pipeline

**Entry Point**: `scripts/generate-pdf-robust.sh`

**Flow**:
1. XML → TeX (using `src/cli.js` + `src/engine.js`)
2. TeX Processing (using `fix-math-body-only.js`)
3. LaTeX → PDF (3 passes for accurate page numbers)
4. Coordinate Extraction (using zref-savepos)
5. NDJSON → JSON conversion

**Key Feature**: Uses zref for accurate page numbers, especially for floats (figures, tables)

### 2. Server Architecture

**Entry Point**: `server/server.js`

**Modules**:
- **ConfigManager**: Handles server configuration
- **DocumentConverter**: Orchestrates XML→TeX→PDF pipeline
- **FileWatcher**: Monitors file changes
- **XMLProcessor**: XML transformation logic

**API**: WebSocket-based real-time communication with UI

### 3. Coordinate System

**Technology**: LaTeX zref-savepos + custom extraction

**Files**:
- `TeX-lib/geom-marks.tex` - LaTeX macros for position marking
- `src/pdf-geometry.js` - PDF.js-based coordinate extraction
- `src/tex-to-pdf.js` - LaTeX compilation + coordinate processing

**Format**: NDJSON → marked-boxes JSON with:
- Page number (accurate via zref)
- X/Y coordinates (in pt, mm, px)
- Width/Height
- Element ID and role

### 4. Web Interface

**Entry Point**: `ui/index.html`

**Features**:
- PDF viewer with coordinate overlays
- Real-time processing status
- Multi-page navigation
- Overlay toggle and selection
- WebSocket integration for live updates

## Build & Run

### Prerequisites
```bash
npm install
# LuaLaTeX must be installed
```

### Generate PDF
```bash
./scripts/generate-pdf-robust.sh xml/ENDEND10921.xml template/ENDEND10921-sample-style.tex.xml ENDEND10921
```

### Start Server
```bash
node server/server.js
# Access UI at http://localhost:3000
```

### CLI Mode
```bash
node src/cli.js xml/document.xml template/document.tex.xml -o output.tex
node src/tex-to-pdf.js output.tex
```

## Removed Files (Cleanup)

### Duplicate/Obsolete Scripts
- `fix-math-expressions.js`, `fix-math-final.js`, `fix-math-minimal.js`, etc. (7 files)
- `generate-pdf.sh` (replaced by `generate-pdf-robust.sh`)
- `build.sh`, `convert_all_ndjson.sh`

### Test/Example Files
- `ui/index-old.html`, `ui/test-toggle.html`, `ui/test.html`
- `src/sample.js`, `src/test-tex-engine.js`
- `test-documentconverter.js`, `test-integration.js`

### One-time Utilities
- `add-xml-ids.js`, `transform-sample-style.js`
- `create_project_summary.py`, `create_simple_tex.py`
- `extract_pdf_coordinates.py`, `fix_tex_issues.py`, `format_tex.py`

### Old Assets
- `assets/` directory
- `elsevier-styles.zip`
- `images/*.tif` (converted to PNG)
- `xml/document copy.xml`

## Configuration

### Server Config
`server/config/server-config.json`

### LaTeX Templates
`template/*.tex.xml` - XPath-based transformation templates

### Git Ignore
`.gitignore` - Excludes generated files, build artifacts, logs

## Development

### Adding New Templates
1. Create template in `template/`
2. Define XPath selectors and LaTeX output
3. Test with sample XML

### Modifying Coordinate Extraction
1. Update `TeX-lib/geom-marks.tex` for LaTeX side
2. Update `src/pdf-geometry.js` or `scripts/external/convert_ndjson_to_marked_boxes.py` for processing

### Extending UI
1. Modify `ui/index.html` for structure
2. Update `ui/app.js` for functionality
3. Server integration via WebSocket messages

## Troubleshooting

### Inaccurate Page Numbers
- Ensure 3-pass LaTeX compilation
- Check `page_source` in JSON (should be "zref", not "counter")
- Run LaTeX 3 times for floats to stabilize

### Missing Coordinates
- Check NDJSON file exists
- Verify zref-savepos package is loaded
- Ensure `\geommarkinline` or `\geommarkfloat` in template

### Server Issues
- Check logs in `server/logs/audit.log`
- Verify port 3000 is available
- Ensure WebSocket connection is established

## License

[Add license information]

## Contributors

[Add contributor information]

