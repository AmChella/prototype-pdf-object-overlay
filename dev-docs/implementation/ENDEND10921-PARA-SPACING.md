# ENDEND10921 Template - Para Spacing Implementation

## Summary

Successfully implemented paragraph tight/loose spacing for the ENDEND10921 template, matching the functionality in the document.tex.xml template.

## Changes Made

### 1. Template File: `template/ENDEND10921-sample-style.tex.xml`

Added three paragraph templates with different specificity levels:

**Lines 181-184: Tight Spacing Template**
```xml
<template data-xml-selector='p[spacing="tight"]' xml:space="preserve">
{\setlength{\parskip}{0.5em}\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}
\par}
</template>
```

**Lines 186-189: Loose Spacing Template**
```xml
<template data-xml-selector='p[spacing="loose"]' xml:space="preserve">
{\setlength{\parskip}{1.5em}\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}
\par}
</template>
```

**Lines 192-195: Default Template**
```xml
<template data-xml-selector="p" xml:space="preserve">
\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}

</template>
```

### 2. HTML Entity Decoding

#### CLI Tool: `src/cli.js` (Lines 50-55)
Added HTML entity decoding to fix XMLSerializer escaping:
```javascript
// Fix: XMLSerializer also escapes other HTML entities that should be literal in LaTeX
output = output.replace(/&lt;/g, '<');
output = output.replace(/&gt;/g, '>');
output = output.replace(/&quot;/g, '"');
output = output.replace(/&apos;/g, "'");
```

#### Server Module: `server/modules/DocumentConverter.js` (Lines 109-110)
Enhanced existing HTML entity decoding:
```javascript
processedOutput = processedOutput.replace(/&quot;/g, '"');
processedOutput = processedOutput.replace(/&apos;/g, "'");
```

## Key Differences from document.xml Template

| Aspect | document.xml | ENDEND10921.xml |
|--------|--------------|-----------------|
| Paragraph element | `<para>` | `<p>` |
| Template selector | `para[spacing="..."]` | `p[spacing="..."]` |
| XML structure | More complex, multi-section | Medical paper format |

## Testing

### Example Paragraphs in ENDEND10921.xml

```xml
<!-- Tight spacing (0.5em) -->
<p id="sec-p-002" spacing="tight">
  ...content...
</p>

<!-- Loose spacing (1.5em) -->
<p id="sec-p-005" spacing="loose">
  Follicular lymphoma (FL) is a clinically and molecularly...
</p>
```

### Generated LaTeX Output

**Tight spacing (sec-p-002):**
```latex
{\setlength{\parskip}{0.5em}\paraid{sec-p-002}...content...\par}
```

**Loose spacing (sec-p-005):**
```latex
{\setlength{\parskip}{1.5em}\paraid{sec-p-005}...content...\par}
```

### Verification Commands

```bash
# Generate TeX
node src/cli.js xml/ENDEND10921.xml template/ENDEND10921-sample-style.tex.xml TeX/ENDEND10921-generated.tex

# Verify tight spacing
grep -A 1 "sec-p-002" TeX/ENDEND10921-generated.tex

# Verify loose spacing
grep -A 1 "sec-p-005" TeX/ENDEND10921-generated.tex

# Compile PDF
node src/tex-to-pdf.js TeX/ENDEND10921-generated.tex TeX

# Check marked boxes
jq '[.[] | select(.id | test("sec-p-002|sec-p-005"))]' TeX/ENDEND10921-generated-marked-boxes.json
```

## Issues Fixed

### HTML Entity Escaping

**Problem:** XMLSerializer was converting `<`, `>`, `"`, `'` to HTML entities (`&lt;`, `&gt;`, `&quot;`, `&apos;`), causing LaTeX compilation errors.

**Example Error:**
```
! Misplaced alignment tab character &.
l.233 χ&lt;1
```

**Solution:** Added post-processing to decode HTML entities back to their literal characters in both CLI and server modules.

## Files Modified

1. **`template/ENDEND10921-sample-style.tex.xml`**
   - Added `p[spacing="tight"]` template
   - Added `p[spacing="loose"]` template
   - Kept default `p` template

2. **`src/cli.js`**
   - Added HTML entity decoding for `&lt;`, `&gt;`, `&quot;`, `&apos;`

3. **`server/modules/DocumentConverter.js`**
   - Enhanced HTML entity decoding (already had `&lt;` and `&gt;`)

## Usage in UI

Once the server is configured with paragraph dropdown options for ENDEND10921 documents:

1. **Click on a paragraph** in the ENDEND10921 PDF
2. **Select action:**
   - "Para Tight" → `spacing="tight"` (0.5em)
   - "Para Loose" → `spacing="loose"` (1.5em)
3. **Submit** → XML updated and PDF regenerated

## Compilation Results

✅ **TeX Generation:** Success  
✅ **HTML Entity Decoding:** Working  
✅ **Paragraph Spacing:** Applied correctly  
✅ **PDF Compilation:** Success (5.45s)  
✅ **Coordinate Capture:** 70 marked boxes generated  

**ENDEND10921 paragraph spacing is now fully functional!** 🎯
