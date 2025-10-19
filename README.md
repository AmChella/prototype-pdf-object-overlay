# PDF Overlay Coordinate System

A comprehensive system for generating PDFs with coordinate tracking and creating interactive web-based overlays.

## 🎯 Features

- **Single-Command Build**: Generate PDF and JSON coordinates in one run
- **Visual Markers**: PDF includes visual coordinate markers for verification
- **Interactive UI**: Web-based overlay testing with multiple coordinate systems
- **Auto-Detection**: Automatic coordinate origin detection (top-left vs bottom-left)
- **Multiple Formats**: Support for points, pixels, and millimeters
- **Page Navigation**: Multi-page PDF support with navigation controls
- **File Upload**: Drag & drop or upload PDF and JSON files
- **Build Reports**: Detailed build logs and statistics

## 🏗️ Project Structure

```
PDFOverlay/
├── TeX/                          # LaTeX source files
│   ├── MultiColumn-CS-working.tex          # Original document
│   ├── MultiColumn-CS-working-marked.tex   # Enhanced with visual markers
│   └── test.jpeg                           # Sample image
├── ui/                           # Web interface
│   ├── index.html               # Main HTML interface
│   ├── app.js                   # JavaScript application
│   └── *.json                   # Coordinate data files
├── build_pdf_json.py            # Python build script
├── build.sh                     # Shell script wrapper
├── Makefile                     # Make-based build system
└── package.json                 # NPM scripts
```

## 🚀 Quick Start

### Method 1: Shell Script (Recommended)
```bash
# Build with visual markers
./build.sh

# Build specific file
./build.sh my-document.tex

# Build without copying to UI
./build.sh -k

# Show help
./build.sh -h
```

### Method 2: Python Script
```bash
# Build default file
python3 build_pdf_json.py

# Build specific file
python3 build_pdf_json.py my-document.tex

# Advanced options
python3 build_pdf_json.py --no-copy --no-clean my-document.tex
```

### Method 3: Make
```bash
# Build default
make

# Build specific file
make FILE=my-document.tex

# Clean and test
make clean
make test
```

### Method 4: NPM Scripts
```bash
# Build with markers
npm run build:marked

# Build original
npm run build:original

# Start development server
npm run serve

# Build and test
npm run dev
```

## 📝 Creating LaTeX Documents with Coordinates

### Basic Setup
```latex
\documentclass{article}
\usepackage[a4paper,margin=1in]{geometry}
\usepackage{luacode}

% Include the coordinate tracking system
\begin{luacode*}
boxes = boxes or {}

function store_coords(id, page, x_pt, y_pt, w_pt, h_pt)
  boxes[id] = { page=page, x_pt=x_pt, y_pt=y_pt, w_pt=w_pt, h_pt=h_pt }
end

% JSON export function here...
\end{luacode*}
```

### Marking Elements
```latex
% Store coordinates manually
\directlua{store_coords("my-element", 1, 72, 650, 221, 180)}

% Or use the enhanced template with visual markers
\markpara{para:intro}{1}{72}{650}{221}{180}
\marktable{table:demo}{1}{320}{200}{80}{60}
\markfigure{fig:sample}{1}{300}{450}{221}{166}
```

### Visual Markers
The enhanced template (`MultiColumn-CS-working-marked.tex`) includes:
- **Red dashed rectangles** showing coordinate boundaries
- **Element labels** with IDs
- **Coordinate reference grid** on page 2

## 🌐 Web Interface Usage

### Starting the Server
```bash
# Python built-in server
python3 -m http.server 8000

# Or use the build script
./build.sh  # Automatically starts if needed
```

### Testing Coordinates
1. **Open**: `http://localhost:8000/ui/`
2. **Load PDF**: Upload or select from dropdown
3. **Load JSON**: Upload coordinate file or select predefined
4. **Verify**: Overlays should align with PDF content

