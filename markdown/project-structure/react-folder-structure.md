# 📁 React UI Folder Structure

## Complete Directory Tree

```
ui-react/
│
├── 📄 package.json                     # Dependencies & scripts
├── ⚙️ vite.config.js                   # Vite configuration
│
├── 📚 Documentation/
│   ├── README.md                       # Project overview
│   ├── QUICK-START.md                  # Getting started (START HERE)
│   ├── REACT-COMPONENTS-GUIDE.md       # Component API docs
│   ├── COMPONENT-ARCHITECTURE.md       # Architecture diagrams
│   ├── IMPLEMENTATION-SUMMARY.md       # What's been built
│   └── FOLDER-STRUCTURE.md             # This file
│
├── public/                             # Static assets
│   └── index.html                      # HTML template
│
└── src/                                # Source code
    │
    ├── 🎯 Entry Point
    │   ├── index.jsx                   # React mount point
    │   ├── App.jsx                     # Main app component
    │   └── App.css                     # Global styles
    │
    ├── 🌍 Global State
    │   └── context/
    │       └── AppContext.jsx          # Context provider with all state
    │
    ├── 🎣 Custom Hooks
    │   └── hooks/
    │       ├── usePDF.js               # PDF.js integration
    │       ├── useSearch.js            # Search functionality
    │       └── useWebSocket.js         # WebSocket connection
    │
    └── 🧩 UI Components
        └── components/
            ├── Toolbar/
            │   ├── Toolbar.jsx         # Navigation toolbar
            │   └── Toolbar.css         # Toolbar styles
            │
            └── SearchBar/
                ├── SearchBar.jsx       # Search interface
                └── SearchBar.css       # Search styles
```

---

## 📂 Folder Purposes

### Root Level

| File | Purpose |
|------|---------|
| `package.json` | Lists dependencies (React, Vite, PDF.js) and npm scripts |
| `vite.config.js` | Configures Vite bundler, aliases, and dev server |

### `/public`

| File | Purpose |
|------|---------|
| `index.html` | HTML template with `<div id="root">` for React mounting |

### `/src`

| File/Folder | Purpose |
|-------------|---------|
| `index.jsx` | Entry point - creates React root and renders `<App />` |
| `App.jsx` | Main component - wraps everything with `<AppProvider>` |
| `App.css` | Global styles for layout and common elements |

### `/src/context`

| File | Purpose |
|------|---------|
| `AppContext.jsx` | Global state provider with Context API |

**What it provides:**
- PDF state (currentPdf, currentPage, totalPages, scale)
- Search state (searchQuery, searchMatches, currentMatchIndex)
- Overlay state (overlayData, overlaysVisible, selectedOverlayId)
- UI state (isSidebarOpen, isModalOpen, isProgressOpen)
- WebSocket state (isConnected, ws)
- Actions (goToPage, zoomIn, toggleSearch, etc.)

### `/src/hooks`

| File | Purpose |
|------|---------|
| `usePDF.js` | Load and render PDFs with PDF.js |
| `useSearch.js` | Full-text search across all pages |
| `useWebSocket.js` | Real-time server communication |

### `/src/components`

Each component has its own folder:

```
ComponentName/
├── ComponentName.jsx    # Component logic
└── ComponentName.css    # Component styles
```

**Current Components:**
- `Toolbar/` - Top navigation bar
- `SearchBar/` - Search input and controls

**To Be Created:**
- `PDFViewer/` - Canvas rendering
- `Sidebar/` - Left panel
- `Modal/` - Dialog boxes
- `ProgressModal/` - Progress tracking
- etc.

---

## 🎯 File Responsibilities

### index.jsx
```jsx
// Purpose: Bootstrap React application
// Responsibilities:
//   - Mount React to DOM
//   - Enable hot module replacement
//   - Render root <App /> component
```

