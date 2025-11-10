# Multi-Page Table Support

## Overview

Multi-page tables use LaTeX's `longtable` package to create tables that automatically break across page boundaries. Unlike regular `table` and `table*` environments (which are floats), `longtable` is part of the document flow and will split naturally when content exceeds page height.

## ⚠️ Important Limitation

**`longtable` is NOT compatible with two-column mode!**

To work around this, the template:
1. Uses `\onecolumn` to switch to single-column mode before the table
2. Displays the longtable in full-width single-column format
3. Uses `\twocolumn` to resume two-column mode after the table

**Impact:**
- The multi-page table will appear on its own page(s) in single-column format
- Content before and after will remain in two-column format
- Page breaks will occur before and after the table

## Implementation

### 1. XML Structure

Add a table with `type="long"` attribute:

```xml
<table id="table-multipage" label="tab:multipage" type="long" cols="c l X c">
  <caption>Multi-Page Table Title</caption>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
      <th>Column 4</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Data 1</td><td>Data 2</td><td>Data 3</td><td>Data 4</td></tr>
    <!-- Many more rows... -->
  </tbody>
</table>
```

### 2. LaTeX Template

The template generates a `longtable` environment wrapped in column mode switches:

```latex
\onecolumn  % Switch to single column
\hypertarget{table-id}{}\geommarkinline{table-id}{TABLE-start}%
\begin{longtable}{c l X c}
\caption{Multi-Page Table Title}
\label{tab:multipage}\\
\toprule
...headers...
\midrule
\endfirsthead
\multicolumn{4}{c}{\textit{Continued from previous page}}\\
\toprule
...headers...
\midrule
\endhead
\midrule
\multicolumn{4}{r}{\textit{Continued on next page}}\\
\endfoot
\bottomrule
\endlastfoot
...rows...
\end{longtable}%
\hypertarget{table-id-end}{}\geommarkinline{table-id}{TABLE-end}%
\twocolumn  % Resume two-column mode
```

### 3. Key Features

**longtable Headers:**
- `\endfirsthead` - Header for the first page only
- `\endhead` - Header repeated on subsequent pages
- `\endfoot` - Footer repeated on all pages except last
- `\endlastfoot` - Footer for the last page only

**Continuation Messages:**
- Top of page 2+: "Continued from previous page"
- Bottom of pages 1...N-1: "Continued on next page"

### 4. Coordinate Marking

**Important Differences from Float Tables:**

| Feature | Float Tables | Long Tables |
|---------|-------------|-------------|
| Environment | `table`, `table*` | `longtable` |
| Page Breaks | ❌ No (single float) | ✅ Yes (flows naturally) |
| Marker Type | `\geommarkfloat` | `\geommarkinline` |
| Column Flag | Always `col=0` | Calculated from X position |
| Splitting | Only across pages | Across pages automatically |

**Why `\geommarkinline` instead of `\geommarkfloat`?**
- Longtables are NOT floats - they're part of the text flow
- They span pages naturally, not as separate float placements
- Column detection works normally for inline content

### 5. NDJSON Output

Multi-page longtables will generate multiple position records:

```json
// Page 1 - Start
{"id":"table-multipage","role":"TABLE-start","xsp":"4736286","ysp":"45000000","page":1,...,"col":0}

// Page 2 - End  
{"id":"table-multipage","role":"TABLE-end","xsp":"4736286","ysp":"15000000","page":2,...,"col":0}
```

### 6. Marked-Boxes JSON

The splitting logic in `sync_from_aux.js` will detect the page span and create segments:

```json
{
  "id": "table-multipage",
  "type": "multi-page",
  "totalSegments": 2,
  "segments": [
    {
      "page": 1,
      "segmentIndex": 0,
      "x_pt": 72.27,
      "y_pt": 100.0,
      "w_pt": 453.0,
      "h_pt": 650.0
    },
    {
      "page": 2,
      "segmentIndex": 1,
      "x_pt": 72.27,
      "y_pt": 400.0,
      "w_pt": 453.0,
      "h_pt": 300.0
    }
  ]
}
```

## Usage Example

The example table `table-multipage` contains 40 test cases which will naturally flow across multiple pages:

- **Page 1**: Tests T001-T025 (approximately)
- **Page 2**: Tests T026-T040 (approximately)

The exact page break depends on:
- Available page height
- Caption size
- Header repetition
- Page margins

## Testing

After regenerating the document, verify:

1. **PDF**: Table should span across pages with repeated headers
2. **NDJSON**: Should have TABLE-start and TABLE-end on different pages
3. **Marked-Boxes**: Should have multiple segments in the `segments` array
4. **UI**: Each segment should render as a separate overlay on its respective page

## Regeneration

```bash
cd /Users/che/Code/Tutorial/prototype-pdf-object-overlay

# Step 1: XML to TeX
node src/cli.js xml/document.xml template/document.tex.xml TeX/document-generated.tex

# Step 2: TeX to PDF with coordinates
node src/tex-to-pdf.js TeX/document-generated.tex TeX
```

After regeneration, search for "table-multipage" in the NDJSON to verify page spanning:

```bash
grep "table-multipage" TeX/document-generated-texpos.ndjson
```

Expected output:
```
{"id":"table-multipage","role":"TABLE-start","page":X,...}
{"id":"table-multipage","role":"TABLE-end","page":Y,...}
```

Where Y > X (end page is greater than start page).

## Notes

- ⚠️ The `\multicolumn{4}{...}` in headers/footers uses hardcoded column count. Adjust if your table has different number of columns.
- ✅ Longtables work well in both single-column and two-column layouts
- ✅ The coordinate system correctly handles page breaks
- ✅ Each page segment gets its own overlay in the UI

## Troubleshooting

**Table doesn't break across pages?**
- Check that you're using `type="long"` in XML
- Verify `longtable` package is loaded in template
- Ensure enough rows to exceed page height

**Coordinates not captured?**
- Check NDJSON for TABLE-start and TABLE-end records
- Verify markers are using `\geommarkinline` not `\geommarkfloat`
- Run 3-pass compilation for accurate page numbers

**UI shows only one segment?**
- Check marked-boxes JSON for `segments` array
- Verify page numbers differ between start and end
- Check JavaScript splitting logic in `sync_from_aux.js`

