# Quick Start: XML Schema Fix

## 🎯 Problem Fixed

**Error message you saw:**
```
❌ Error: No elements found matching xpath: //fig[@id='fig-sec7']
```

**Reason:** Different XML files use different tags (`<fig>` vs `<figure>`, `<p>` vs `<para>`)

**Solution:** System now auto-detects and adapts! ✅

---

## ⚡ Quick Test (30 seconds)

### Step 1: Test Schema Detection

```bash
node scripts/test-schema-detection.js
```

**Expected output:**
```
📋 Detected Schema: ENDEND
   Figure tag:    <fig>
   Paragraph tag: <p>

📋 Detected Schema: STANDARD
   Figure tag:    <figure>
   Paragraph tag: <para>

✅ Test completed successfully!
```

### Step 2: Start Server

```bash
node server/server.js
```

### Step 3: Open UI

```
http://localhost:3000/ui/
```

### Step 4: Test ENDEND10921.xml

1. Click **"Article Sample"** button
2. Wait for generation
3. Click any figure overlay (e.g., `absf1`)
4. Select **"Move Bottom"**
5. Click **"Apply"**
6. Should work! ✅

### Step 5: Test document.xml

1. Click **"Sample Document"** button
2. Wait for generation
3. Click any figure overlay (e.g., `fig-sec1`)
4. Select **"Move Top"**
5. Click **"Apply"**
6. Should work! ✅

---

## 🔍 What to Look For

### In Server Console

When loading a document, you'll see:

```
✅ XML document loaded: /path/to/ENDEND10921.xml
📋 Detected XML schema: endend
   Figure tag: <fig>
   Paragraph tag: <p>
```

When processing an instruction, you'll see:

```
🎯 Applying instruction: figure.move_bottom to element absf1
🔍 Original XPath: //figure[@id='absf1']
🔍 Adapted XPath: //fig[@id='absf1']
📍 Found 1 matching element(s)
✅ Set attribute placement="[b]" on element fig
```

---

## 📊 What Changed

### Before (❌ Failed)

```
Config:        //fig[@id='{elementId}']
document.xml:  Has <figure> tags
Result:        ❌ No elements found
```

### After (✅ Works)

```
Config:        //figure[@id='{elementId}']  (standard format)
System:        Auto-detects schema
ENDEND:        Adapts to //fig[@id='{elementId}']
Standard:      Uses //figure[@id='{elementId}']
Result:        ✅ Works for both!
```

---

## 🎨 Schema Comparison

### ENDEND10921.xml (ENDEND Schema)

```xml
<article>
  <fig id="absf1">
    <caption>Abstract Figure 1</caption>
    <graphic href="LSA-99999_absf1.png"/>
  </fig>
  
  <p id="para-1">
    This is a paragraph.
  </p>
  
  <table id="table-1">
    ...
  </table>
</article>
```

### document.xml (Standard Schema)

```xml
<article>
  <figure id="fig-sec1">
    <caption>Figure 1</caption>
    <graphic href="figure1.png"/>
  </figure>
  
  <para id="para-1">
    This is a paragraph.
  </para>
  
  <table id="table-1">
    ...
  </table>
</article>
```

### System Handles Both!

The system automatically:
1. Detects which schema is used
2. Adapts XPath queries
3. Finds elements correctly
4. Applies instructions successfully

---

## 📚 Documentation

### Quick Reference
- **This file** - Quick start (you are here!)
- **docs/BUGFIX-XML-SCHEMA.md** - Bug fix details
- **docs/XML-SCHEMA-ADAPTATION.md** - Complete technical guide
- **docs/FIX-SUMMARY-XML-SCHEMA.md** - Comprehensive summary

### Test Script
- **scripts/test-schema-detection.js** - Automated tests

### Updated Files
- **server/modules/XMLProcessor.js** - Core implementation
- **server/config/server-config.json** - Updated XPath rules
- **README.md** - User-facing docs

---

## ❓ Troubleshooting

### Issue: Schema not detected

**Check console for:**
```
⚠️  Could not detect XML schema, using standard schema
```

**Solution:** Verify XML has recognizable tags (`<fig>`, `<figure>`, `<p>`, or `<para>`)

### Issue: XPath still fails

**Check console for:**
```
🔍 Original XPath: ...
🔍 Adapted XPath: ...
❌ No elements found
```

**Solution:** Verify element ID exists in XML and matches exactly

### Issue: Wrong element found

**Check:** Element ID might be duplicated in XML

**Solution:** Ensure all element IDs are unique

---

## 🎉 Success!

If you see this in the console:

```
✅ XML document loaded
📋 Detected XML schema: endend
🔍 Adapted XPath: //fig[@id='absf1']
📍 Found 1 matching element(s)
✅ Set attribute placement="[b]" on element fig
```

**You're all set!** The fix is working correctly. 🚀

---

## 💡 Key Takeaways

1. **Automatic** - No configuration needed
2. **Transparent** - Works in background
3. **Compatible** - Handles both schemas
4. **Extensible** - Easy to add new schemas
5. **Debuggable** - Clear console logs

---

## 🚀 What's Next?

**Nothing!** The fix is complete. Just use the system normally:

1. Generate any document (ENDEND or Standard)
2. Click overlays
3. Apply instructions
4. Everything works! ✅

---

**Need more info?** See `docs/XML-SCHEMA-ADAPTATION.md`

**Found an issue?** Check `docs/BUGFIX-XML-SCHEMA.md`

**Want details?** Read `docs/FIX-SUMMARY-XML-SCHEMA.md`

---

**Status:** ✅ FIXED  
**Date:** October 23, 2025  
**Tested:** ✅ ENDEND10921.xml & document.xml

