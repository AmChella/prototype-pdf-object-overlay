# 🕒 Version History UI Component

User interface for browsing and navigating document versions.

---

## 📋 Overview

The Version History component allows users to:
- View all saved versions of a document
- See version details (timestamp, instruction, user)
- Restore previous versions
- Track the currently active version
- Switch between different documents

---

## 🎨 UI Features

### Collapsible Panel
- **Header**: Shows version count and active version
- **Click to expand**: Reveals full version list
- **Click to collapse**: Hides version list

### Version List
Each version displays:
- **Version Number**: v1, v2, v3, etc.
- **Active Badge**: Green dot (●) for current version
- **Timestamp**: When the version was created
- **Description**: What changed in this version
- **Instruction Details**: Action type and element ID
- **User**: Who made the change
- **Version Hash**: Unique identifier
- **Restore Button**: For non-active versions

### Document Selector
- Dropdown to switch between documents
- Refresh button to reload version history
- Shows loading state while fetching

---

## 🎯 How to Use

### Opening Version History

1. Start the React UI: `npm run dev:react`
2. Connect to server (automatic)
3. Sidebar shows "Version History" section
4. Click header to expand/collapse

### Viewing Versions

```
🕒 Version History
   3 versions | v3 active

[Expanded View]
┌─────────────────────────────┐
│ Document: [ENDEND10921 ▼] 🔄│
├─────────────────────────────┤
│ v3 ● │ Nov 5, 3:45 PM      │
│ move_bottom → fig-F1         │
│ Action: move_bottom          │
│ Type: figure                 │
│ 👤 system    #a3b4c5d6      │
├─────────────────────────────┤
│ v2   │ Nov 5, 3:30 PM      │
│ para_tight → sec1-p1         │
│ Action: para_tight           │
│ Type: paragraph              │
│ 👤 system    #f7e8d9c0      │
│           [↺ Restore]        │
└─────────────────────────────┘
```

### Restoring a Version

1. Click **Restore** button on any non-active version
2. Confirm the action in the popup
3. System restores that version:
   - Copies all files (XML, PDF, JSON)
   - Marks version as active
   - Reloads PDF in viewer
4. Green badge (●) moves to restored version

---

## 🔧 Component Architecture

### File Structure
```
ui-react/src/components/VersionHistory/
├── VersionHistory.jsx    # Main component
└── VersionHistory.css    # Styling
```

### Dependencies
- `useAppContext` - Access WebSocket send function
- WebSocket - Communicate with server
- React hooks - State management

### State Management
```javascript
const [versions, setVersions] = useState([]);        // Version list
const [stats, setStats] = useState(null);            // Stats summary
const [isExpanded, setIsExpanded] = useState(false); // Panel state
const [loading, setLoading] = useState(false);       // Loading state
const [currentDocument, setCurrentDocument] = useState('document');
```

---

## 📡 WebSocket Messages

### Outgoing (Client → Server)

#### Get Version History
```javascript
{
  type: 'getVersionHistory',
  documentName: 'ENDEND10921',
  limit: 50
}
```

#### Restore Version
```javascript
{
  type: 'restoreVersion',
  documentName: 'ENDEND10921',
  versionNumber: 2
}
```

#### Get Version Stats
```javascript
{
  type: 'getVersionStats',
  documentName: 'ENDEND10921'
}
```

### Incoming (Server → Client)

#### Version History Response
```javascript
{
  type: 'versionHistory',
  versions: [
    {
      _id: '...',
      documentName: 'ENDEND10921',
      versionNumber: 3,
      versionHash: 'a3b4c5d6',
      timestamp: '2025-11-05T15:45:00Z',
      instruction: 'move_bottom',
      instructionValue: null,
      elementId: 'fig-F1',
      overlayType: 'figure',
      userId: 'system',
      description: 'Applied move_bottom to fig-F1',
      isActive: true,
      files: {
        xml: '/path/to/file.xml',
        pdf: '/path/to/file.pdf',
        json: '/path/to/file.json'
      }
    }
  ]
}
```

#### Version Stats Response
```javascript
{
  type: 'versionStats',
  stats: {
    totalVersions: 3,
    activeVersion: 3,
    lastUpdated: '2025-11-05T15:45:00Z'
  }
}
```

#### Version Restored Response
```javascript
{
  type: 'versionRestored',
  version: 2,
  timestamp: '2025-11-05T15:30:00Z',
  files: {
    xml: '/path/to/file.xml',
    pdf: '/path/to/file.pdf',
    json: '/path/to/file.json'
  }
}
```

