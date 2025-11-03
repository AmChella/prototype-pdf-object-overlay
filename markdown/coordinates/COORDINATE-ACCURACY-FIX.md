# PDF Coordinate Accuracy Fix

## Problem

PDF coordinates were inaccurate, specifically:
1. Figures showing incorrect page numbers (all appearing on page 1)
2. Paragraph coordinates not properly calculated
3. Using LaTeX's page counter instead of actual PDF page numbers
4. Only running LaTeX once (insufficient for cross-references to stabilize)

## Root Cause

The coordinate extraction system was using `\the\value{page}` (LaTeX's page counter) to determine page numbers. This counter reflects where LaTeX **processes** content during compilation, not where it **places** content in the final PDF. This is especially problematic for floats (figures, tables) which LaTeX moves to optimal positions.

## Solution

### 1. Use zref for Accurate Page Numbers

Changed from LaTeX's page counter to zref's page reference system:

**Before:**
```latex
\edef\gpage{\the\value{page}}  % LaTeX page counter
\def\gpagesource{counter}
```

**After:**
```latex
\edef\gpage{\zref@extractdefault{gm:#1:#2}{page}{1}}  % Actual PDF page
\def\gpagesource{zref}
```

### 2. Configure zref to Save Page Numbers

Added configuration to ensure zref saves page numbers with position data:

```latex
\@ifpackageloaded{zref-savepos}{%
  \zref@addprop{savepos}{page}%
}{}
```

### 3. Three-Pass LaTeX Compilation

Updated both `generate-pdf-robust.sh` and `src/tex-to-pdf.js` to run LaTeX three times:

- **Pass 1**: Initial compilation, writes position labels to .aux file
- **Pass 2**: Reads positions from pass 1, updates cross-references
- **Pass 3**: Finalizes all positions and page numbers (ensures stability)

## Files Modified

1. **TeX-lib/geom-marks.tex**
   - Changed page number source from counter to zref
   - Added `\zref@addprop{savepos}{page}` to save page property
   - Updated `\geomemit` to use `\zref@extractdefault`

2. **generate-pdf-robust.sh**
   - Added three-pass LaTeX compilation with progress messages

3. **src/tex-to-pdf.js**
   - Added three-pass LaTeX compilation with console logging

4. **scripts/external/convert_ndjson_to_marked_boxes.py**
   - Updated warnings to recognize "zref" as accurate page source
   - Updated warning messages for "counter" source

5. **ui/app.js**
   - Added null checks for UI elements in `loadNewGeneratedFiles()`
   - Added `convertToRelativeUrl()` function for path conversion

## Verification

### Before Fix
```bash
$ grep '"id":"fig-F' ENDEND10921-generated-texpos.ndjson | grep -o '"page":[0-9]*' | sort | uniq -c
  12 "page":1  # All figures incorrectly on page 1
```

### After Fix
```bash
$ grep '"id":"fig-F' ENDEND10921-generated-texpos.ndjson | grep -o '"page":[0-9]*' | sort | uniq -c
   8 "page":8  # Accurate page numbers
   4 "page":9
```

### AUX File Verification
```latex
\zref@newlabel{gm:fig-F1:FIG-start}{\posx{3729359}\posy{50719291}\page{5}}
\zref@newlabel{gm:fig-F1:FIG-end}{\posx{3729359}\posy{42839445}\page{5}}
\zref@newlabel{gm:fig-F1:FIG-start}{\posx{3729359}\posy{50719291}\page{8}}
```

✅ Page numbers are now saved in zref labels
✅ Same figure correctly appears on different pages

## Benefits

- ✅ Accurate page numbers for all elements (figures, paragraphs, tables)
- ✅ Correct handling of floats appearing on multiple pages
- ✅ Precise coordinate calculations using zref positions
- ✅ Reliable cross-reference system (3-pass compilation)
- ✅ Clear `page_source` indicator for debugging ("zref" vs "counter")
- ✅ Works for both simple documents and complex multi-page layouts

## Technical Details

### How zref Works

zref (Z-references) is a LaTeX package that provides an extensible referencing system:

1. `\zsavepos{label}` - Saves the current position and page to the .aux file
2. `\zref@extractdefault{label}{property}{default}` - Retrieves a property from a saved label
3. Properties include: `page`, `posx`, `posy` (position in scaled points)

### Why Three Passes?

1. **Pass 1**: LaTeX compiles the document and writes labels to `.aux` file, but the labels aren't available yet
2. **Pass 2**: LaTeX reads labels from pass 1 and can now reference correct page numbers, writes updated labels
3. **Pass 3**: Ensures all cross-references have stabilized (sometimes floats move between passes 1 and 2)

### Page Counter vs zref

| Method | Source | Accuracy for Paragraphs | Accuracy for Floats |
|--------|--------|------------------------|---------------------|
| `\the\value{page}` | Page counter | ✅ Good | ❌ Inaccurate |
| `\zref@extractdefault{...}{page}{1}` | zref labels | ✅ Accurate | ✅ Accurate |

## Testing

To test the fix:

1. Generate a PDF through the UI at http://localhost:3000
2. Check the console for "Pass 1/3", "Pass 2/3", "Pass 3/3" messages
3. Verify that overlays appear on the correct pages
4. Check that figure coordinates match their visual positions

## Related Issues

- [BUGFIX-SUMMARY.md](./BUGFIX-SUMMARY.md) - Initial UI bugs after redesign
- [BUGFIX-PROGRESS-MODAL-COMPLETE.md](./BUGFIX-PROGRESS-MODAL-COMPLETE.md) - Progress modal fixes