### Coordinate System Issues
If overlays appear upside down:
1. Click **"🎯 Auto-Detect Origin"**
2. Or manually switch between **"Top-Left"** and **"Bottom-Left"** origins
3. Use **"🔍 Analyze Coordinates"** for recommendations

### Navigation
- **Arrow Keys**: Navigate between pages
- **Page Input**: Jump to specific page
- **Mouse**: Click navigation buttons

## 🔧 Build System Features

### Automatic Processing
- **Dependency Check**: Verifies lualatex and python3
- **Two-Pass Compilation**: Ensures proper cross-references
- **JSON Validation**: Checks coordinate data integrity
- **File Copying**: Automatically copies files to UI directory
- **Build Reports**: Generates detailed build statistics

### Output Files
After building `MultiColumn-CS-working-marked.tex`:
```
TeX/
├── MultiColumn-CS-working-marked.pdf           # PDF with visual markers
├── MultiColumn-CS-working-marked-boxes.json   # Coordinate data
└── MultiColumn-CS-working-marked-build-report.json # Build statistics

ui/
├── MultiColumn-CS-working-marked.pdf           # Copy for testing
└── MultiColumn-CS-working-marked-boxes.json   # Copy for testing
```

### Coordinate Data Format
```json
[
  {
    "id": "para:intro",
    "page": 1,
    "x_pt": 72.00, "y_pt": 650.00, "w_pt": 221.00, "h_pt": 180.00,
    "x_mm": 25.40, "y_mm": 229.31, "w_mm": 77.96, "h_mm": 63.50,
    "x_px": 96.00, "y_px": 866.67, "w_px": 294.67, "h_px": 240.00
  }
]
```

## 🛠️ Advanced Usage

### Custom LaTeX Documents

1. **Copy** the coordinate tracking Lua code from the template
2. **Add** `\directlua{store_coords("id", page, x, y, w, h)}` calls
3. **Build** using any of the provided methods
4. **Test** in the web interface

### Coordinate System Notes

- **PDF Standard**: Uses bottom-left origin (0,0 at bottom-left)
- **Many Tools**: Generate top-left origin coordinates
- **Auto-Detection**: Automatically handles both systems
- **Visual Verification**: Use markers to verify alignment

### Troubleshooting

**Overlays misaligned?**
- Try auto-detection: Click "🎯 Auto-Detect Origin"
- Check coordinate origin setting
- Use debug tools: "🐛 Debug" and "🔍 Analyze"

**Build fails?**
- Ensure lualatex is installed
- Check TeX file syntax
- Review build logs in terminal

**No coordinates generated?**
- Verify `\directlua{store_coords(...)}` calls
- Check JSON file was created
- Review build report for errors

## 📊 Build System Comparison

| Method | Best For | Features |
|--------|----------|----------|
| `./build.sh` | General use | Colored output, status checks |
| `python3 build_pdf_json.py` | Automation | Detailed logging, JSON reports |
| `make` | Traditional workflows | Standard Make targets |
| `npm run` | Node.js projects | Package.json integration |

## 🎯 Coordinate Accuracy Tips

1. **Use Visual Markers**: The marked template shows exact coordinate boundaries
2. **Test Multiple Origins**: Try both top-left and bottom-left coordinate systems
3. **Verify on Page 2**: Reference grid helps validate coordinate calculations
4. **Use Debug Tools**: Built-in analysis helps identify coordinate issues
5. **Check Units**: Ensure consistent units between LaTeX and JSON

## 📁 Generated Files Explained

- **`.pdf`**: LaTeX-generated document with optional visual markers
- **`-boxes.json`**: Coordinate data in multiple units (pt, mm, px)
- **`-build-report.json`**: Build statistics and file information
- **`.log`**: LaTeX compilation log
- **`.aux`**: LaTeX auxiliary files (auto-cleaned)

This system provides a complete workflow from LaTeX document creation to interactive web-based coordinate verification!