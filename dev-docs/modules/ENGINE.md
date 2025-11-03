# 🔧 Engine Module (engine.js)

The **Engine** is the core transformation module that converts XML documents to TeX format using declarative template files.

---

## 📋 Overview

**File**: `src/engine.js`  
**Purpose**: Template-driven XML to TeX transformation  
**Dependencies**: `peggy`, `xmldom`, `nanoid`

### Key Responsibilities
- Parse XML documents
- Load and parse template files
- Match XML elements using CSS-like selectors
- Transform content using template rules
- Generate TeX output

---

## 🏗️ Architecture

### Core Components

1. **Selector Parser** - Parses CSS-like selectors for XML matching
2. **Template Parser** - Parses template placeholders and filters
3. **Transformation Engine** - Applies templates recursively
4. **Filter System** - Transforms text (escape, format, etc.)

### Transformation Flow

```
XML Input + Template File
    ↓
Parse XML Document
    ↓
Load Template
    ↓
Parse Selectors
    ↓
Match Elements
    ↓
Apply Templates Recursively
    ↓
Generate TeX Output
```

---

## 📚 API Reference

### Main Function

#### `transformXMLToTeX(xmlPath, templatePath, outputPath)`

Transforms an XML document to TeX format.

**Parameters**:
- `xmlPath` (string): Path to input XML file
- `templatePath` (string): Path to template file (`.tex.xml`)
- `outputPath` (string): Path for output TeX file

**Returns**: 
- Promise<string>: Path to generated TeX file

**Example**:
```javascript
const engine = require('./engine');

const outputPath = await engine.transformXMLToTeX(
    'xml/document.xml',
    'template/document.tex.xml',
    'TeX/output.tex'
);

console.log('Generated:', outputPath);
```

---

## 🎯 Template System

### Template Structure

Templates are XML files with special elements for transformation.

```xml
<?xml version="1.0"?>
<tex-templates>
    <!-- Match XML element -->
    <template match="section">
        <!-- Generate TeX command -->
        <tex-cmd name="section">
            <!-- Insert content -->
            [[./title/text()]]
        </tex-cmd>
        
        <!-- Apply child templates -->
        <apply-children/>
    </template>
</tex-templates>
```

### Selector Syntax

Uses CSS-like selectors to match XML elements:

```xml
<!-- Match by tag name -->
<template match="section">

<!-- Match with attribute -->
<template match="section[id]">

<!-- Match with specific attribute value -->
<template match="section[type='introduction']">

<!-- Match direct children -->
<template match="article > section">

<!-- Match all descendants -->
<template match="article section">

<!-- Match any element -->
<template match="*">
```

### Placeholders

Extract content from XML using XPath-like expressions:

```xml
<!-- Text content -->
[[./text()]]

<!-- Attribute value -->
[[@id]]

<!-- Child element -->
[[./title/text()]]

<!-- With filters -->
[[./text() | escape]]
[[./title/text() | trim | escape]]
```

### Filters

Transform extracted content:

| Filter | Purpose | Example |
|--------|---------|---------|
| `escape` | Escape TeX special characters | `[[text() \| escape]]` |
| `trim` | Remove leading/trailing whitespace | `[[text() \| trim]]` |
| `lower` | Convert to lowercase | `[[text() \| lower]]` |
| `upper` | Convert to uppercase | `[[text() \| upper]]` |
| `normalize` | Normalize whitespace | `[[text() \| normalize]]` |

**Custom Filter Example**:
```javascript
// In engine.js, modify FILTERS object
const FILTERS = {
    escape: (text) => {
        return text.replace(/([&%$#_{}~^\\])/g, '\\$1');
    },
    myFilter: (text) => {
        // Custom transformation
        return text.toUpperCase();
    }
};
```

---

## 🔍 Detailed Examples

### Example 1: Basic Section Transformation

**XML**:
```xml
<section id="intro">
    <title>Introduction</title>
    <para>This is the introduction text.</para>
</section>
```

**Template**:
```xml
<template match="section">
    <tex-cmd name="section">[[@id]]</tex-cmd>
    <apply-children/>
</template>

<template match="title">
    [[./text() | escape]]
</template>

<template match="para">
    [[./text() | escape]]
    <tex-text>\par</tex-text>
</template>
```

**Output TeX**:
```tex
\section{intro}
Introduction
This is the introduction text.
\par
```

### Example 2: Figure with Caption

**XML**:
```xml
<figure id="fig-1">
    <image src="diagram.png"/>
    <caption>System architecture diagram</caption>
</figure>
```

**Template**:
```xml
<template match="figure">
    <tex-text>\begin{figure}</tex-text>
    <tex-text>\centering</tex-text>
    <apply-children/>
    <tex-text>\end{figure}</tex-text>
</template>

<template match="image">
    <tex-cmd name="includegraphics">[[@src]]</tex-cmd>
</template>

<template match="caption">
    <tex-cmd name="caption">[[./text() | escape]]</tex-cmd>
</template>
```

