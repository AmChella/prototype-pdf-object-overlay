# Figure Placement Feature - Complete Guide

**Comprehensive Documentation for Moving Figures in LaTeX Documents via React UI**

---

## 📑 Table of Contents

1. [Overview](#1-overview)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Feature Implementation Details](#3-feature-implementation-details)
4. [Understanding LaTeX Two-Column Placement](#4-understanding-latex-two-column-placement)
5. [Configuration Reference](#5-configuration-reference)
6. [System Architecture](#6-system-architecture)
7. [Template Integration](#7-template-integration)
8. [Usage Examples](#8-usage-examples)
9. [Troubleshooting](#9-troubleshooting)
10. [Advanced Topics](#10-advanced-topics)
11. [Future Enhancements](#11-future-enhancements)
12. [Appendix](#12-appendix)

---

## 1. Overview

### 1.1 What This Feature Does

This feature enables users to control figure placement in LaTeX documents through the React UI. Users can move figures to different positions (bottom, top, or current position) using a simple form interface, with changes flowing through the complete **XML → TeX → PDF → JSON** pipeline.

### 1.2 Available Placement Options

| Option | LaTeX Code | Description |
|--------|-----------|-------------|
| **Move Bottom** | `\begin{figure}[b]` | Places figure at bottom of page/column |
| **Move Top** | `\begin{figure}[t]` | Places figure at top of page/column |
| **Place Here** | `\begin{figure}[!h]` | Places figure at current position in document flow |

### 1.3 Key Benefits

- ✅ **No manual LaTeX editing** - All changes via UI
- ✅ **Real-time updates** - See results immediately after regeneration
- ✅ **Audit trail** - All changes logged
- ✅ **Coordinate sync** - JSON overlays automatically updated
- ✅ **Multi-schema support** - Works with standard and JATS XML

---

## 2. Quick Start Guide

### 2.1 Prerequisites

- Node.js 18+
- LuaLaTeX installed
- React 18+
- Modern browser (Chrome, Firefox, Safari, Edge)

### 2.2 Starting the System

```bash
# Terminal 1 - Start Server
cd server
node server.js

# Terminal 2 - Start React UI
cd ui-react
npm run dev
```

### 2.3 Using the Feature (5 Steps)

**Step 1: Open UI**
- Navigate to `http://localhost:5173`

**Step 2: Generate Document**
- Select document from dropdown ("document" or "ENDEND10921")
- Click **"Generate Document"**
- Wait for PDF to load

**Step 3: Select Figure**
- Click on any figure overlay in the PDF
- Action Modal appears with figure details

**Step 4: Choose Placement**
- Select option from dropdown:
  - **Move Bottom** - Bottom of column
  - **Move Top** - Top of column
  - **Place Here** - Current position

**Step 5: Apply Change**
- Click **"Send Instruction"**
- Wait for processing (~5-10 seconds)
- View updated PDF with figure in new position

### 2.4 Visual Workflow

```
User Action → WebSocket → XML Update → TeX Generation → PDF Compilation → Coordinate Extraction → UI Reload
```

### 2.5 Verification

Run validation script to check setup:

```bash
node scripts/validate-figure-placement.js
```

Expected output:
```
✓ All validations passed! (20/20 checks)
```

---

## 3. Feature Implementation Details

### 3.1 Complete Workflow

```
┌─────────────────┐
│  React UI Form  │ User selects figure & placement
└────────┬────────┘
         │ WebSocket message: {type: 'instruction', ...}
         ▼
┌─────────────────┐
│  Server (WS)    │ server.js receives instruction
└────────┬────────┘
         │ calls processInstruction()
         ▼
┌─────────────────┐
│  XMLProcessor   │ Modifies XML: <figure placement="[b]">
│                 │ - Loads XML document
│                 │ - Detects schema (standard/JATS)
│                 │ - Applies XPath to find element
│                 │ - Sets placement attribute
│                 │ - Saves XML
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DocumentConvert │ Transforms XML → TeX
│                 │ - Reads XML file
│                 │ - Applies template
│                 │ - Inserts [[@placement]] value
│                 │ - Generates TeX file
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TeX Template   │ Template uses: \begin{figure}[[@placement]]
│                 │ Result: \begin{figure}[b]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LuaLaTeX       │ Compiles PDF (3 passes)
│                 │ - Pass 1: Initial layout
│                 │ - Pass 2: Resolve references
│                 │ - Pass 3: Final positioning
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ JSON Generator  │ Extracts coordinates
│                 │ - Reads .aux file
│                 │ - Converts NDJSON to JSON
│                 │ - Generates marked-boxes.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React UI       │ Reloads with updated PDF & overlays
│                 │ - WebSocket: processing_complete
│                 │ - Loads new PDF
│                 │ - Displays updated overlays
└─────────────────┘
```

### 3.2 Files Modified

**Configuration:**
- `server/config/server-config.json` - Dropdown options and processing rules

**Documentation:**
- `docs/FIGURE-PLACEMENT-COMPLETE-GUIDE.md` - This comprehensive guide
- `scripts/validate-figure-placement.js` - Validation tool

**No Code Changes Required:**
- ✅ XMLProcessor.js - Already handles setAttribute
- ✅ DocumentConverter.js - Already processes XML→TeX
- ✅ Templates - Already use [[@placement]]
- ✅ React UI - Already uses server config

### 3.3 Configuration Structure

The configuration in `server-config.json` has four main sections:

**1. Dropdown Options** (UI)
```json
"dropdownOptions": {
  "figure": [
    {"value": "move_bottom", "label": "Move Bottom"},
    {"value": "move_top", "label": "Move Top"},
    {"value": "place_here", "label": "Place Here"}
  ]
}
```

**2. XML Instruction Templates** (Audit Logging)
```json
"xmlInstructionTemplates": {
  "figure": {
    "move_bottom": "<instruction type=\"figure\" action=\"move_bottom\" target=\"{elementId}\" />"
  }
}
```

**3. XML Processing Rules** (How to modify XML)
```json
"xmlProcessingRules": {
  "figure": {
    "move_bottom": {
      "xpath": "//figure[@id='{elementId}']",
      "operation": "setAttribute",
      "attribute": "placement",
      "value": "[b]"
    }
  }
}
```

**4. TeX Conversion Rules** (Reference documentation)
```json
"texConversionRules": {
  "figure": {
    "placement_b": "\\begin{figure}[b]",
    "placement_t": "\\begin{figure}[t]",
    "placement_h": "\\begin{figure}[!h]"
  }
}
```

---

## 4. Understanding LaTeX Two-Column Placement

### 4.1 The Challenge

In LaTeX two-column documents, figure placement is controlled by **floating algorithms** that optimize page layout, not by absolute column positions.

❌ **What Doesn't Exist in LaTeX:**
- "Left column only" placement
- "Right column only" placement
- Exact positioning commands (without special packages)

✅ **What LaTeX Provides:**
- Vertical position hints: top `[t]`, bottom `[b]`, here `[h]`
- Insistence modifiers: `[!h]` overrides some restrictions
- Column-spanning: `figure*` spans both columns

### 4.2 How Figures Flow Into Columns

```
Document Source Order:
┌──────────────────────────────────┐
│ <section>                        │
│   <para id="p1">Text...</para>   │ ← Left column
│   <figure id="fig1">...</figure> │ ← Goes to left column (defined early)
│   <para id="p2">Text...</para>   │ ← Still left column
│   <para id="p3">Text...</para>   │ ← Right column
│   <figure id="fig2">...</figure> │ ← Goes to right column (defined late)
│   <para id="p4">Text...</para>   │ ← Right column
│ </section>                        │
└──────────────────────────────────┘

Rendered PDF:
┌─────────────┬─────────────┐
│ Left Column │Right Column │
│             │             │
│ [Figure 1]  │             │ [t] placement
│ Text p1     │ Text p3     │
│ Text p2     │ Text p4     │
│             │ [Figure 2]  │ [b] placement
└─────────────┴─────────────┘
```

### 4.3 Placement Specifier Behavior

| Specifier | Name | Behavior in Two-Column |
|-----------|------|----------------------|
| `[t]` | Top | Top of current column |
| `[b]` | Bottom | Bottom of current column |
| `[h]` | Here | Approximately at current position |
| `[!h]` | Here! | More insistent about "here" placement |
| `[p]` | Page | Separate page/column of floats only |
| `[htbp]` | Default | Try here, top, bottom, then page |

### 4.4 Why "Left Column" Was Renamed to "Place Here"

The original "Move Left Column" option was **misleading** because:

1. **No absolute column control** - LaTeX doesn't have `[left]` or `[right]` specifiers
2. **Flow-based placement** - Column depends on where figure appears in source
3. **The `[!h]` specifier** means "place approximately here in the flow"
   - If source position flows to left → left column
   - If source position flows to right → right column
   - If no space → LaTeX moves to bottom of column

**More accurate name:** "Place Here" describes what actually happens.

### 4.5 Column-Specific Placement Solutions

#### Option A: Span Both Columns (Recommended)

Use `figure*` to span both columns at top of page:

```latex
\begin{figure*}[t]
  \centering
  \includegraphics{image.png}
  \caption{Full-width figure}
\end{figure*}
```

**Pros:** Clear placement, professional look, LaTeX handles well  
**Cons:** Only works at top of page  
**Implementation:** Would require new template selector in XML

#### Option B: Manual Column Breaks

Insert explicit column breaks:

```latex
\columnbreak
\begin{figure}[t]
  \includegraphics{image.png}
\end{figure}
```

**Pros:** Precise control  
**Cons:** Breaks automatic layout, requires manual positioning  
**Implementation:** Would need column break instruction

#### Option C: Reorder in XML Source

Move figure elements earlier/later in XML:

```xml
<!-- For left column: place figure early in section -->
<section>
  <para>...</para>
  <figure id="fig1">...</figure>  <!-- Early = left -->
  <para>...</para>
  <para>...</para>
</section>

<!-- For right column: place figure late in section -->
<section>
  <para>...</para>
  <para>...</para>
  <para>...</para>
  <figure id="fig2">...</figure>  <!-- Late = right -->
</section>
```

**Pros:** Works with standard LaTeX  
**Cons:** Requires element reordering in XML  
**Implementation:** Complex - would need XML structure modification

---

## 5. Configuration Reference

### 5.1 Complete server-config.json

```json
{
  "dropdownOptions": {
    "figure": [
      {"value": "move_bottom", "label": "Move Bottom"},
      {"value": "move_top", "label": "Move Top"},
      {"value": "place_here", "label": "Place Here"}
    ],
    "paragraph": [
      {"value": "para_tight", "label": "Para Tight"},
      {"value": "para_loose", "label": "Para Loose"}
    ],
    "table": [
      {"value": "change_landscape", "label": "Change Landscape"},
      {"value": "portrait", "label": "Portrait"}
    ]
  },
  "xmlInstructionTemplates": {
    "figure": {
      "move_bottom": "<instruction type=\"figure\" action=\"move_bottom\" target=\"{elementId}\" />",
      "move_top": "<instruction type=\"figure\" action=\"move_top\" target=\"{elementId}\" />",
      "place_here": "<instruction type=\"figure\" action=\"place_here\" target=\"{elementId}\" />"
    }
  },
  "xmlProcessingRules": {
    "figure": {
      "move_bottom": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "placement",
        "value": "[b]"
      },
      "move_top": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "placement",
        "value": "[t]"
      },
      "place_here": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "placement",
        "value": "[!h]"
      }
    }
  },
  "texConversionRules": {
    "figure": {
      "placement_t": "\\begin{figure}[t]",
      "placement_b": "\\begin{figure}[b]",
      "placement_h": "\\begin{figure}[!h]",
      "default": "\\begin{figure}[htbp]"
    }
  }
}
```

### 5.2 Adding New Placement Options

To add a new option (e.g., "Float to Separate Page"):

**Step 1:** Add to dropdown options
```json
{"value": "float_page", "label": "Float to Separate Page"}
```

**Step 2:** Add instruction template
```json
"float_page": "<instruction type=\"figure\" action=\"float_page\" target=\"{elementId}\" />"
```

**Step 3:** Add processing rule
```json
"float_page": {
  "xpath": "//figure[@id='{elementId}']",
  "operation": "setAttribute",
  "attribute": "placement",
  "value": "[p]"
}
```

**Step 4:** Document in TeX rules
```json
"placement_p": "\\begin{figure}[p]"
```

**Step 5:** Restart server
```bash
cd server && node server.js
```

---

## 6. System Architecture

### 6.1 Component Overview

```
┌──────────────────────────────────────────┐
│           React UI (ui-react/)           │
│  - App.jsx (main component)              │
│  - ActionModal.jsx (instruction form)    │
│  - AppContext.jsx (state management)     │
│  - useWebSocket.js (server connection)   │
└──────────────┬───────────────────────────┘
               │ WebSocket (port 8081)
               ▼
┌──────────────────────────────────────────┐
│         Node.js Server (server/)         │
│  - server.js (WebSocket & REST API)      │
│  - ConfigManager.js (config loader)      │
│  - XMLProcessor.js (XML modification)    │
│  - DocumentConverter.js (XML→TeX→PDF)    │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      Core Engine (src/)                  │
│  - engine.js (XML transformation)        │
│  - tex-to-pdf.js (LaTeX compilation)     │
│  - pdf-geometry.js (coordinate extract)  │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      File System                         │
│  - xml/ (source documents)               │
│  - template/ (TeX templates)             │
│  - TeX/ (generated files)                │
│  - ui/ (served to React app)             │
└──────────────────────────────────────────┘
```

### 6.2 Data Flow

**Request Flow:**
```
User Click → ActionModal → WebSocket Message → Server Handler → XMLProcessor → DocumentConverter → LuaLaTeX → File System
```

**Response Flow:**
```
File System → Server → WebSocket Broadcast → React App → PDF Reload → Overlay Update
```

### 6.3 WebSocket Protocol

**Client → Server Messages:**

```javascript
// Generate document
{
  type: 'generate_document',
  documentName: 'document'
}

// Apply instruction
{
  type: 'instruction',
  elementId: 'fig-sec1',
  overlayType: 'figure',
  instruction: 'move_bottom',
  instructionValue: null
}
```

**Server → Client Messages:**

```javascript
// Configuration
{
  type: 'config',
  data: { dropdownOptions: {...} }
}

// Progress update
{
  type: 'processing_progress',
  progress: 50,
  message: 'Compiling PDF...'
}

// Completion
{
  type: 'processing_complete',
  elementId: 'fig-sec1',
  result: {
    pdfPath: 'ui/document-generated.pdf',
    jsonPath: 'ui/document-generated-marked-boxes.json'
  }
}
```

---

## 7. Template Integration

### 7.1 Standard Template (document.tex.xml)

```xml
<!-- Single-column figure -->
<template data-xml-selector="figure" xml:space="preserve">
\begin{figure}[[@placement]]
\centering
\hypertarget{[[@id | raw]]}{}\geommarkfloat{[[@id | raw]]}{FIG-start}
<apply-template data-xml-selector="image"/>
\caption{[[caption:.]]}
\label{[[@label | raw]]}
\geommarkfloat{[[@id | raw]]}{FIG-end}
\end{figure}
</template>

<!-- Double-column figure -->
<template data-xml-selector="figure[width-span='2']" xml:space="preserve">
\begin{figure*}[htbp]
\centering
\hypertarget{[[@id | raw]]}{}\geommarkfloat{[[@id | raw]]}{FIG-start}
<apply-template data-xml-selector="image"/>
\caption{[[caption:.]]}
\label{[[@label | raw]]}
\geommarkfloat{[[@id | raw]]}{FIG-end}
\end{figure*}
</template>
```

**Key Points:**
- `[[@placement]]` is replaced with XML attribute value
- If no placement attribute: defaults to empty (LaTeX uses `[htbp]`)
- `\geommarkfloat` marks figure boundaries for coordinate extraction

### 7.2 JATS Template (ENDEND10921-sample-style.tex.xml)

```xml
<template data-xml-selector="fig" xml:space="preserve">
\begin{figure}[[@placement]]
\centering
\geommarkfloat{[[@id | raw]]}{FIG-start}
<apply-template data-xml-selector="image"/>
<apply-template data-xml-selector="graphic"/>
\caption{[[label:.]]\space <apply-template data-xml-selector="caption"/>}
\label{[[@id | raw]]}
\geommarkfloat{[[@id | raw]]}{FIG-end}
\end{figure}
</template>
```

**Differences:**
- Uses `<fig>` instead of `<figure>` (JATS schema)
- Handles `<graphic>` elements (for equation images)
- XMLProcessor auto-detects schema and adapts XPath

### 7.3 Template Syntax

| Syntax | Description | Example |
|--------|-------------|---------|
| `[[@attr]]` | Insert attribute value | `[[@placement]]` → `[b]` |
| `[[@attr \| raw]]` | Insert without escaping | `[[@id \| raw]]` → `fig-1` |
| `[[element:.]]` | Extract element text | `[[caption:.]]` → caption text |
| `<apply-template>` | Apply nested template | Processes child elements |

---

## 8. Usage Examples

### 8.1 Example 1: Move Figure to Bottom

**Initial XML:**
```xml
<figure id="fig-sec1" label="fig:sec1" placement="[t]">
  <image src="../images/figure1.png" width="0.8\linewidth"/>
  <caption>Original figure at top</caption>
</figure>
```

**User Action:**
1. Click figure in UI
2. Select "Move Bottom"
3. Click "Send Instruction"

**Modified XML:**
```xml
<figure id="fig-sec1" label="fig:sec1" placement="[b]">
  <image src="../images/figure1.png" width="0.8\linewidth"/>
  <caption>Figure now at bottom</caption>
</figure>
```

**Generated LaTeX:**
```latex
\begin{figure}[b]
\centering
\geommarkfloat{fig-sec1}{FIG-start}
\includegraphics[width=0.8\linewidth]{../images/figure1.png}
\caption{Figure now at bottom}
\label{fig:sec1}
\geommarkfloat{fig-sec1}{FIG-end}
\end{figure}
```

**Result:** Figure appears at bottom of column in regenerated PDF.

### 8.2 Example 2: Place Figure at Current Position

**Initial XML:**
```xml
<figure id="fig-results" placement="[htbp]">
  <image src="results.png"/>
  <caption>Results graph</caption>
</figure>
```

**User Action:**
1. Click figure
2. Select "Place Here"
3. Submit

**Modified XML:**
```xml
<figure id="fig-results" placement="[!h]">
  <image src="results.png"/>
  <caption>Results graph</caption>
</figure>
```

**Generated LaTeX:**
```latex
\begin{figure}[!h]
% ...figure content...
\end{figure}
```

**Result:** LaTeX places figure approximately at its position in the text flow, overriding some float restrictions.

### 8.3 Example 3: JATS Schema Figure

**Initial XML (JATS):**
```xml
<fig id="fig1" position="float">
  <label>Figure 1</label>
  <caption>
    <p>Sample microscopy image</p>
  </caption>
  <graphic xlink:href="fig1.png"/>
</fig>
```

**User Action:**
1. Select "Move Top"

**Modified XML:**
```xml
<fig id="fig1" position="float" placement="[t]">
  <label>Figure 1</label>
  <caption>
    <p>Sample microscopy image</p>
  </caption>
  <graphic xlink:href="fig1.png"/>
</fig>
```

**Note:** XMLProcessor auto-detects JATS schema and adapts XPath from `//figure` to `//fig`.

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue: Figure Doesn't Move to Expected Position

**Symptoms:**
- Selected "Move Top" but figure appears at bottom
- Selected "Place Here" but figure floated away

**Causes:**
- LaTeX placement is **advisory**, not mandatory
- LaTeX optimizer prioritizes good typography
- Insufficient space at requested position
- Float accumulation

**Solutions:**

1. **Try different specifier:**
   ```
   [t]  → Try [!ht] (more insistent)
   [b]  → Try [!hb]
   [!h] → Try [H] (requires float package)
   ```

2. **Check LaTeX warnings** in `TeX/document-generated.log`:
   ```
   LaTeX Warning: `h' float specifier changed to `ht'.
   ```

3. **Adjust float parameters** in template preamble:
   ```latex
   \setcounter{totalnumber}{5}     % Max floats per page
   \setcounter{topnumber}{3}       % Max at top
   \setcounter{bottomnumber}{2}    % Max at bottom
   \renewcommand{\textfraction}{0.1}
   \renewcommand{\topfraction}{0.9}
   ```

#### Issue: Dropdown Options Don't Appear in UI

**Symptoms:**
- ActionModal opens but dropdown is empty
- Console shows "dropdownOptions is null"

**Causes:**
- WebSocket not connected
- Server config not loaded
- Configuration syntax error

**Solutions:**

1. **Check WebSocket connection:**
   - Open browser DevTools (F12)
   - Look for green "Connected" indicator
   - Console should show: `WebSocket connected`

2. **Validate configuration:**
   ```bash
   node scripts/validate-figure-placement.js
   ```

3. **Check server logs:**
   ```bash
   cd server
   node server.js
   # Should see: "Configuration loaded"
   ```

4. **Restart server:**
   ```bash
   # Ctrl+C to stop
   node server.js
   ```

#### Issue: PDF Compilation Fails

**Symptoms:**
- Processing stalls at "Compiling PDF..."
- Error message: "TeX to PDF conversion failed"

**Causes:**
- Invalid LaTeX syntax
- Missing image files
- Invalid placement specifier
- LuaLaTeX not installed

**Solutions:**

1. **Check TeX log file:**
   ```bash
   cat TeX/document-generated.log
   # Look for "! Error" lines
   ```

2. **Validate image paths:**
   ```bash
   # Images should exist
   ls images/*.png
   ```

3. **Test LuaLaTeX:**
   ```bash
   lualatex --version
   # Should show: This is LuaTeX, Version X.Y
   ```

4. **Manual compilation test:**
   ```bash
   cd TeX
   lualatex document-generated.tex
   ```

#### Issue: Coordinates Don't Match After Placement Change

**Symptoms:**
- Figure moves in PDF
- Overlay rectangle in wrong position
- JSON coordinates seem incorrect

**Causes:**
- Coordinate extraction timing issue
- Multi-pass compilation needed
- Figure split across pages

**Solutions:**

1. **Verify 3-pass compilation** in server logs:
   ```
   Pass 1: Initial layout
   Pass 2: Resolve references  
   Pass 3: Final positioning
   ```

2. **Check marked-boxes.json:**
   ```bash
   cat ui/document-generated-marked-boxes.json | jq '.[] | select(.id=="fig-sec1")'
   ```

3. **Regenerate with sync:**
   ```bash
   cd src
   node tex-to-pdf.js ../TeX/document-generated.tex ../TeX --sync-aux
   ```

### 9.2 Validation Checklist

Run through this checklist when troubleshooting:

- [ ] Server running without errors
- [ ] React UI running on port 5173
- [ ] WebSocket shows "Connected" in UI
- [ ] `server-config.json` is valid JSON
- [ ] Dropdown options appear in ActionModal
- [ ] LuaLaTeX installed and accessible
- [ ] Image files exist at specified paths
- [ ] TeX compiles without errors
- [ ] JSON coordinates generated
- [ ] Files copied to `ui/` directory

### 9.3 Debug Mode

Enable verbose logging:

**Server side:**
```javascript
// In server.js, add:
console.log('📨 Instruction:', data);
console.log('📄 XML modified:', result);
console.log('📋 TeX generated:', texResult);
```

**Client side:**
```javascript
// In browser console:
localStorage.setItem('debug', 'true');
// Reload page
```

---

## 10. Advanced Topics

### 10.1 Custom Placement Specifiers

Create custom placement combinations:

```json
{
  "value": "top_insistent",
  "label": "Top (Force)",
  "placement": "[!t]"
}
```

Or combine specifiers:
```json
{
  "value": "here_or_top",
  "label": "Here or Top",
  "placement": "[!ht]"
}
```

### 10.2 Conditional Placement by Figure Size

Implement size-based rules:

```javascript
// In XMLProcessor.js, add logic:
if (figureWidth > 0.8) {
  placement = '[p]'; // Large figures on separate page
} else if (figureHeight > 200) {
  placement = '[b]'; // Tall figures at bottom
} else {
  placement = '[t]'; // Small figures at top
}
```

### 10.3 Page-Specific Placement

Place figures on specific pages:

```latex
\usepackage{afterpage}

\afterpage{
  \begin{figure}[t]
    \includegraphics{image.png}
    \caption{Appears on next page}
  \end{figure}
}
```

### 10.4 Float Barriers

Prevent figures from floating past a point:

```latex
\usepackage{placeins}

Section content...
\FloatBarrier  % No floats past this point
Next section...
```

### 10.5 Spanning Both Columns

To implement full-width figures:

**1. Add to dropdown:**
```json
{"value": "span_columns", "label": "Span Both Columns"}
```

**2. Add processing rule:**
```json
"span_columns": {
  "xpath": "//figure[@id='{elementId}']",
  "operation": "setAttribute",
  "attribute": "width-span",
  "value": "2"
}
```

**3. Template already exists:**
```xml
<template data-xml-selector="figure[width-span='2']">
\begin{figure*}[htbp]
  % Full width figure
\end{figure*}
</template>
```

---

## 11. Future Enhancements

### 11.1 Planned Features

#### 11.1.1 Visual Placement Preview

Show preview before applying:
```
[ Before ] [ After ]
   ▼         ▼
[Figure]   [Text]
[Text]     [Figure]
```

#### 11.1.2 Batch Operations

Move multiple figures at once:
```javascript
{
  type: 'batch_instruction',
  instructions: [
    {elementId: 'fig1', action: 'move_top'},
    {elementId: 'fig2', action: 'move_bottom'},
    {elementId: 'fig3', action: 'place_here'}
  ]
}
```

#### 11.1.3 Placement History

Undo/redo placement changes:
```
History:
- fig-sec1: [htbp] → [t] → [b] → [t] (current)
  [Undo] [Redo]
```

#### 11.1.4 Smart Suggestions

AI-powered placement recommendations:
```
💡 Suggestion: This large figure would look better at bottom
   [Apply Suggestion]
```

#### 11.1.5 Placement Rules Engine

Define automatic placement rules:
```json
{
  "rules": [
    {
      "condition": "figureWidth > 0.9",
      "action": "move_bottom"
    },
    {
      "condition": "page === 1",
      "action": "move_top"
    }
  ]
}
```

### 11.2 Technical Improvements

- [ ] Real-time PDF preview during placement
- [ ] Coordinate prediction before compilation
- [ ] Parallel processing for faster regeneration
- [ ] Incremental compilation (only affected pages)
- [ ] Client-side placement validation
- [ ] A/B comparison view

---

## 12. Appendix

### 12.1 LaTeX Float Algorithm

LaTeX uses this decision tree for float placement:

```
For each float:
  ├─ Can it go HERE? [h]
  │  └─ Space available? → Place it
  │     └─ No → Try next
  ├─ Can it go TOP? [t]
  │  └─ Space available & within limits? → Place it
  │     └─ No → Try next
  ├─ Can it go BOTTOM? [b]
  │  └─ Space available & within limits? → Place it
  │     └─ No → Try next
  └─ Can it go on FLOAT PAGE? [p]
     └─ Enough floats accumulated? → Create float page
        └─ No → Defer to next page
```

### 12.2 Placement Specifier Reference

| Spec | Priority | Description | Use When |
|------|----------|-------------|----------|
| `h` | 1 | Here | Figure relates to current text |
| `t` | 2 | Top | Generic figure, top preferred |
| `b` | 3 | Bottom | Reference figure, bottom ok |
| `p` | 4 | Page | Large figure, needs own space |
| `!` | Mod | Force | Override LaTeX restrictions |
| `*` | Mod | Span | Full width in two-column |

### 12.3 File Paths Reference

```
Project Structure:
prototype-pdf-object-overlay/
├── server/
│   ├── server.js              # Main server (WebSocket + API)
│   ├── config/
│   │   └── server-config.json # Configuration file
│   └── modules/
│       ├── XMLProcessor.js     # XML modification
│       ├── DocumentConverter.js # XML→TeX→PDF
│       └── ConfigManager.js    # Config loader
├── ui-react/
│   └── src/
│       ├── components/
│       │   └── ActionModal/
│       │       └── ActionModal.jsx  # UI form
│       └── context/
│           └── AppContext.jsx       # State management
├── template/
│   ├── document.tex.xml                    # Standard template
│   └── ENDEND10921-sample-style.tex.xml   # JATS template
├── xml/
│   ├── document.xml          # Source document
│   └── ENDEND10921.xml       # JATS document
├── TeX/
│   ├── document-generated.tex              # Generated LaTeX
│   ├── document-generated.pdf              # Compiled PDF
│   ├── document-generated.log              # Compilation log
│   └── document-generated-marked-boxes.json # Coordinates
└── docs/
    └── FIGURE-PLACEMENT-COMPLETE-GUIDE.md  # This file
```

### 12.4 Glossary

**Float**
: In LaTeX, an object (figure/table) that can "float" to optimal position

**Placement Specifier**
: Letters in brackets `[htbp]` telling LaTeX where to try placing a float

**JATS**
: Journal Article Tag Suite - XML schema for scientific articles

**NDJSON**
: Newline-Delimited JSON - one JSON object per line

**zref-savepos**
: LaTeX package for extracting precise coordinates

**Overlay**
: Semi-transparent rectangle drawn over PDF to show element boundaries

**Marked Boxes**
: JSON format containing element coordinates and page numbers

**Two-Column Layout**
: Document format with two columns of text per page

**Schema Detection**
: Automatic identification of XML tag structure (standard vs JATS)

**WebSocket**
: Real-time bidirectional communication protocol

### 12.5 Related Resources

**LaTeX Documentation:**
- [LaTeX Float Placement](https://www.overleaf.com/learn/latex/Positioning_of_Figures)
- [Two-Column Documents](https://www.overleaf.com/learn/latex/Multiple_columns)
- [Float Parameters](https://www.overleaf.com/learn/latex/Floats,_figures_and_captions)

**Project Documentation:**
- `docs/PROJECT-STRUCTURE.md` - Complete project structure
- `docs/COORDINATE-SYNC-README.md` - Coordinate extraction system
- `docs/DOCUMENT-GENERATION-GUIDE.md` - Document generation workflow
- `docs/XML-SCHEMA-ADAPTATION.md` - Multi-schema support

**Validation:**
- `scripts/validate-figure-placement.js` - Configuration validator
- `scripts/generate-pdf-robust.sh` - Manual PDF generation

### 12.6 Quick Command Reference

```bash
# Start system
cd server && node server.js
cd ui-react && npm run dev

# Validate configuration
node scripts/validate-figure-placement.js

# Manual PDF generation
cd TeX
lualatex document-generated.tex

# Check logs
tail -f server/logs/audit.log

# View JSON coordinates
cat ui/document-generated-marked-boxes.json | jq '.'

# Find specific figure
cat ui/document-generated-marked-boxes.json | jq '.[] | select(.id=="fig-sec1")'

# Count figures
cat ui/document-generated-marked-boxes.json | jq '[.[] | select(.id | startswith("fig-"))] | length'
```

### 12.7 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-03 | Initial implementation with 3 placement options |
| 1.0.1 | 2025-11-03 | Renamed "Move Left Column" to "Place Here" (more accurate) |
| 1.1.0 | TBD | Add "Span Both Columns" option |

---

## Summary

This guide covers everything you need to know about the Figure Placement feature:

✅ **Quick Start** - Get started in 5 steps  
✅ **Implementation** - Complete workflow and architecture  
✅ **LaTeX Understanding** - How two-column placement really works  
✅ **Configuration** - All config options explained  
✅ **Templates** - Integration with XML templates  
✅ **Examples** - Real-world usage scenarios  
✅ **Troubleshooting** - Solutions to common issues  
✅ **Advanced** - Custom placement and future features  

The feature is **production-ready** and follows the existing XML → TeX → PDF → JSON coordination approach.

---

**Document Information:**
- **Created**: November 3, 2025
- **Last Updated**: November 3, 2025  
- **Version**: 1.0.1
- **Status**: ✅ Complete & Validated
- **Author**: PDF Object Overlay Team

For questions or issues, refer to the [Troubleshooting](#9-troubleshooting) section or run the validation script.