### App.jsx
```jsx
// Purpose: Main application layout
// Responsibilities:
//   - Wrap with <AppProvider>
//   - Define app structure (Toolbar, Sidebar, Viewer)
//   - Compose high-level components
```

### AppContext.jsx
```jsx
// Purpose: Global state management
// Responsibilities:
//   - Define state shape
//   - Provide state to all components
//   - Implement state update actions
//   - Expose useAppContext() hook
```

### usePDF.js
```jsx
// Purpose: PDF.js integration
// Responsibilities:
//   - Load PDF documents
//   - Render pages to canvas
//   - Extract text content
//   - Handle loading/error states
```

### useSearch.js
```jsx
// Purpose: Search functionality
// Responsibilities:
//   - Search across all pages
//   - Track matches and current index
//   - Navigate between matches
//   - Clear search results
```

### useWebSocket.js
```jsx
// Purpose: Server communication
// Responsibilities:
//   - Connect to WebSocket server
//   - Send/receive messages
//   - Auto-reconnect on disconnect
//   - Handle connection errors
```

### Toolbar.jsx
```jsx
// Purpose: Main navigation bar
// Responsibilities:
//   - Page navigation (first, prev, next, last)
//   - Zoom controls
//   - Search toggle
//   - Overlay toggle
//   - Connection status
```

### SearchBar.jsx
```jsx
// Purpose: Search interface
// Responsibilities:
//   - Search input field
//   - Match navigation (prev/next)
//   - Match counter display
//   - Keyboard shortcuts (Enter, Esc)
```

---

## 🌳 Component Tree

```
App
├── AppProvider (Context)
    ├── Toolbar
    │   ├── Page Navigation Buttons
    │   ├── Page Input
    │   ├── Zoom Controls
    │   ├── Search Toggle Button
    │   ├── Overlay Toggle Button
    │   └── Connection Status
    │
    ├── SearchBar (conditional)
    │   ├── Search Input
    │   ├── Previous Match Button
    │   ├── Next Match Button
    │   ├── Match Counter
    │   └── Close Button
    │
    ├── Sidebar (to create)
    │   ├── Document Selector
    │   ├── File Uploader
    │   └── Settings
    │
    ├── PDFViewer (to create)
    │   ├── Canvas Layer
    │   ├── Text Layer
    │   └── Overlay Layer
    │
    ├── Modal (to create)
    │   └── Action Form
    │
    └── ProgressModal (to create)
        └── Progress Stages
```

---

## 📦 Import Structure

### Absolute Imports (Configured in vite.config.js)

```javascript
// Instead of:
import { useAppContext } from '../../../context/AppContext';

// You can use:
import { useAppContext } from '@context/AppContext';
import Toolbar from '@components/Toolbar/Toolbar';
import { usePDF } from '@hooks/usePDF';
```

**Available aliases:**
- `@` → `src/`
- `@components` → `src/components/`
- `@hooks` → `src/hooks/`
- `@context` → `src/context/`
- `@utils` → `src/utils/`

---

## 🎨 Styling Architecture

### Global Styles
```
App.css
  ├── CSS Reset
  ├── Layout (flexbox, grid)
  ├── Common utilities
  └── CSS variables (colors, spacing)
```

### Component Styles
```
Component.css
  ├── Component-specific classes
  ├── BEM naming convention
  ├── Responsive breakpoints
  └── Hover/active states
```

### CSS Organization
```css
/* Component.css structure */

/* 1. Component root */
.component-name { }

/* 2. Component children */
.component-name__child { }

/* 3. Component modifiers */
.component-name--modifier { }

/* 4. States */
.component-name:hover { }
.component-name.is-active { }

/* 5. Responsive */
@media (max-width: 768px) { }
```

---

## 🗂️ Recommended Structure for New Components

When creating new components, follow this structure:

```
components/
└── MyComponent/
    ├── MyComponent.jsx        # Main component file
    ├── MyComponent.css        # Component styles
    ├── MyComponent.test.js    # Unit tests (optional)
    ├── index.js               # Export file (optional)
    └── README.md              # Component docs (optional)
```