#### Version Error
```javascript
{
  type: 'versionError',
  error: 'Version not found'
}
```

---

## 🎨 Styling

### Color Scheme
- **Primary**: Purple gradient (`#667eea` → `#764ba2`)
- **Active**: Green (`#28a745`)
- **Text**: Dark gray (`#212529`)
- **Border**: Light gray (`#e9ecef`)

### Responsive Design
- **Desktop**: Full features, max-height 500px
- **Mobile**: Compact layout, max-height 400px

### States
- **Hover**: Slight elevation, blue border
- **Active Version**: Green border, light green background
- **Loading**: Spinner animation
- **Empty**: Centered message

---

## 🔌 Integration with Sidebar

### Location
Appears in the sidebar between "Document Generation" and "Display Options"

### Visibility
Only shown when WebSocket is connected:
```jsx
{isConnected && (
  <div className="sidebar-section">
    <VersionHistory />
  </div>
)}
```

---

## 📊 User Workflows

### Workflow 1: Viewing History
```
User clicks "Version History" header
  → Panel expands
  → Shows version list
  → User browses versions
```

### Workflow 2: Restoring Version
```
User clicks "Restore" on v2
  → Confirmation dialog appears
  → User confirms
  → Server restores v2
  → PDF reloads with v2 content
  → Active badge moves to v2
```

### Workflow 3: Switching Documents
```
User selects "ENDEND10921" from dropdown
  → Component fetches ENDEND10921 versions
  → List updates with new versions
  → Stats update
```

---

## 🐛 Error Handling

### Disconnected State
```jsx
<div className="version-header">
  <h3>Version History</h3>
  <span className="version-status disconnected">
    Disconnected
  </span>
</div>
```

### Empty State
```jsx
<div className="version-empty">
  <p>No versions yet</p>
  <small>Versions are created when you apply instructions</small>
</div>
```

### Loading State
```jsx
<div className="version-loading">
  <div className="spinner"></div>
  <span>Loading versions...</span>
</div>
```

---

## ⚡ Performance

### Optimizations
- **Lazy Loading**: Only loads when expanded
- **Limit Results**: Default 50 versions
- **Efficient Updates**: Uses React state updates
- **Debounced Refresh**: Prevents rapid reloads

### Caching
- Versions cached until document changes
- Stats cached separately
- Manual refresh available

---

## 🧪 Testing Guide

### Manual Testing

1. **Load Component**
   ```bash
   npm run dev:react
   ```

2. **Generate Document**
   - Select "ENDEND10921"
   - Click "Generate PDF"
   - Wait for completion

3. **Apply Instructions**
   - Click on figure element
   - Apply "Move Bottom"
   - New version should be created

4. **View History**
   - Expand "Version History"
   - See new version (v1)
   - Active badge should be visible

5. **Apply More Instructions**
   - Apply several more instructions
   - Check versions accumulate

6. **Restore Version**
   - Click "Restore" on older version
   - Confirm dialog
   - Check PDF updates
   - Verify active badge moved

---

## 🎯 Expected Behavior

### On Component Mount
1. Fetches version history
2. Fetches version stats
3. Displays summary in header

### On Instruction Complete
1. New version auto-created (server-side)
2. Component refreshes history
3. New version appears at top
4. Active badge on new version

### On Version Restore
1. Confirmation dialog
2. Server restores files
3. Component refreshes history
4. Active badge moves
5. PDF viewer reloads

---

## 📚 Related Documentation

- [Version Control System](../../dev-docs/features/VERSION-CONTROL.md)
- [VersionManager Module](../../server/modules/VersionManager.js)
- [WebSocket API](../../dev-docs/api/WEBSOCKET-API.md)
- [Sidebar Component](./COMPONENTS-COMPLETE.md)

---

## 🚀 Future Enhancements

### Possible Improvements
- **Version Diff**: Show changes between versions
- **Version Tags**: Label important versions
- **Version Search**: Filter by instruction or date
- **Version Export**: Download specific versions
- **Version Compare**: Side-by-side comparison
- **Undo/Redo**: Quick navigation
- **Keyboard Shortcuts**: Fast version switching

---

**Version History UI Ready! 🎉**

*Browse, restore, and manage document versions with ease*

*Last Updated: November 5, 2025*

