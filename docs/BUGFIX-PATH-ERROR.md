# 🐛 Bugfix: Path Undefined Error

## Issue

Error when trying to generate documents:
```
Failed to generate document: The "path" argument must be of type string. Received undefined
```

## Root Cause

The `projectRoot` variable was not initialized in:
1. `PDFOverlayServer` class (server/server.js)
2. `DocumentConverter` class (server/modules/DocumentConverter.js)

Additionally, there was a reference to non-existent `this.config` that should have been removed.

## Changes Made

### 1. Fixed server/server.js

**Added projectRoot initialization:**
```javascript
class PDFOverlayServer {
    constructor() {
        // Set project root directory
        this.projectRoot = path.join(__dirname, '..');
        
        // ... rest of constructor
        this.currentDocument = null; // Track current document
    }
}
```

**Added better error handling in generateDocument():**
```javascript
async generateDocument(ws, data) {
    // Validate projectRoot is set
    if (!this.projectRoot) {
        throw new Error('Project root is not set');
    }

    console.log(`📁 Project root: ${this.projectRoot}`);
    
    // Validate paths exist
    if (!await fs.pathExists(xmlPath)) {
        throw new Error(`XML file not found: ${xmlPath}`);
    }

    if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
    }
}
```

**Removed incorrect config reference:**
```javascript
// REMOVED (these lines caused issues):
// this.config.fileSettings.xmlInput = xmlPath;
// this.config.fileSettings.texOutput = ...
```

### 2. Fixed server/modules/DocumentConverter.js

**Added projectRoot initialization:**
```javascript
class DocumentConverter {
    constructor(configManager, eventEmitter = null) {
        this.configManager = configManager;
        this.eventEmitter = eventEmitter;

        // Set project root directory
        this.projectRoot = path.join(__dirname, '../..');
        
        // ... rest of constructor
    }
}
```

## Testing the Fix

### 1. Restart the Server

```bash
# Stop the current server (Ctrl+C if running)

# Start server with fresh code
cd /Users/che/Code/Tutorial/prototype-pdf-object-overlay
node server/server.js
```

You should see:
```
📋 Configuration loaded
🚀 PDF Overlay Server running on port 8081
📡 WebSocket server ready for connections
🌐 HTTP server: http://localhost:8081
```

### 2. Open the UI

Open in browser:
```
http://localhost:3000/ui/
```

Or if the server is on port 8081:
```
http://localhost:8081/ui/
```

### 3. Test Document Generation

Click one of the document buttons:
- 📄 Sample Document
- 📰 Article Sample

**Expected Console Output (Server):**
```
🚀 Generating document: ENDEND10921
📁 Project root: /Users/che/Code/Tutorial/prototype-pdf-object-overlay
📄 XML path: /Users/che/Code/Tutorial/prototype-pdf-object-overlay/xml/ENDEND10921.xml
📋 Template path: /Users/che/Code/Tutorial/prototype-pdf-object-overlay/template/ENDEND10921-sample-style.tex.xml
📦 Output name: ENDEND10921-generated
🔄 Starting XML to TeX conversion using existing engine...
📋 Using template: /Users/che/Code/Tutorial/prototype-pdf-object-overlay/template/ENDEND10921-sample-style.tex.xml
...
✅ Document generation complete: ENDEND10921
```

**Expected UI Behavior:**
1. Progress modal appears
2. Shows: "Converting ENDEND10921.xml to TeX..."
3. Shows: "Compiling PDF..."
4. Shows: "Copying files to UI directory..."
5. PDF and coordinates load automatically
6. Current document displays: "ENDEND10921"

### 4. Verify Files Generated

```bash
ls -la TeX/ENDEND10921-generated.*
ls -la ui/ENDEND10921-generated.*
```

Expected output:
```
TeX/ENDEND10921-generated.tex
TeX/ENDEND10921-generated.pdf
TeX/ENDEND10921-generated.aux
TeX/ENDEND10921-generated-texpos.ndjson
TeX/ENDEND10921-generated-marked-boxes.json

ui/ENDEND10921-generated.pdf
ui/ENDEND10921-generated-marked-boxes.json
```

## Troubleshooting

### Still Getting Path Error

If you still see path errors:

1. **Check server logs** for the specific path that's undefined
2. **Verify project structure**:
   ```bash
   ls -la xml/
   ls -la template/
   ```
3. **Check server initialization**:
   ```bash
   node -e "
   const path = require('path');
   console.log('__dirname:', __dirname);
   console.log('Project root:', path.join(__dirname, 'server', '..'));
   "
   ```

### WebSocket Not Connecting

1. **Check server is running** on correct port (8081)
2. **Refresh browser** to reconnect
3. **Check browser console** for connection errors

### File Not Found Errors

If you see "XML file not found" or "Template file not found":

```bash
# Verify files exist
ls -la xml/document.xml
ls -la xml/ENDEND10921.xml
ls -la template/document.tex.xml
ls -la template/ENDEND10921-sample-style.tex.xml
```

If files are missing, restore from git or create them.

## Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `server/server.js` | Added `this.projectRoot` | Needed for path resolution |
| `server/server.js` | Added `this.currentDocument` | Track active document |
| `server/server.js` | Added path validation | Better error messages |
| `server/server.js` | Removed invalid `this.config` references | Was causing errors |
| `server/modules/DocumentConverter.js` | Added `this.projectRoot` | Needed for path resolution in converter |

## Verification Checklist

- [x] `projectRoot` set in server class
- [x] `projectRoot` set in DocumentConverter class
- [x] `currentDocument` tracking added
- [x] Invalid `this.config` references removed
- [x] Path validation added
- [x] Better error logging added

## Next Steps

1. **Restart server** with the fixes
2. **Test both documents** (document.xml and ENDEND10921.xml)
3. **Verify auto-loading** works
4. **Test document switching** between the two
5. **Make element changes** to verify updates work

If you encounter any issues, check the server console logs for detailed error messages with file paths.

---

**The fix should now resolve the "path undefined" error and document generation should work correctly!** 🎉

