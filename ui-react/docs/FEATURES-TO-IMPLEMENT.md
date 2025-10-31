# 🎯 Features from Vanilla JS to Implement in React

Based on `ui/app.js`, here are ALL features that need to be implemented:

---

## ✅ Already Implemented

1. **PDF Loading** - File upload ✅
2. **Page Navigation** - First, prev, next, last ✅
3. **Zoom Controls** - In, out, select ✅
4. **Search Bar** - Input and navigation ✅
5. **Text Layer** - Basic rendering ✅ (needs fixing)
6. **Overlay Layer** - Basic display ✅
7. **Sidebar** - Layout ✅
8. **Toolbar** - All buttons ✅

---

## 🔨 NEEDS IMPLEMENTATION

### 1. **Document Generation** (Priority: HIGH)
**From vanilla:** Lines 1089-1135

**Features:**
- Generate "document" button
- Generate "ENDEND10921" button
- Progress tracking during generation
- WebSocket communication for status updates
- Auto-load generated PDF when ready

**Implementation:**
```jsx
// Add to Sidebar
<button onClick={() => generateDocument('document')}>
  Generate Document
</button>
<button onClick={() => generateDocument('ENDEND10921')}>
  Generate ENDEND10921
</button>
```

---

### 2. **WebSocket Integration** (Priority: HIGH)
**From vanilla:** Lines 1779-1925

**Features:**
- Connect to `ws://localhost:8081`
- Auto-reconnect on disconnect
- Handle messages: `config`, `file_change`, `progress`, `complete`, `error`
- Real-time document generation updates
- Dropdown options from server

**Messages to handle:**
```javascript
{
  type: 'config' |  'file_change' | 'progress' | 'complete' | 'error',
  // ... various fields
}
```

---

### 3. **Dropdown/Document Selection** (Priority: MEDIUM)
**From vanilla:** Lines 1927-2050

**Features:**
- Dropdown showing available documents
- Populated from WebSocket config
- Select document to load
- Auto-select on generation

---

### 4. **Overlay Selector Panel** (Priority: MEDIUM)
**From vanilla:** Lines 2075-2300

**Features:**
- Floating panel showing all overlays
- List with page numbers
- Click to navigate to overlay
- Color-coded by type
- Count badge
- Filter/search overlays

**UI:**
```
┌─────────────────────────┐
│ Overlays (23)       [×] │
├─────────────────────────┤
│ ◻️ Page 1 - text        │
│ ◻️ Page 1 - header      │
│ ◻️ Page 2 - image       │
└─────────────────────────┘
```

---

### 5. **Action Modal** (Priority: MEDIUM)
**From vanilla:** Lines 2302-2500

**Features:**
- Modal dialog for overlay actions
- Show overlay details (id, type, coordinates)
- Action dropdown (move, delete, resize, etc.)
- Input fields for action parameters
- Submit action via WebSocket

**UI:**
```
┌────────────────────────────┐
│ Overlay Action         [×] │
├────────────────────────────┤
│ ID: overlay-123            │
│ Type: text                 │
│ Page: 1                    │
│                            │
│ Action: [dropdown]         │
│ Parameter: [input]         │
│                            │
│ [Cancel]  [Submit]         │
└────────────────────────────┘
```

---

### 6. **Progress Modal** (Priority: HIGH)
**From vanilla:** Lines 2502-2700

**Features:**
- Show progress during document generation
- Multi-stage progress (parsing, compiling, generating)
- Progress bar
- Current stage indicator
- Cancelable process

**UI:**
```
┌─────────────────────────────┐
│ Generating document...  [×] │
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░ 60%       │
│                             │
│ ✓ Parsing XML               │
│ ⟳ Compiling LaTeX...        │
│ ○ Generating PDF            │
└─────────────────────────────┘
```

---

### 7. **Keyboard Shortcuts** (Priority: MEDIUM)
**From vanilla:** Lines 2750-2850

**Features:**
- `Ctrl/Cmd + F` - Toggle search
- `Enter` - Next match
- `Shift + Enter` - Previous match
- `Escape` - Close search/modal
- `Arrow keys` - Navigate pages
- `+/-` - Zoom in/out
- `S` - Toggle sidebar
- `O` - Toggle overlays

---

### 8. **Notifications/Toasts** (Priority: LOW)
**From vanilla:** Lines 2852-2900

**Features:**
- Success notifications (green)
- Error notifications (red)
- Info notifications (blue)
- Warning notifications (yellow)
- Auto-dismiss after 3s
- Click to dismiss

**UI:**
```
┌──────────────────────────┐
│ ✓ PDF loaded successfully │ [×]
└──────────────────────────┘
```

---

### 9. **Drag & Drop** (Priority: LOW)
**From vanilla:** Lines 150-250

**Features:**
- Drag PDF files onto viewer
- Visual feedback on drag over
- Support both PDF and JSON files
- Show file name on drop

---

### 10. **JSON Overlay Loading** (Priority: MEDIUM)
**From vanilla:** Lines 300-450

**Features:**
- Load overlay JSON from file
- Load overlay JSON from URL
- Parse and display overlays
- Coordinate system conversion
- Unit selection (points, mm, inches)

---

### 11. **Debug Mode** (Priority: LOW)
**From vanilla:** Lines 2100-2200

**Features:**
- Show/hide coordinate grid
- Show page dimensions
- Show overlay bounding boxes
- Log overlay data to console
- Export overlay data

---

### 12. **Auto-detect Overlays** (Priority: LOW)
**From vanilla:** Lines 2300-2400

**Features:**
- Analyze PDF structure
- Detect text blocks
- Detect images
- Detect tables
- Generate overlay JSON automatically

---

## 📋 Implementation Order (Recommended)

### Phase 1: Core Features (Week 1)
1. ✅ Fix search text layer (use PDF.js transform)
2. 🔨 WebSocket integration
3. 🔨 Document generation buttons
4. 🔨 Progress modal

### Phase 2: UI Enhancement (Week 2)
5. 🔨 Overlay selector panel
6. 🔨 Action modal
7. 🔨 Dropdown selection
8. 🔨 Keyboard shortcuts

### Phase 3: Polish (Week 3)
9. 🔨 Notifications/toasts
10. 🔨 Drag & drop
11. 🔨 JSON loading
12. 🔨 Debug mode

---

## 🎯 Current Status

### What Works Now:
✅ Load PDF files
✅ Navigate pages
✅ Zoom in/out
✅ Search text (needs improvement)
✅ Show overlays
✅ Toggle overlays
✅ Basic sidebar

### What's Missing:
❌ Document generation
❌ WebSocket communication
❌ Progress tracking
❌ Overlay selector
❌ Action modal
❌ Keyboard shortcuts
❌ Real-time updates
❌ Dropdown selection

---

## 💡 Notes

### WebSocket URL
```javascript
ws://localhost:8081
```

### Message Types
- `config` - Server configuration and available documents
- `file_change` - File system change detected
- `progress` - Document generation progress
- `complete` - Generation complete with PDF path
- `error` - Error occurred

### Coordinate Systems
- **Points** (1pt = 1/72 inch) - PDF default
- **Millimeters** (1mm = 2.83465 points)
- **Inches** (1in = 72 points)

### Origin
- **Bottom-left** - PDF default
- **Top-left** - Canvas default (need conversion)

---

## 🚀 Let's Implement!

Starting with the highest priority features first. I'll create:

1. **WebSocket integration** with proper message handling
2. **Document generation** buttons and logic
3. **Progress modal** for generation tracking
4. **Overlay selector** panel
5. **All remaining features**

This will make the React version **feature-complete** with the vanilla JS version! 🎉