### Example: MyComponent.jsx
```jsx
import React from 'react';
import { useAppContext } from '@context/AppContext';
import './MyComponent.css';

const MyComponent = ({ prop1, prop2 }) => {
  const { stateValue, action } = useAppContext();
  
  return (
    <div className="my-component">
      {/* Component JSX */}
    </div>
  );
};

export default MyComponent;
```

### Example: index.js (optional)
```javascript
export { default } from './MyComponent';
```

This allows cleaner imports:
```javascript
// Instead of:
import MyComponent from '@components/MyComponent/MyComponent';

// You can do:
import MyComponent from '@components/MyComponent';
```

---

## 📝 File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase | `Toolbar.jsx` |
| **Hooks** | camelCase with "use" prefix | `usePDF.js` |
| **Utils** | camelCase | `formatDate.js` |
| **CSS** | Match component name | `Toolbar.css` |
| **Tests** | Match file with .test | `Toolbar.test.js` |
| **Constants** | UPPER_SNAKE_CASE | `API_ENDPOINTS.js` |

---

## 🔍 Finding Files Quickly

### By Feature
- **PDF functionality** → `hooks/usePDF.js`, `components/PDFViewer/`
- **Search functionality** → `hooks/useSearch.js`, `components/SearchBar/`
- **Navigation** → `components/Toolbar/`
- **State management** → `context/AppContext.jsx`
- **Server communication** → `hooks/useWebSocket.js`

### By Type
- **All components** → `components/*/`
- **All hooks** → `hooks/`
- **Global state** → `context/`
- **Styles** → `*.css` files
- **Documentation** → `*.md` files

---

## 🎯 Quick Navigation

### I want to...

**...add a new feature**
→ Create component in `components/`

**...modify state**
→ Edit `context/AppContext.jsx`

**...change styles**
→ Edit component's `.css` file

**...add a custom hook**
→ Create in `hooks/`

**...update docs**
→ Edit `.md` files in root

**...configure build**
→ Edit `vite.config.js`

---

## 📊 File Count Summary

```
Total Files: 20

Documentation:    6 files
Configuration:    3 files
Source Code:      12 files
  ├── Core:       3 files (index, App, App.css)
  ├── Context:    1 file
  ├── Hooks:      3 files
  └── Components: 4 files (2 components × 2 files each)
```

---

## 🚀 Growth Path

As you add components, the structure will grow like this:

```
src/
├── index.jsx
├── App.jsx
├── App.css
├── context/
│   ├── AppContext.jsx
│   └── ThemeContext.jsx          # Future: Theme switching
├── hooks/
│   ├── usePDF.js
│   ├── useSearch.js
│   ├── useWebSocket.js
│   └── useLocalStorage.js        # Future: Persist settings
├── components/
│   ├── Toolbar/
│   ├── SearchBar/
│   ├── PDFViewer/               # Next to create
│   ├── Sidebar/                 # Next to create
│   ├── Modal/                   # Next to create
│   └── ProgressModal/           # Next to create
└── utils/                        # Future: Helper functions
    ├── pdfUtils.js
    ├── formatters.js
    └── validators.js
```

---

## 💡 Best Practices

### ✅ DO
- Keep components in their own folders
- Include component-specific CSS with component
- Use absolute imports with aliases
- Follow naming conventions
- Document complex components

### ❌ DON'T
- Put multiple components in one file (unless tiny)
- Mix unrelated styles in one CSS file
- Use deep relative imports (`../../../`)
- Name files inconsistently
- Leave undocumented complex logic

---

## 📚 See Also

- **QUICK-START.md** - How to run the project
- **REACT-COMPONENTS-GUIDE.md** - How to use components
- **COMPONENT-ARCHITECTURE.md** - How components interact

---

This structure keeps your code organized, maintainable, and scalable! 🎉

