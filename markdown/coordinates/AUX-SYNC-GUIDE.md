# AUX File Synchronization Guide

## Overview

This guide explains how to synchronize coordinates from the `.aux` file to ensure perfect accuracy in the NDJSON and marked-boxes.json files.

## Why Synchronize from AUX?

The `.aux` file is the **source of truth** for coordinates because:

1. **Precision**: The aux file contains the exact coordinates (in scaled points) as computed by TeX during compilation
2. **Final Values**: These are the coordinates from the last successful LaTeX run
3. **No Rounding**: The values are stored in their original precision (scaled points)

During normal LaTeX compilation:
- The `geom-marks.tex` package writes coordinates to NDJSON during compilation
- These coordinates come from the **previous** run's aux file
- If you make changes and recompile, there may be a lag of one compilation cycle

The `sync_from_aux.js` script **directly reads** the aux file and regenerates the coordinate files, ensuring they always match the latest aux file values.

## Usage

### Basic Usage

```bash
node scripts/external/sync_from_aux.js <aux-file>
```

This will:
- Read coordinates from the aux file
- Generate/update the NDJSON file in the same directory
- Generate/update the marked-boxes.json file in the same directory

### Advanced Options

```bash
# Specify output directory
node scripts/external/sync_from_aux.js TeX/document.aux --output-dir ui

# Specify custom job name
node scripts/external/sync_from_aux.js TeX/document.aux --job-name my-document

# Force overwrite without prompting
node scripts/external/sync_from_aux.js TeX/document.aux --force
```

### Using Make

The script is integrated into the Makefile:

```bash
# Sync coordinates from aux file
make sync-aux AUX=TeX/ENDEND10921-generated.aux

# Or with output directory
make sync-aux AUX=TeX/ENDEND10921-generated.aux OUTDIR=ui
```

## How It Works

### 1. Parse AUX File

The script reads the aux file and extracts lines like:
```tex
\zref@newlabel{gm:sec-p-002:P-start}{\posx{3729359}\posy{30964035}\page{1}}
```

This contains:
- `id`: sec-p-002
- `role`: P-start
- `xsp`: 3729359 (x coordinate in scaled points)
- `ysp`: 30964035 (y coordinate in scaled points)
- `page`: 1

### 2. Handle Duplicates

If the same coordinate appears multiple times in the aux file (due to multiple LaTeX runs), the script keeps the **last occurrence**, which is the most recent and accurate.

### 3. Generate NDJSON

The script generates NDJSON with the exact coordinates from the aux file:

```json
{"id":"sec-p-002","role":"P-start","xsp":"3729359","ysp":"30964035",...}
```

### 4. Generate Marked Boxes

The script calculates bounding boxes from start/end pairs and converts coordinates:

- **Scaled Points to Points**: 1 pt = 65536 sp
  - Example: 3729359 sp ÷ 65536 = 56.91 pt

- **TeX Y to PDF Y**: PDF uses bottom-left origin, TeX uses top-left
  - PDF Y = Page Height - TeX Y
  - Example: 845.05 pt - 472.47 pt = 372.58 pt

- **Additional Units**: Converts to mm and px for convenience
  - 1 pt = 0.352778 mm
  - 1 pt = 1 px (at 72 DPI)

## Coordinate Systems

### TeX Coordinates (in aux file)
- Origin: Top-left corner of page
- X: Increases to the right
- Y: Increases downward
- Units: Scaled points (sp)

### PDF Coordinates (in marked-boxes.json)
- Origin: Bottom-left corner of page
- X: Increases to the right
- Y: Increases upward
- Units: Points (pt), millimeters (mm), pixels (px)

## Verification

To verify coordinates match the aux file:

```bash
# Show aux coordinates
grep 'gm:sec-p-002' TeX/ENDEND10921-generated.aux

# Show NDJSON coordinates
grep 'sec-p-002' TeX/ENDEND10921-generated-texpos.ndjson

# Show marked-boxes coordinates
grep -A 10 'sec-p-002' TeX/ENDEND10921-generated-marked-boxes.json
```

