# 🔄 Dynamic XML Schema Detection

Automatic detection and adaptation of XML element names based on document structure.

---

## 📋 Overview

Different documents use different XML schemas with different element naming conventions. The system automatically detects which schema is being used and adapts all XPath queries accordingly.

### Problem

- **document.xml** uses: `<figure>`, `<para>`, `<table>`
- **ENDEND10921.xml** uses: `<fig>`, `<p>`, `<table>`

Without dynamic detection, XPath queries like `//figure[@id='fig-F1']` would fail on ENDEND10921 documents.

### Solution

The XMLProcessor automatically:
1. **Detects** the XML schema when loading a document
2. **Adapts** all XPath queries to use the correct element names
3. **Applies** instructions successfully regardless of schema

---

## 🏗️ How It Works

### 1. Schema Detection

When an XML document is loaded, the system checks for specific element tags:

```javascript
detectXMLSchema() {
    // Check for ENDEND schema
    const hasFigTag = xpath.select('//fig', this.xmlDocument).length > 0;
    const hasPTag = xpath.select('//p', this.xmlDocument).length > 0;
    
    // Check for standard schema
    const hasFigureTag = xpath.select('//figure', this.xmlDocument).length > 0;
    const hasParaTag = xpath.select('//para', this.xmlDocument).length > 0;
    
    if (hasFigTag || hasPTag) {
        return { name: 'endend', tags: { figure: 'fig', paragraph: 'p', table: 'table' } };
    } else {
        return { name: 'standard', tags: { figure: 'figure', paragraph: 'para', table: 'table' } };
    }
}
```

### 2. XPath Adaptation

Before executing any XPath query, the system automatically replaces standard tag names with schema-specific names:

```javascript
adaptXPathToSchema(xpathQuery) {
    let adaptedQuery = xpathQuery;
    
    // Replace figure → fig (for ENDEND schema)
    adaptedQuery = adaptedQuery.replace(/\/\/figure/g, `//fig`);
    
    // Replace para → p (for ENDEND schema)
    adaptedQuery = adaptedQuery.replace(/\/\/para/g, `//p`);
    
    return adaptedQuery;
}
```

### 3. Automatic Application

```
Original XPath:  //figure[@id='fig-F1']
Detected Schema: ENDEND
Adapted XPath:   //fig[@id='fig-F1']    ✅ Works!
```

---

## 📚 Supported Schemas

### Standard Schema
Used by: `document.xml`

```xml
<article>
  <para id="sec1-para1">Text content</para>
  <figure id="fig-1">
    <caption>Figure caption</caption>
  </figure>
  <table id="tbl-1">
    <caption>Table caption</caption>
  </table>
</article>
```

**Element Mapping:**
- Figure: `<figure>`
- Paragraph: `<para>`
- Table: `<table>`

---

### ENDEND Schema
Used by: `ENDEND10921.xml`

```xml
<article>
  <p id="sec1-para1">Text content</p>
  <fig id="fig-F1">
    <caption>Figure caption</caption>
  </fig>
  <table id="tbl-1">
    <caption>Table caption</caption>
  </table>
</article>
```

**Element Mapping:**
- Figure: `<fig>`
- Paragraph: `<p>`
- Table: `<table>`

---

## 🎯 Usage Example

### Processing Instructions

```javascript
// Client sends instruction (same for both schemas)
ws.send(JSON.stringify({
    type: 'instruction',
    elementId: 'fig-F1',
    overlayType: 'figure',
    instruction: 'move_bottom'
}));

// Server automatically:
// 1. Determines which document (document or ENDEND10921)
// 2. Loads correct XML file
// 3. Detects schema (standard or endend)
// 4. Adapts XPath (//figure → //fig if ENDEND)
// 5. Applies instruction successfully
```

### Console Output

**For ENDEND10921.xml:**
```
✅ XML document loaded: /path/to/xml/ENDEND10921.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
🔍 Original XPath: //figure[@id='fig-F1']
🔍 Adapted XPath: //fig[@id='fig-F1']
📍 Found 1 matching element(s)
✅ Set attribute placement="[b]" on element fig
```

**For document.xml:**
```
✅ XML document loaded: /path/to/xml/document.xml
📋 Detected XML schema: standard
   Figure tag: <figure>
   Paragraph tag: <para>
🔍 Original XPath: //figure[@id='fig-1']
🔍 Adapted XPath: //figure[@id='fig-1']
📍 Found 1 matching element(s)
✅ Set attribute placement="[b]" on element figure
```

---

## 🔧 Configuration

### server-config.json

The processing rules use standard tag names. They are automatically adapted:

```json
{
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
}
```

**No changes needed!** The system automatically converts `//figure` to `//fig` when processing ENDEND documents.

---

## 🔍 Schema Definitions

Located in `XMLProcessor.js`:

```javascript
this.schemaDefinitions = {
    'endend': {
        figure: 'fig',
        paragraph: 'p',
        table: 'table'
    },
    'standard': {
        figure: 'figure',
        paragraph: 'para',
        table: 'table'
    }
};
```

### Adding a New Schema

To support a new document schema:

1. **Add schema definition:**
```javascript
this.schemaDefinitions = {
    'myschema': {
        figure: 'image',
        paragraph: 'text',
        table: 'grid'
    },
    // ... existing schemas
};
```

2. **Update detection logic:**
```javascript
detectXMLSchema() {
    // Check for your schema
    const hasImageTag = xpath.select('//image', this.xmlDocument).length > 0;
    
    if (hasImageTag) {
        return {
            name: 'myschema',
            tags: this.schemaDefinitions.myschema
        };
    }
    // ... existing checks
}
```

3. **No changes needed** in `server-config.json` or processing rules!

---

## ✅ Benefits

1. **Single Configuration**: One set of processing rules works for all schemas
2. **Automatic Detection**: No manual schema selection needed
3. **Error Prevention**: Eliminates "No elements found" errors
4. **Easy Extension**: Add new schemas by updating definitions only
5. **Transparent to Users**: Works automatically without user intervention

---

## 🐛 Troubleshooting

### "No elements found matching xpath"

**Cause**: Schema detection might have failed or element doesn't exist.

**Check:**
1. Console logs show detected schema
2. Element ID is correct
3. Element actually exists in the XML

**Debug:**
```javascript
// Check what schema was detected
console.log('Detected schema:', this.xmlSchema.name);
console.log('Figure tag:', this.xmlSchema.tags.figure);

// Check adapted XPath
console.log('Original XPath:', xpathQuery);
console.log('Adapted XPath:', adaptedXPath);
```

---

## 📚 Related Documentation

- [XML Processor Module](../modules/XML-PROCESSOR.md)
- [Server Module](../modules/SERVER.md)
- [Instruction Processing Workflow](../workflows/INSTRUCTION-PROCESSING.md)

---

**Dynamic Schema Detection Active! 🎉**

*Works automatically with all supported document schemas*

*Last Updated: November 5, 2025*

