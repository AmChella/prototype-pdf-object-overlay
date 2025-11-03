# Bug Fix: Correct Template Selection on Update

## 🐛 Problem

**Issue:** When applying instructions to update a document, the system was using the **wrong template** to regenerate the PDF.

**Example:**
- User loads `document.xml`
- User applies instruction (e.g., "Move Figure to Bottom")
- System updates `document.xml` correctly ✅
- System regenerates using `ENDEND10921-sample-style.tex.xml` ❌ **WRONG!**
- Should use `document.tex.xml` instead ✅

**Root Cause:**

In `DocumentConverter.js`, the template path was hardcoded:

```javascript
this.templatePath = path.join(
  __dirname,
  "../../template/ENDEND10921-sample-style.tex.xml"
);
```

When `processInstruction()` called `xmlToTex()` without parameters, it defaulted to this hardcoded ENDEND10921 template, regardless of which document was actually loaded.

---

## ✅ Solution

**Fixed the `processInstruction()` method** to:

1. Check which document is currently loaded (`this.currentDocument`)
2. Determine the correct XML path, template path, and output name
3. Pass these explicitly to `xmlToTex()` and `texToPdf()`
4. Log which document and template are being used

---

## 📝 Changes Made

### server/server.js - processInstruction()

**Before:**
```javascript
// Convert XML to TeX
console.log('🔄 Converting XML to TeX...');
const texResult = await this.documentConverter.xmlToTex();
// ❌ Uses hardcoded ENDEND10921 template!
```

**After:**
```javascript
// Determine correct XML and template paths based on current document
let xmlPath, templatePath, outputName;
if (this.currentDocument === 'ENDEND10921') {
    xmlPath = path.join(this.projectRoot, 'xml/ENDEND10921.xml');
    templatePath = path.join(this.projectRoot, 'template/ENDEND10921-sample-style.tex.xml');
    outputName = 'ENDEND10921-generated';
} else if (this.currentDocument === 'document') {
    xmlPath = path.join(this.projectRoot, 'xml/document.xml');
    templatePath = path.join(this.projectRoot, 'template/document.tex.xml');
    outputName = 'document-generated';
} else {
    // Fallback to config if no current document is set
    console.warn('⚠️  No current document set, using config defaults');
    xmlPath = this.configManager.getFilePath('xmlInput');
    templatePath = path.join(this.projectRoot, 'template/document.tex.xml');
    outputName = 'document-generated';
}

console.log(`📋 Using document: ${this.currentDocument || 'default'}`);
console.log(`📄 XML path: ${xmlPath}`);
console.log(`📋 Template path: ${templatePath}`);

// Convert XML to TeX with correct template
console.log('🔄 Converting XML to TeX...');
const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath, outputName);
// ✅ Uses correct template based on current document!
```

---

## 🎯 Document-Template Mapping

| Document | XML File | Template File | Output Name |
|----------|----------|---------------|-------------|
| **document** | `xml/document.xml` | `template/document.tex.xml` | `document-generated` |
| **ENDEND10921** | `xml/ENDEND10921.xml` | `template/ENDEND10921-sample-style.tex.xml` | `ENDEND10921-generated` |

---

## 🔍 How It Works

### Flow Diagram

```
1. User applies instruction to element
   ↓
2. XMLProcessor modifies XML file
   ↓
3. Server checks this.currentDocument
   ↓
4. Determine paths:
   - document → xml/document.xml + template/document.tex.xml
   - ENDEND10921 → xml/ENDEND10921.xml + template/ENDEND10921-sample-style.tex.xml
   ↓
5. Call xmlToTex(xmlPath, templatePath, outputName)
   ↓
6. Call texToPdf(texPath, outputName)
   ↓
7. Copy to UI directory
   ↓
8. Notify client with updated files
```

### Example: Update document.xml

```
🎯 Processing instruction: figure - move_bottom for element fig-sec1
✅ XML modified: xml/document.xml

📋 Using document: document
📄 XML path: /path/to/xml/document.xml
📋 Template path: /path/to/template/document.tex.xml

🔄 Converting XML to TeX...
📋 Using template: /path/to/template/document.tex.xml ✅
📄 Converting TeX to PDF and generating coordinates...
📁 Copying files to UI directory...
✅ Instruction processing completed successfully
```

### Example: Update ENDEND10921.xml

```
🎯 Processing instruction: figure - move_top for element absf1
✅ XML modified: xml/ENDEND10921.xml

📋 Using document: ENDEND10921
📄 XML path: /path/to/xml/ENDEND10921.xml
📋 Template path: /path/to/template/ENDEND10921-sample-style.tex.xml

🔄 Converting XML to TeX...
📋 Using template: /path/to/template/ENDEND10921-sample-style.tex.xml ✅
📄 Converting TeX to PDF and generating coordinates...
📁 Copying files to UI directory...
✅ Instruction processing completed successfully
```

