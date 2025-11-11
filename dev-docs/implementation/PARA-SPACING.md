# Paragraph Spacing (Tight/Loose) Implementation

## Overview

The paragraph spacing feature allows you to control the vertical space between lines within a paragraph by applying "tight" or "loose" spacing attributes.

## How It Works

### 1. XML Markup

Add a `spacing` attribute to any `<para>` element:

```xml
<!-- Tight spacing (0.5em) -->
<para id="sec1-p1" spacing="tight">
  <run>Your content here...</run>
</para>

<!-- Loose spacing (1.5em) -->
<para id="sec1-p2" spacing="loose">
  <run>Your content here...</run>
</para>

<!-- Normal spacing (1em - default) -->
<para id="sec1-p3">
  <run>Your content here...</run>
</para>
```

### 2. Template Processing

The `template/document.tex.xml` file contains three paragraph templates with different specificity:

**Template 1: Tight Spacing** (Higher specificity)
```xml
<template data-xml-selector='para[spacing="tight"]' xml:space="preserve">
{\setlength{\parskip}{0.5em}\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}
\par}
</template>
```

**Template 2: Loose Spacing** (Higher specificity)
```xml
<template data-xml-selector='para[spacing="loose"]' xml:space="preserve">
{\setlength{\parskip}{1.5em}\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}
\par}
</template>
```

**Template 3: Default** (Lower specificity)
```xml
<template data-xml-selector="para" xml:space="preserve">
\paraid{[[@id | raw]]}\geommarkinline{[[@id | raw]]}{P-start}[[...]]\geommarkinline{[[@id | raw]]}{P-end}
\par
</template>
```

### 3. LaTeX Output

The templates generate LaTeX with scoped spacing control using `{}` groups:

- **Tight**: `{\setlength{\parskip}{0.5em}...content...\par}`
- **Loose**: `{\setlength{\parskip}{1.5em}...content...\par}`
- **Default**: `...content...\par` (uses document default)

## Server Configuration

The feature is already configured in `server/config/server-config.json`:

```json
{
  "dropdownOptions": {
    "paragraph": [
      {"value": "para_tight", "label": "Para Tight"},
      {"value": "para_loose", "label": "Para Loose"}
    ]
  },
  "xmlProcessingRules": {
    "paragraph": {
      "para_tight": {
        "xpath": "//para[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "spacing",
        "value": "tight"
      },
      "para_loose": {
        "xpath": "//para[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "spacing",
        "value": "loose"
      }
    }
  },
  "texConversionRules": {
    "paragraph": {
      "spacing_tight": "\\setlength{\\parskip}{0.5em}",
      "spacing_loose": "\\setlength{\\parskip}{1.5em}",
      "default": "\\setlength{\\parskip}{1em}"
    }
  }
}
```

## Usage in UI

### React UI

1. **Click on a paragraph overlay** in the PDF viewer
2. **Select action** from the modal:
   - "Para Tight" - Apply tight spacing (0.5em)
   - "Para Loose" - Apply loose spacing (1.5em)
3. **Submit** - The server will:
   - Add/update the `spacing` attribute in the XML
   - Regenerate the PDF
   - Reload the updated document

### How It Works Behind the Scenes

1. **UI sends instruction** via WebSocket:
   ```json
   {
     "type": "instruction",
     "elementId": "sec1-p5",
     "overlayType": "paragraph",
     "instruction": "para_loose"
   }
   ```

2. **Server processes instruction**:
   - Loads `xml/document.xml`
   - Finds `<para id="sec1-p5">`
   - Adds/updates attribute: `spacing="loose"`
   - Saves XML file

3. **Document regeneration**:
   - Transforms XML → TeX (using templates)
   - Template matcher selects `para[spacing="loose"]`
   - Generates: `{\setlength{\parskip}{1.5em}...}`
   - Compiles TeX → PDF
   - Returns updated files to UI

## Spacing Values

| Spacing | LaTeX Value | Visual Effect |
|---------|-------------|---------------|
| Tight   | 0.5em       | Compact, dense paragraphs |
| Normal  | 1em (default) | Standard spacing |
| Loose   | 1.5em       | Airy, spacious paragraphs |

## Technical Notes

### Template Selector Syntax

**Important:** Use double quotes inside single quotes for attribute values:

✅ **Correct:**
```xml
<template data-xml-selector='para[spacing="loose"]'>
```

❌ **Incorrect:**
```xml
<template data-xml-selector="para[@spacing='loose']">
```

The selector uses CSS-like attribute matching, not XPath syntax.

### Template Specificity

Templates are matched by specificity:
1. **Tag + Attribute + Value** (highest): `para[spacing="loose"]`
2. **Tag + Attribute**: `para[spacing]`  
3. **Tag only** (lowest): `para`

More specific templates override less specific ones.

### Scoped Spacing

The `{}` group in LaTeX ensures spacing only affects that paragraph:

```latex
{\setlength{\parskip}{1.5em}
 ...paragraph content...
\par}
```

This prevents spacing from bleeding into subsequent paragraphs.

## Testing

### Example Paragraphs in document.xml

- `sec1-p5` - Has `spacing="loose"` (1.5em)
- `sec3-p6` - Has `spacing="tight"` (0.5em)
- All others - Use default spacing (1em)

### Verify in Generated TeX

```bash
grep -A 2 "sec1-p5" TeX/document-generated.tex
# Should show: {\setlength{\parskip}{1.5em}...

grep -A 2 "sec3-p6" TeX/document-generated.tex
# Should show: {\setlength{\parskip}{0.5em}...
```

## Files Modified

1. **`template/document.tex.xml`** (lines 73-88)
   - Added `para[spacing="tight"]` template
   - Added `para[spacing="loose"]` template
   - Kept default `para` template

2. **`server/config/server-config.json`** (already configured)
   - Dropdown options for paragraph actions
   - XML processing rules
   - TeX conversion rules

## Customization

To adjust spacing values, edit the templates in `template/document.tex.xml`:

```xml
<!-- Change 0.5em to your desired tight spacing -->
<template data-xml-selector='para[spacing="tight"]' xml:space="preserve">
{\setlength{\parskip}{0.3em}\paraid{...}...}
</template>

<!-- Change 1.5em to your desired loose spacing -->
<template data-xml-selector='para[spacing="loose"]' xml:space="preserve">
{\setlength{\parskip}{2.0em}\paraid{...}...}
</template>
```

**Para spacing feature is now fully functional!** 🎯
