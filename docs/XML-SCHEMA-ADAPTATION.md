# XML Schema Adaptation - Dynamic Tag Support

## 🎯 Problem

Different XML documents use different tag names for the same semantic elements:

**ENDEND10921.xml (ENDEND Schema):**
```xml
<fig id="fig-sec1">...</fig>
<p id="para-1">...</p>
```

**document.xml (Standard Schema):**
```xml
<figure id="figure-1">...</figure>
<para id="para-1">...</para>
```

This caused XPath queries to fail when processing different documents:
```
❌ Error: No elements found matching xpath: //fig[@id='fig-sec7']
```

## ✅ Solution

The system now **auto-detects XML schema** and dynamically adapts XPath queries to work with both formats!

### How It Works

1. **Schema Detection** - When loading an XML document, the system scans for tag usage:
   ```javascript
   detectXMLSchema() {
       const hasFigTag = xpath.select('//fig', this.xmlDocument).length > 0;
       const hasFigureTag = xpath.select('//figure', this.xmlDocument).length > 0;
       // Returns appropriate schema
   }
   ```

2. **XPath Adaptation** - XPath queries are automatically converted:
   ```
   Config:    //figure[@id='{elementId}']
   
   For ENDEND: //fig[@id='fig-sec1']      ✅
   For Standard: //figure[@id='figure-1']  ✅
   ```

3. **Tag Mapping** - Schema definitions map semantic types to actual tags:
   ```javascript
   schemaDefinitions = {
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
   }
   ```

## 🚀 Usage

### No Configuration Required!

The system automatically:
1. Detects which schema your XML uses
2. Adapts all XPath queries
3. Logs the detected schema

### Console Output

```
✅ XML document loaded: /path/to/ENDEND10921.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>

🔍 Original XPath: //figure[@id='fig-sec1']
🔍 Adapted XPath: //fig[@id='fig-sec1']
📍 Found 1 matching element(s)
```

## 📊 Supported Schemas

### ENDEND Schema
- Figure: `<fig>`
- Paragraph: `<p>`
- Table: `<table>`

### Standard Schema
- Figure: `<figure>`
- Paragraph: `<para>`
- Table: `<table>`

## 🔧 Configuration

### XPath Rules (server-config.json)

XPath rules should be written using **standard schema tags**:

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
    },
    "paragraph": {
      "para_tight": {
        "xpath": "//para[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "spacing",
        "value": "tight"
      }
    }
  }
}
```

The system will automatically convert these to the correct tags based on the detected schema.

## 🧪 Testing

### Test with ENDEND10921.xml

1. Generate ENDEND10921 document:
   ```bash
   # Click "Article Sample" button in UI
   ```

2. Try to move a figure:
   - Should detect `endend` schema
   - Should use `//fig[@id='...']` XPath
   - Should succeed! ✅

### Test with document.xml

1. Generate document.xml:
   ```bash
   # Click "Sample Document" button in UI
   ```

2. Try to move a figure:
   - Should detect `standard` schema
   - Should use `//figure[@id='...']` XPath
   - Should succeed! ✅

## 🔍 Debugging

### Check Schema Detection

Look for these log messages in the server console:

```
✅ XML document loaded: /path/to/file.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
```

### Check XPath Adaptation

When processing instructions, you'll see:

```
🔍 Original XPath: //figure[@id='fig-sec1']
🔍 Adapted XPath: //fig[@id='fig-sec1']
```

### Common Issues

#### ❌ "No elements found matching xpath"

**Cause:** Schema detection might have failed, or element ID is wrong.

**Solution:**
1. Check the console for schema detection logs
2. Verify the element ID exists in the XML
3. Check if the element uses a different tag than expected

#### ⚠️ "Could not detect XML schema"

**Cause:** XML doesn't contain any recognized tags.

**Solution:**
1. Verify the XML is valid
2. Check if it uses standard tags (figure/para) or ENDEND tags (fig/p)
3. System will default to standard schema

## 🎨 Adding New Schemas

To support additional XML schemas:

1. **Add schema definition:**
   ```javascript
   this.schemaDefinitions = {
       'myschema': {
           figure: 'image',
           paragraph: 'text',
           table: 'grid'
       }
   };
   ```

2. **Add detection logic:**
   ```javascript
   detectXMLSchema() {
       const hasImageTag = xpath.select('//image', this.xmlDocument).length > 0;
       if (hasImageTag) {
           return { name: 'myschema', tags: this.schemaDefinitions.myschema };
       }
       // ... existing logic
   }
   ```

3. **Update adaptation:**
   ```javascript
   adaptXPathToSchema(xpathQuery) {
       // Add custom tag replacements if needed
   }
   ```

## 📁 Files Modified

- `server/modules/XMLProcessor.js` - Added schema detection and XPath adaptation
- `server/config/server-config.json` - Updated XPath rules to use standard tags

## 🎉 Benefits

✅ **No manual XML editing required**  
✅ **Works with multiple XML formats automatically**  
✅ **Transparent to users**  
✅ **Easy to add new schemas**  
✅ **Better error messages**  

## 🔗 Related Documentation

- [Document Generation Guide](DOCUMENT-GENERATION-GUIDE.md)
- [XMLProcessor API](../server/modules/XMLProcessor.js)
- [Server Configuration](../server/config/server-config.json)

