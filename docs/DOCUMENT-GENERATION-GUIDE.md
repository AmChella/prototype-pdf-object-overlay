# Document Generation Feature - Complete Guide

## 🎉 Overview

You can now generate and manage multiple documents directly from the UI! The system supports:
- **Initial document selection** - Choose which document to generate
- **Automatic loading** - Generated PDF and coordinates load automatically
- **Document tracking** - Updates only affect the currently loaded document

## 🚀 How It Works

### Step 1: Start the Server

```bash
node server/server.js
```

The server will start on port 3000 with WebSocket on port 8081.

### Step 2: Open the UI

Open your browser and navigate to:
```
http://localhost:3000/ui/
```

### Step 3: Generate a Document

You'll see a new "Document Generation" card at the top of the sidebar with two options:

1. **📄 Sample Document** (`document.xml`)
   - Simple sample document
   - Template: `template/document.tex.xml`
   - Output: `document-generated.pdf`

2. **📰 Article Sample** (`ENDEND10921.xml`)
   - Full article with figures and tables
   - Template: `template/ENDEND10921-sample-style.tex.xml`
   - Output: `ENDEND10921-generated.pdf`

Click either button to generate that document.

### Step 4: Automatic Loading

After generation completes (typically 10-20 seconds):
- ✅ PDF automatically loads in the viewer
- ✅ Coordinate overlay data automatically loads
- ✅ Current document is tracked and displayed
- ✅ You can start interacting with overlays immediately

### Step 5: Make Changes

When you make changes to elements (e.g., move a figure):
- 🎯 Only the **currently loaded document** will be updated
- 🎯 Changes persist in that document's XML file
- 🎯 Regeneration uses the same document

## 📋 Features

### 1. Document Selection UI

Located in the sidebar as the first card:

```
┌─────────────────────────────────┐
│  🚀 Document Generation         │
├─────────────────────────────────┤
│  📄 Sample Document              │
│  document.xml                    │
├─────────────────────────────────┤
│  📰 Article Sample               │
│  ENDEND10921.xml                 │
└─────────────────────────────────┘
```

**Button States:**
- Normal: Gray border, white background
- Hover: Blue border, subtle gradient
- Active: Blue border, blue gradient (currently loaded)
- Generating: Dimmed, disabled

### 2. Current Document Tracking

After generation, you'll see:
```
Current Document: ENDEND10921
```

This shows which document is currently loaded. All subsequent updates will only affect this document.

### 3. Real-time Progress

During generation, a progress modal shows:
```
Generating ENDEND10921...
├─ Converting ENDEND10921.xml to TeX...
├─ Compiling PDF...
├─ Syncing coordinates from aux file...
└─ Loading files...
```

### 4. Automatic Coordinate Sync

The system uses `--sync-aux` flag to ensure:
- ✅ 100% accurate coordinates from aux file
- ✅ No lag from multi-pass compilation
- ✅ Perfect alignment of overlays

## 🔄 Workflow Examples

### Generate and Edit workflow

```bash
# 1. Generate a document
Click "Article Sample" button
→ Progress modal appears
→ PDF generates (~10-20 seconds)
→ Files automatically load
→ UI updates to show current document

# 2. Interact with elements
Click on a figure overlay
→ Dropdown appears with options
→ Select "Move to Bottom"
→ Changes saved to ENDEND10921.xml
→ PDF regenerates with new layout
→ Automatically reloads

# 3. Switch to different document
Click "Sample Document" button
→ Generates document.xml
→ Automatically loads new PDF
→ Current document updates
→ Future edits affect document.xml only
```

### Multi-Document Workflow

```bash
# 1. Work with Article
Generate ENDEND10921 → Edit figures → Make changes

# 2. Switch to Sample
Generate document → Edit paragraphs → Make changes

# 3. Return to Article
Generate ENDEND10921 again
→ Your previous changes are preserved
→ Continues from last saved state
```

## 📂 File Structure

### Before Generation
```
xml/
├── document.xml                 ← Source XML files
└── ENDEND10921.xml
template/
├── document.tex.xml             ← Templates
└── ENDEND10921-sample-style.tex.xml
```

### After Generation
```
TeX/
├── document-generated.tex       ← Generated TeX
├── document-generated.pdf       ← Generated PDF
├── document-generated.aux       ← Aux file (coordinates)
├── document-generated-texpos.ndjson
├── document-generated-marked-boxes.json  ← Coordinates
├── ENDEND10921-generated.tex
├── ENDEND10921-generated.pdf
├── ENDEND10921-generated.aux
├── ENDEND10921-generated-texpos.ndjson
└── ENDEND10921-generated-marked-boxes.json

ui/
├── document-generated.pdf       ← Copied for web access
├── document-generated-marked-boxes.json
├── ENDEND10921-generated.pdf
└── ENDEND10921-generated-marked-boxes.json
```

## 🔧 Technical Details

### Server-Side (`server/server.js`)

**New Message Type:** `generate_document`