**Output TeX**:
```tex
\begin{figure}
\centering
\includegraphics{diagram.png}
\caption{System architecture diagram}
\end{figure}
```

### Example 3: Conditional Processing

**XML**:
```xml
<section type="appendix">
    <title>Appendix A</title>
</section>

<section type="main">
    <title>Chapter 1</title>
</section>
```

**Template**:
```xml
<!-- Match appendix sections -->
<template match="section[type='appendix']">
    <tex-cmd name="appendix"/>
    <apply-children/>
</template>

<!-- Match main sections -->
<template match="section[type='main']">
    <tex-cmd name="chapter">[[./title/text()]]</tex-cmd>
    <apply-children/>
</template>
```

**Output TeX**:
```tex
\appendix
Appendix A

\chapter{Chapter 1}
```

---

## ⚙️ Configuration

### Template Specificity

When multiple templates match an element, specificity determines which applies:

**Specificity Rules**:
1. More specific attributes > fewer attributes
2. Tag name > wildcard (`*`)
3. Later templates > earlier templates (same specificity)

**Example**:
```xml
<!-- Specificity: [1, 1, 1] - Most specific -->
<template match="section[type='intro']">
    <tex-cmd name="chapter">...</tex-cmd>
</template>

<!-- Specificity: [1, 1, 0] -->
<template match="section[type]">
    <tex-cmd name="section">...</tex-cmd>
</template>

<!-- Specificity: [1, 0, 0] - Least specific -->
<template match="section">
    <tex-text>Section content</tex-text>
</template>
```

---

## 🐛 Error Handling

### Common Errors

#### 1. **Template Parse Error**
```javascript
Error: Failed to parse template: Invalid selector syntax
```
**Solution**: Check selector syntax in template file

#### 2. **XML Parse Error**
```javascript
Error: Non-whitespace before first tag
```
**Solution**: Ensure XML file is well-formed

#### 3. **Missing Template**
```javascript
Warning: No template found for element 'unknown-element'
```
**Solution**: Add template for the element or use a wildcard template

### Debug Mode

Enable verbose logging:
```javascript
const engine = require('./engine');

// Set environment variable
process.env.DEBUG = 'true';

// Or modify engine.js temporarily
const DEBUG = true;  // Add at top of engine.js
```

---

## 🧪 Testing

### Unit Tests

```javascript
const engine = require('./engine');
const fs = require('fs-extra');

describe('Engine', () => {
    it('should transform XML to TeX', async () => {
        const result = await engine.transformXMLToTeX(
            'test/sample.xml',
            'test/template.tex.xml',
            'test/output.tex'
        );
        
        const content = await fs.readFile(result, 'utf8');
        expect(content).toContain('\\section{Introduction}');
    });
});
```

### Integration Tests

```bash
# Test with real XML file
node src/cli.js --input xml/document.xml --template template/document.tex.xml
```

---

## 🚀 Performance

### Optimization Tips

1. **Cache Parsed Templates**: Reuse parsed templates for multiple transformations
2. **Minimize Recursion Depth**: Keep template nesting shallow
3. **Use Specific Selectors**: More specific selectors are faster
4. **Avoid Complex Filters**: Complex transformations slow processing

### Performance Metrics

Typical transformation times:
- Small document (<100 elements): ~50ms
- Medium document (100-1000 elements): ~200ms
- Large document (>1000 elements): ~500ms+

---

## 🔧 Extending the Engine

### Adding Custom Filters

```javascript
// In engine.js, add to FILTERS object
const FILTERS = {
    // Existing filters...
    
    // Custom filter: Convert to title case
    titleCase: (text) => {
        return text.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },
    
    // Custom filter: Remove XML tags
    stripTags: (text) => {
        return text.replace(/<[^>]*>/g, '');
    }
};
```

**Usage in Template**:
```xml
<template match="title">
    [[./text() | titleCase | escape]]
</template>
```

### Adding Custom Template Elements

```javascript
// In transformTemplate function, add new case
case 'my-custom-element':
    return handleCustomElement(templateNode, context);
```

---

## 📚 Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Getting Started](../GETTING-STARTED.md)
- [TeX to PDF Module](./TEX-TO-PDF.md)
- [Template Examples](../../template/)

---

## ❓ FAQ

**Q: Can I use XPath in selectors?**  
A: Selectors use CSS-like syntax, not full XPath. Use placeholders for XPath expressions.

**Q: How do I debug template matching?**  
A: Enable DEBUG mode and check console output for matched templates.

**Q: Can templates be nested?**  
A: Yes, use `<apply-children/>` or `[[...]]` to process nested content.

**Q: How do I handle special characters?**  
A: Use the `escape` filter to escape TeX special characters.

---

**Last Updated**: November 3, 2025

