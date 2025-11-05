# 📚 Version Control System - Quick Start Guide

Complete document version management system for the PDF Object Overlay System.

---

## ✅ What's Implemented

### 🎯 Features

- ✅ **Automatic Version Tracking**: Every instruction creates a new version
- ✅ **Complete History**: All versions stored with metadata
- ✅ **Time Travel**: Revert to any previous version or move forward
- ✅ **File Preservation**: XML, TeX, PDF, JSON, and template files saved per version
- ✅ **WebSocket API**: Real-time version operations
- ✅ **Database Storage**: Lightweight NeDB (embedded database)
- ✅ **Version Cleanup**: Automatic old version removal

---

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install
```

The `nedb` package is already added to `package.json`:

```json
{
  "dependencies": {
    "nedb": "^1.8.0"
  }
}
```

### 2. Data Directory Structure

The system automatically creates:

```
data/
├── versions.db              # NeDB database
└── versions/                # Version file storage
    ├── document/
    │   ├── v1_hash/
    │   ├── v2_hash/
    │   └── v3_hash/
    └── ENDEND10921/
        └── v1_hash/
```

---

## 💻 WebSocket API Usage

### Get Version History

```javascript
const ws = new WebSocket('ws://localhost:8081');

// Request version history
ws.send(JSON.stringify({
    type: 'getVersionHistory',
    documentName: 'document',
    limit: 50  // Optional, default 50
}));

// Receive version history
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'version_history') {
        console.log('Versions:', msg.history);
    }
};
```

### Restore a Version (Go Back/Forward)

```javascript
// Go back to version 5
ws.send(JSON.stringify({
    type: 'restoreVersion',
    documentName: 'document',
    versionNumber: 5
}));

// Listen for restoration complete
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'version_restored') {
        console.log('✅ Restored to version', msg.versionNumber);
        // Reload PDF and overlays
        loadPDF(msg.files.pdfPath);
    }
};
```

### Get Version Statistics

```javascript
ws.send(JSON.stringify({
    type: 'getVersionStats',
    documentName: 'document'
}));

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'version_stats') {
        console.log('Total versions:', msg.stats.totalVersions);
        console.log('Latest version:', msg.stats.latestVersion);
    }
};
```

---

## 🎨 React UI Example

```jsx
import { useState, useEffect } from 'react';

function VersionNavigator({ websocket, documentName }) {
    const [versions, setVersions] = useState([]);
    const [currentVersion, setCurrentVersion] = useState(null);
    
    useEffect(() => {
        // Load version history
        websocket.send(JSON.stringify({
            type: 'getVersionHistory',
            documentName
        }));
        
        websocket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'version_history') {
                setVersions(msg.history);
                const active = msg.history.find(v => v.isActive);
                setCurrentVersion(active?.versionNumber);
            }
        };
    }, [websocket, documentName]);
    
    const goBack = () => {
        if (currentVersion > 1) {
            websocket.send(JSON.stringify({
                type: 'restoreVersion',
                documentName,
                versionNumber: currentVersion - 1
            }));
        }
    };
    
    const goForward = () => {
        if (currentVersion < versions.length) {
            websocket.send(JSON.stringify({
                type: 'restoreVersion',
                documentName,
                versionNumber: currentVersion + 1
            }));
        }
    };
    
    return (
        <div className="version-navigator">
            <button onClick={goBack} disabled={currentVersion <= 1}>
                ⏮️ Previous
            </button>
            <span>Version {currentVersion} of {versions.length}</span>
            <button onClick={goForward} disabled={currentVersion >= versions.length}>
                ⏭️ Next
            </button>
            
            <div className="version-list">
                {versions.map(v => (
                    <div key={v.versionNumber} className={v.isActive ? 'active' : ''}>
                        <strong>v{v.versionNumber}</strong>
                        <span>{new Date(v.timestamp).toLocaleString()}</span>
                        <span>{v.instruction.type} on {v.instruction.elementId}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

---

## 📦 Version Data Structure

Each version contains:

```javascript
{
  versionNumber: 5,
  timestamp: "2025-11-05T12:00:00Z",
  instruction: {
    type: "move_bottom",
    elementId: "fig-1",
    overlayType: "figure",
    value: null
  },
  isActive: true,
  userId: "system",
  description: "Applied move_bottom to fig-1"
}
```

---

## 🔧 VersionManager API (Server-side)

If you need to use the VersionManager directly in server code:

```javascript
const versionManager = new VersionManager(configManager);

// Save a version
await versionManager.saveVersion({
    documentName: 'document',
    instruction: 'move_bottom',
    elementId: 'fig-1',
    overlayType: 'figure',
    xmlPath: '/path/to/document.xml',
    pdfPath: '/path/to/document.pdf',
    jsonPath: '/path/to/coordinates.json'
    // ... more file paths
});

// Get version history
const history = await versionManager.getVersionHistory('document', 50);

// Restore a version
const result = await versionManager.restoreVersion('document', 5);

// Get statistics
const stats = await versionManager.getVersionStats('document');

// Clean up old versions (keep last 20)
await versionManager.cleanupOldVersions('document', 20);
```

---

## 🔄 How It Works

### 1. Automatic Version Creation

Every time an instruction is processed:

```
User applies instruction
  → XML modified
  → PDF regenerated
  → VersionManager.saveVersion() called automatically
  → New version created with:
      - Incremented version number
      - All generated files copied
      - Metadata saved to database
```

### 2. Version Restoration

When user restores a version:

```
User selects version 5
  → VersionManager.restoreVersion(documentName, 5)
  → Version 5 files copied back to working directory:
      - XML → xml/
      - PDF → ui/
      - JSON → ui/
  → Version 5 marked as active
  → All clients notified via WebSocket
```

---

## 📊 Storage

### Database: NeDB

- **Location**: `data/versions.db`
- **Type**: Embedded JavaScript database (file-based)
- **Size**: ~1KB per version metadata
- **Queries**: Fast indexed queries on documentName, versionNumber, timestamp

### File Storage

- **Location**: `data/versions/{documentName}/v{N}_{hash}/`
- **Per Version**: XML, TeX, PDF, JSON, Template (~5-10 MB)
- **Cleanup**: Use `cleanupOldVersions()` to manage storage

---

## 🎯 Use Cases

### Undo/Redo

```javascript
// Undo (go back one version)
const current = await versionManager.getActiveVersion('document');
await versionManager.restoreVersion('document', current.versionNumber - 1);

// Redo (go forward one version)
await versionManager.restoreVersion('document', current.versionNumber + 1);
```

### View Timeline

```javascript
const history = await versionManager.getVersionHistory('document');
history.forEach(v => {
    console.log(`v${v.versionNumber} [${v.timestamp}]: ${v.instruction.type}`);
});
```

### Jump to Specific Version

```javascript
await versionManager.restoreVersion('document', 10);
```

---

## 📚 Full Documentation

For complete details, see:
- [Version Control Documentation](dev-docs/features/VERSION-CONTROL.md)
- [Server Module Documentation](dev-docs/modules/SERVER.md)

---

## 🚀 Getting Started

1. **Start the server**:
   ```bash
   npm run server
   ```

2. **Apply some instructions** (via WebSocket or UI)

3. **View version history**:
   ```javascript
   ws.send(JSON.stringify({
       type: 'getVersionHistory',
       documentName: 'document'
   }));
   ```

4. **Restore a version**:
   ```javascript
   ws.send(JSON.stringify({
       type: 'restoreVersion',
       documentName: 'document',
       versionNumber: 3
   }));
   ```

---

**Version Control System Ready to Use! 🎉**

*Your document history is automatically tracked with every change!*