---

## 🧪 Testing

### Test Scenario 1: Update document.xml

1. **Start server:**
   ```bash
   node server/server.js
   ```

2. **Open UI:**
   ```
   http://localhost:3000/ui/
   ```

3. **Generate document.xml:**
   - Click "Sample Document" button
   - Wait for generation

4. **Apply instruction:**
   - Click any figure overlay (e.g., `fig-sec1`)
   - Select "Move Bottom"
   - Click "Apply"

5. **Check console:**
   ```
   📋 Using document: document
   📋 Template path: .../template/document.tex.xml ✅
   ```

6. **Verify result:**
   - PDF regenerates correctly
   - Figure appears at bottom of page
   - No template mismatch errors

### Test Scenario 2: Update ENDEND10921.xml

1. **Generate ENDEND10921.xml:**
   - Click "Article Sample" button
   - Wait for generation

2. **Apply instruction:**
   - Click any figure overlay (e.g., `absf1`)
   - Select "Move Top"
   - Click "Apply"

3. **Check console:**
   ```
   📋 Using document: ENDEND10921
   📋 Template path: .../template/ENDEND10921-sample-style.tex.xml ✅
   ```

4. **Verify result:**
   - PDF regenerates correctly
   - Figure appears at top of page
   - Correct template used

### Test Scenario 3: Switch Between Documents

1. **Generate document.xml:**
   - Click "Sample Document"
   - Apply instruction
   - Verify uses `document.tex.xml` ✅

2. **Generate ENDEND10921.xml:**
   - Click "Article Sample"
   - Apply instruction
   - Verify uses `ENDEND10921-sample-style.tex.xml` ✅

3. **Generate document.xml again:**
   - Click "Sample Document"
   - Apply instruction
   - Verify uses `document.tex.xml` ✅

---

## 📊 Before vs After

### Before (❌ Wrong Template)

```
User loads: document.xml
User applies: Move figure to bottom
System uses:  xml/document.xml ✅
System uses:  template/ENDEND10921-sample-style.tex.xml ❌ WRONG!
Result:       Compilation may fail or produce incorrect output
```

### After (✅ Correct Template)

```
User loads: document.xml
User applies: Move figure to bottom
System uses:  xml/document.xml ✅
System uses:  template/document.tex.xml ✅ CORRECT!
Result:       PDF regenerates correctly with proper styling
```

---

## 🎯 Key Changes

1. **Template Selection Logic**
   - Checks `this.currentDocument` state
   - Maps document name to correct template
   - Provides fallback to config defaults

2. **Explicit Parameters**
   - Passes `xmlPath`, `templatePath`, `outputName` explicitly
   - No longer relies on defaults or config
   - Clear and traceable

3. **Logging**
   - Shows which document is active
   - Shows which template is being used
   - Easy to debug and verify

4. **Fallback Behavior**
   - If no current document, warns user
   - Falls back to config defaults
   - Prevents hard failures

---

## ⚠️ Important Notes

### Current Document Tracking

`this.currentDocument` is set when:
- User generates a document via UI buttons
- Set in `generateDocument()` method

If a user directly loads a PDF without generating (not currently possible in UI), the fallback kicks in.

### Adding New Documents

To support a new document, add a case in `processInstruction()`:

```javascript
else if (this.currentDocument === 'newdocument') {
    xmlPath = path.join(this.projectRoot, 'xml/newdocument.xml');
    templatePath = path.join(this.projectRoot, 'template/newdocument.tex.xml');
    outputName = 'newdocument-generated';
}
```

And in `generateDocument()`:

```javascript
else if (documentName === 'newdocument') {
    xmlPath = path.join(this.projectRoot, 'xml/newdocument.xml');
    templatePath = path.join(this.projectRoot, 'template/newdocument.tex.xml');
    outputName = 'newdocument-generated';
}
```

---

## 🔗 Related Files

- `server/server.js` - processInstruction() and generateDocument()
- `server/modules/DocumentConverter.js` - xmlToTex() and texToPdf()
- `ui/app.js` - generateDocument() client-side

---

## ✅ Checklist

- [x] Template selection logic implemented
- [x] Explicit parameters passed to converter
- [x] Logging added for debugging
- [x] Fallback behavior implemented
- [x] No linter errors
- [x] Documentation created
- [ ] Tested with document.xml
- [ ] Tested with ENDEND10921.xml
- [ ] Tested switching between documents

---

## 🎉 Status

**Fix:** ✅ COMPLETE  
**Testing:** Ready to test  
**Documentation:** ✅ Complete  

**Next Step:** Restart server and test with both documents!

---

**Date:** October 23, 2025  
**Issue:** Wrong template used on document updates  
**Solution:** Explicit template selection based on current document  
**Status:** FIXED ✅

