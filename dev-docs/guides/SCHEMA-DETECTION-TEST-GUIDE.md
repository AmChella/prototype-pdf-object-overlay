# 🧪 Testing Dynamic Schema Detection

Quick guide to test the dynamic XML schema detection feature.

---

## 🎯 What Was Fixed

**Problem**: Instructions failed on ENDEND10921.xml with error:
```
Failed to apply processing rule: Error: No elements found matching xpath: //figure[@id='fig-F1']
```

**Root Cause**: ENDEND10921.xml uses `<fig>` tags instead of `<figure>`, but XPath queries were hardcoded to `//figure`.

**Solution**: Implemented automatic schema detection that adapts XPath queries based on the document being processed.

---

## 📋 Schema Differences

### document.xml (Standard Schema)
```xml
<article>
  <para id="sec1-p1">Paragraph text</para>
  <figure id="fig-1">
    <caption>Figure caption</caption>
  </figure>
</article>
```

**Element Names:**
- Paragraph: `<para>`
- Figure: `<figure>`

---

### ENDEND10921.xml (ENDEND Schema)
```xml
<article>
  <p id="sec1-p1">Paragraph text</p>
  <fig id="fig-F1">
    <caption>Figure caption</caption>
  </fig>
</article>
```

**Element Names:**
- Paragraph: `<p>`
- Figure: `<fig>`

---

## 🧪 Test Cases

### Test 1: Process Instruction on document.xml

**Setup:**
1. Generate document: `document`
2. Apply instruction to a figure element

**Expected Console Output:**
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

**Result:** ✅ Instruction applied successfully

---

### Test 2: Process Instruction on ENDEND10921.xml

**Setup:**
1. Generate document: `ENDEND10921`
2. Apply instruction to figure element (e.g., `fig-F1`)

**Expected Console Output:**
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

**Result:** ✅ Instruction applied successfully (no more "No elements found" error!)

---

## 🚀 How to Test

### Using WebSocket (wscat)

```bash
# Install wscat if needed
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8081

# 1. Generate ENDEND10921 document
{"type":"generate_document","documentName":"ENDEND10921"}

# 2. Wait for generation_complete message

# 3. Apply instruction to a figure
{"type":"instruction","elementId":"fig-F1","overlayType":"figure","instruction":"move_bottom"}

# 4. Watch console for schema detection logs
```

### Using React UI

```bash
# Start server
npm run server

# Start React UI (in another terminal)
npm run dev:react

# Steps:
# 1. Open http://localhost:5173
# 2. Select "ENDEND10921" from document dropdown
# 3. Click "Generate PDF"
# 4. Click on a figure element (e.g., fig-F1)
# 5. Select "Move Bottom" from dropdown
# 6. Apply instruction
# 7. Check server console for schema detection logs
```

---

## 📊 Verification Checklist

- [ ] Server starts without errors
- [ ] ENDEND10921 document generates successfully
- [ ] Console shows "Detected XML schema: endend"
- [ ] Console shows correct tag mappings (fig, p)
- [ ] Original XPath shows "//figure"
- [ ] Adapted XPath shows "//fig"
- [ ] Instruction applies successfully
- [ ] No "No elements found" errors
- [ ] XML file is updated correctly
- [ ] PDF regenerates with changes
- [ ] Version is saved to database

---

## 🐛 Troubleshooting

### Still getting "No elements found" error?

**Check 1: Current Document Set?**
```javascript
// In server console, verify:
console.log('Current document:', this.currentDocument);
// Should show: 'ENDEND10921' when working with that document
```

**Check 2: XML Path Correct?**
```javascript
// In server console, verify:
console.log('XML path:', xmlPath);
// Should show: /path/to/xml/ENDEND10921.xml
```

**Check 3: Schema Detected?**
```javascript
// In server console, look for:
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
```

**Check 4: Element ID Exists?**
```bash
# Check if element exists in XML
grep 'id="fig-F1"' xml/ENDEND10921.xml
# Should show: <fig id="fig-F1">
```

---

## 📝 Key Files Modified

1. **server/modules/XMLProcessor.js**
   - Added `loadXMLDocument(customXmlPath)` parameter
   - Added `saveXMLDocument(customXmlPath)` parameter
   - Added `applyInstruction(..., xmlPath)` parameter
   - Stores `this.currentXmlPath` for correct saving

2. **server/server.js**
   - Determines XML path before applying instruction
   - Passes XML path to `XMLProcessor.applyInstruction()`
   - Ensures correct document schema is loaded

---

## ✅ Success Criteria

The feature is working correctly if:

1. ✅ **No "No elements found" errors** when processing ENDEND10921
2. ✅ **Schema auto-detected** (console shows "Detected XML schema: endend")
3. ✅ **XPath adapted** (console shows both original and adapted XPath)
4. ✅ **Instructions applied** (XML file modified correctly)
5. ✅ **PDF regenerated** (changes visible in output)
6. ✅ **Works for both schemas** (document.xml AND ENDEND10921.xml)

---

## 🎉 Expected Results

### Before Fix
```
❌ Failed to apply processing rule: Error: No elements found matching xpath: //figure[@id='fig-F1']
```

### After Fix
```
✅ XML document loaded: /path/to/xml/ENDEND10921.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
🔍 Original XPath: //figure[@id='fig-F1']
🔍 Adapted XPath: //fig[@id='fig-F1']
📍 Found 1 matching element(s)
✅ Set attribute placement="[b]" on element fig
✅ XML document saved: /path/to/xml/ENDEND10921.xml
💾 Version saved successfully
✅ Instruction processing complete
```

---

## 📚 Documentation

For more details, see:
- [Dynamic Schema Detection](./dev-docs/features/DYNAMIC-SCHEMA-DETECTION.md)
- [XML Processor Module](./dev-docs/modules/XML-PROCESSOR.md)
- [Version Control System](./dev-docs/features/VERSION-CONTROL.md)

---

**Dynamic Schema Detection is Active! 🎉**

*Test thoroughly with both document.xml and ENDEND10921.xml*

*Last Updated: November 5, 2025*