```javascript
// Client sends
{
    type: 'generate_document',
    documentName: 'ENDEND10921' // or 'document'
}

// Server responds with progress
{
    type: 'generation_started',
    documentName: 'ENDEND10921'
}
{
    type: 'generation_progress',
    message: 'Converting XML to TeX...'
}
{
    type: 'generation_complete',
    documentName: 'ENDEND10921',
    pdfPath: '/path/to/file.pdf',
    jsonPath: '/path/to/file-marked-boxes.json'
}
```

**Generation Process:**
1. Determine XML and template paths based on documentName
2. Convert XML to TeX using `DocumentConverter.xmlToTex()`
3. Compile TeX to PDF using `DocumentConverter.texToPdf()`
4. Copy PDF and JSON to UI directory
5. Send completion message with file paths

### Client-Side (`ui/app.js`)

**New Variables:**
- `currentDocument`: Tracks which document is loaded
- `generateDocument()`: Initiates generation
- `updateCurrentDocumentUI()`: Updates UI to show current document

**New Functions:**
- `setupDocumentGeneration()`: Attaches event listeners
- `generateDocument(documentName)`: Sends generation request
- `updateCurrentDocumentUI(documentName)`: Updates UI state

**Message Handling:**
- `generation_started`: Show progress
- `generation_progress`: Update progress message
- `generation_complete`: Load files automatically
- `generation_error`: Display error, reset UI

### DocumentConverter Updates

**New Method Signatures:**
```javascript
// XML to TeX conversion with optional parameters
xmlToTex(customXmlPath = null, customTemplatePath = null, customOutputName = null)

// TeX to PDF conversion with optional parameters
texToPdf(customTexPath = null, customOutputName = null)
```

**Features:**
- Accepts custom paths or uses config defaults
- Automatically uses `--sync-aux` for perfect coordinates
- Handles file copying to UI directory
- Returns standardized result object

## ⚡ Performance

- **XML to TeX**: ~1-2 seconds
- **TeX to PDF**: ~8-15 seconds (3 LaTeX passes + sync)
- **File Copy**: < 1 second
- **Auto-load**: ~1-2 seconds
- **Total**: ~10-20 seconds per document

## 🐛 Troubleshooting

### "Not connected to server"
**Problem:** WebSocket connection failed

**Solution:**
```bash
# Restart server
node server/server.js

# Refresh browser
```

### "Generation failed"
**Problem:** LaTeX compilation error

**Solution:**
```bash
# Check server logs for details
# Common issues:
# - Missing image files
# - LaTeX syntax errors in XML
# - Template issues
```

### "Files not loading"
**Problem:** Generated files not found

**Solution:**
```bash
# Check if files were generated
ls TeX/*-generated.*
ls ui/*-generated.*

# Check server console for errors
# Files should be in both TeX/ and ui/ directories
```

### Coordinates don't match
**Problem:** Overlay misalignment

**Solution:**
```bash
# System uses --sync-aux automatically
# If still misaligned, regenerate:
Click the document button again

# Or manually sync:
make sync-aux AUX=TeX/document-generated.aux
```

## 🎯 Best Practices

1. **Wait for completion**: Don't close the progress modal manually
2. **One at a time**: Generate one document before starting another
3. **Check current document**: Verify which document is active before making changes
4. **Save frequently**: Changes are auto-saved but regeneration takes time
5. **Use appropriate document**: Choose the right template for your content

## 📊 Comparison with Manual Method

| Method | Steps | Time | Accuracy |
|--------|-------|------|----------|
| **Manual** | 5-6 commands | ~2-3 min | Depends on sync |
| **UI Generation** | 1 click | ~15 sec | Perfect (auto-sync) |

**Manual Process:**
```bash
./scripts/generate-pdf-robust.sh xml/document.xml template/document.tex.xml output
make sync-aux AUX=TeX/output.aux
cp TeX/output.pdf ui/
cp TeX/output-marked-boxes.json ui/
# Manually load in browser
```

**UI Generation:**
```bash
# Click button → Done!
```

## 🔗 Related Documentation

- [AUX-SYNC-GUIDE.md](docs/AUX-SYNC-GUIDE.md) - Coordinate synchronization details
- [INTEGRATION-COMPLETE.md](INTEGRATION-COMPLETE.md) - Automatic sync integration
- [COORDINATE-SYNC-README.md](COORDINATE-SYNC-README.md) - Sync overview
- [README.md](README.md) - Main project documentation

## ✅ Summary

The document generation feature provides:

✨ **One-click generation** - No command-line required
✨ **Automatic loading** - PDF and coordinates load automatically
✨ **Document tracking** - Changes only affect current document
✨ **Perfect coordinates** - Auto-sync from aux file
✨ **Real-time progress** - See what's happening
✨ **Error handling** - Clear error messages
✨ **Multi-document support** - Switch between documents easily

**You can now generate either document.xml or ENDEND10921.xml from the UI, and after generation, the appropriate files will be loaded automatically. Only the loaded document will be updated on subsequent requests!**