Example verification:
```
AUX:  \posx{3729359}\posy{30964035}\page{1}
NDJSON: "xsp":"3729359","ysp":"30964035","page":1
BOXES:  "x_pt": 56.91, "y_pt": 372.57

Calculation:
- X: 3729359 ÷ 65536 = 56.91 pt ✓
- Y: (30964035 ÷ 65536) = 472.47 pt
- PDF Y: 845.05 - 472.47 = 372.58 pt ≈ 372.57 pt ✓
```

## Troubleshooting

### Missing Start or End Records

If you see warnings like:
```
Warning: Incomplete pair for sec-p-021 on page 5 (missing end)
```

This usually means:
- The element spans multiple pages (start on one page, end on another)
- The LaTeX run was incomplete
- The element only has a start marker (e.g., a figure reference)

**Solution**: These warnings are usually harmless for multi-page elements. If concerning, rerun LaTeX 2-3 times to ensure all references are resolved.

### Duplicate Records Removed

If you see:
```
Found 123 position records in aux file (duplicates removed)
```

This is normal! The aux file may contain multiple entries from different LaTeX runs. The script keeps only the last (most accurate) occurrence.

### No Position Data Found

If you get:
```
Error: No position data found in aux file
```

This means:
- The LaTeX document doesn't use `geom-marks.tex` package
- The aux file is from a different/older run
- The LaTeX compilation failed before writing coordinates

**Solution**: Ensure your document includes `\usepackage{zref-savepos}` and uses the geom-marks macros, then recompile.

## Best Practices

1. **Run LaTeX Multiple Times**: Always run LaTeX at least 2-3 times to ensure all references are resolved
2. **Sync After Compilation**: Run `sync_from_aux.js` after the final LaTeX compilation
3. **Verify Coordinates**: Spot-check a few coordinates to ensure accuracy
4. **Keep Aux Files**: Don't delete aux files - they're the source of truth
5. **Use in CI/CD**: Integrate the sync script into your build pipeline

## Example Workflow

```bash
# 1. Compile LaTeX (run 3 times for accuracy)
lualatex -output-directory=TeX TeX/ENDEND10921-generated.tex
lualatex -output-directory=TeX TeX/ENDEND10921-generated.tex
lualatex -output-directory=TeX TeX/ENDEND10921-generated.tex

# 2. Sync coordinates from aux file
node scripts/external/sync_from_aux.js TeX/ENDEND10921-generated.aux

# 3. Copy to UI directory for visualization
cp TeX/ENDEND10921-generated.pdf ui/
cp TeX/ENDEND10921-generated-marked-boxes.json ui/

# 4. Open in browser to verify overlays
open ui/index.html
```

## Integration with Build System

The sync script is automatically called by the Makefile when building PDFs:

```makefile
# After PDF generation
pdf-with-sync:
	node src/tex-to-pdf.js document.tex TeX/document.pdf
	node scripts/external/sync_from_aux.js TeX/document.aux
```

This ensures coordinates are always accurate and synchronized with the aux file.

## Technical Details

### Coordinate Conversion Formulas

```javascript
// Scaled points to points
pt = sp / 65536.0

// TeX Y to PDF Y
pdf_y = page_height_pt - tex_y_pt

// Points to millimeters
mm = pt * 0.352778

// Points to pixels (at 72 DPI)
px = pt * (dpi / 72.0)
```

### Bounding Box Calculation

For each element with start and end markers:
```javascript
x = min(x_start, x_end)
y = min(y_start_pdf, y_end_pdf)
width = abs(x_end - x_start)
height = abs(y_end_pdf - y_start_pdf)
```

If width is 0 (same x coordinates), use column width as default.

## See Also

- [Coordinate Accuracy Fix](COORDINATE-ACCURACY-FIX.md)
- [Project Summary](PROJECT_SUMMARY.json)
- Main README for general usage

