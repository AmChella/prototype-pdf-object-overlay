# React Component Architecture

## 🏗️ Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                        AppProvider                           │
│                   (Global State Context)                     │
│                                                              │
│  State: PDF, Search, Overlays, UI, WebSocket               │
│  Actions: Navigation, Zoom, Search, Overlay Control        │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────▼──────┐        ┌──────▼──────────────┐
    │   App.jsx   │        │  Custom Hooks       │
    │             │        │  ─────────────      │
    │  Main App   │        │  • usePDF()        │
    │  Container  │        │  • useSearch()     │
    └──────┬──────┘        │  • useWebSocket()  │
           │               └─────────────────────┘
           │
    ┌──────┴──────────────────────────┐
    │                                  │
┌───▼──────┐                  ┌───────▼────────┐
│ Toolbar  │                  │ App Container  │
└───┬──────┘                  └───┬────────────┘
    │                             │
    │                    ┌────────┴────────┐
    │                    │                 │
    │              ┌─────▼─────┐    ┌─────▼────────┐
    │              │  Sidebar  │    │ Viewer Cont. │
    │              └───────────┘    └──────────────┘
    │
┌───▼──────────┐
│  SearchBar   │
└──────────────┘
```

---

## 📦 Component Details

### 1. **AppProvider** (Context)
**File:** `src/context/AppContext.jsx`

**Purpose:** Central state management

**Provides:**
```javascript
{
  // PDF State
  currentPdf, currentPage, totalPages, scale,
  
  // Overlay State
  overlayData, overlaysVisible, selectedOverlayId,
  
  // Search State
  searchQuery, searchMatches, currentMatchIndex, isSearchOpen,
  
  // UI State
  isSidebarOpen, isModalOpen, isProgressOpen,
  
  // WebSocket State
  isConnected, ws,
  
  // Actions
  loadPDF(), goToPage(), nextPage(), previousPage(),
  zoomIn(), zoomOut(), toggleSearch(), toggleOverlays(),
  findNextMatch(), findPrevMatch(), ...
}
```

**Usage:**
```jsx
const { currentPage, nextPage } = useAppContext();
```

---

### 2. **App Component**
**File:** `src/App.jsx`

**Purpose:** Main application layout

**Renders:**
- Toolbar (top)
- Sidebar (left)
- Viewer Container (center)
- Modals (overlay)

**Structure:**
```jsx
<AppProvider>
  <div className="pdf-overlay-app">
    <Toolbar />
    <div className="app-container">
      <Sidebar />
      <ViewerContainer />
    </div>
  </div>
</AppProvider>
```

---

### 3. **Toolbar Component** ✅
**File:** `src/components/Toolbar/Toolbar.jsx`

**Purpose:** Navigation and controls

**Features:**
- Sidebar toggle button
- Page navigation (First, Prev, Input, Next, Last)
- Zoom controls (In, Out, Select)
- Search toggle
- Overlay toggle
- Connection status

**Uses Context:**
```javascript
const {
  currentPage,
  totalPages,
  scale,
  goToPage,
  zoomIn,
  zoomOut,
  toggleSearch,
  toggleOverlays
} = useAppContext();
```

---

### 4. **SearchBar Component** ✅
**File:** `src/components/SearchBar/SearchBar.jsx`

**Purpose:** Text search interface

**Features:**
- Search input field
- Previous/Next match buttons
- Match counter display
- Close button
- Keyboard shortcuts

**Uses Context:**
```javascript
const {
  searchQuery,
  searchMatches,
  currentMatchIndex,
  setSearchQuery,
  findNextMatch,
  findPrevMatch
} = useAppContext();
```

---

## 🎣 Custom Hooks

### 1. **usePDF Hook** ✅
**File:** `src/hooks/usePDF.js`

**Purpose:** PDF.js integration

**Methods:**
```javascript
const {
  pdfDocument,    // Loaded PDF
  loading,        // Loading state
  error,          // Error state
  loadPDF,        // (source) => Promise<PDF>
  renderPage,     // (pageNum, viewport, canvas) => Promise
  getTextContent  // (pageNum) => Promise<TextContent>
} = usePDF();
```

**Example:**
```jsx
const { loadPDF, pdfDocument } = usePDF();

const handleFile = async (file) => {
  const pdf = await loadPDF(file);
  console.log('Loaded:', pdf.numPages, 'pages');
};
```

---

### 2. **useSearch Hook** ✅
**File:** `src/hooks/useSearch.js`

**Purpose:** Full-text search

**Methods:**
```javascript
const {
  searchQuery,     // Current search query
  matches,         // All matches [{pageNum, itemIndex, ...}]
  currentIndex,    // Current match index
  searching,       // Search in progress
  performSearch,   // (query) => Promise
  nextMatch,       // () => void
  prevMatch,       // () => void
  clearSearch,     // () => void
  getCurrentMatch  // () => Match | null
} = useSearch(pdfDocument, getTextContent);
```

**Example:**
```jsx
const { performSearch, matches } = useSearch(pdf, getTextContent);

const handleSearch = async (query) => {
  await performSearch(query);
  console.log('Found', matches.length, 'matches');
};
```

---

### 3. **useWebSocket Hook** ✅
**File:** `src/hooks/useWebSocket.js`

**Purpose:** Server communication

**Methods:**
```javascript
const {
  isConnected,  // Connection status
  error,        // Connection error
  send,         // (data) => boolean
  reconnect,    // () => void
  disconnect    // () => void
} = useWebSocket(url, onMessage);
```

**Example:**
```jsx
const handleMessage = (data) => {
  if (data.type === 'document_generated') {
    loadPDF(data.pdfPath);
  }
};

const { send, isConnected } = useWebSocket(
  'ws://localhost:8081',
  handleMessage
);

// Send message
if (isConnected) {
  send({ type: 'generate_document', name: 'doc1' });
}
```

---

## 🔄 Data Flow Diagram

### PDF Loading Flow
```
User Action: Select File
      ↓
usePDF.loadPDF(file)
      ↓
PDF.js loads document
      ↓
Context.loadPDF(pdfDocument)
      ↓
State updated: currentPdf, totalPages
      ↓
Components re-render
      ↓
PDFViewer renders first page
```

### Search Flow
```
User types in SearchBar
      ↓
Context.setSearchQuery(query)
      ↓
useSearch.performSearch(query)
      ↓
Loop through all pages:
  - getTextContent(pageNum)
  - Find matches in text
      ↓
Context.setSearchMatches(matches)
      ↓
Components re-render
      ↓
TextLayer highlights matches
```

### Navigation Flow
```
User clicks "Next Page"
      ↓
Context.nextPage()
      ↓
State: currentPage += 1
      ↓
Components re-render
      ↓
PDFViewer renders new page
```

---

## 🎨 Styling Architecture

### CSS Organization
```
Component/
  ├── Component.jsx     # Component logic
  └── Component.css     # Component styles
```

### Style Hierarchy
```
App.css (Global)
  ├── Layout styles
  ├── Common utilities
  └── CSS variables
      ↓
Component.css (Local)
  ├── Component-specific styles
  ├── BEM naming convention
  └── Responsive breakpoints
```

### CSS Variables (Dark Theme)
```css
:root {
  --toolbar-bg: #474747;
  --toolbar-border: #333;
  --button-hover: #5a5a5a;
  --viewer-bg: #525252;
  --primary-color: #6366f1;
  --text-primary: rgba(255,255,255,0.9);
  --text-secondary: rgba(255,255,255,0.7);
}
```

---

## 🧩 Component Props & State

### Toolbar Props
```typescript
// Uses Context - No props needed
```

### SearchBar Props
```typescript
// Uses Context - No props needed
```

### PDFViewer Props (to be created)
```typescript
interface PDFViewerProps {
  // Uses Context for all state
}
```

---

## 🔐 State Management Patterns

### 1. **Global State** (Context)
Used for:
- PDF document state
- Current page, zoom
- Search query, matches
- UI visibility states
- WebSocket connection

### 2. **Local State** (useState)
Used for:
- Form inputs
- Temporary UI states
- Component-specific data

### 3. **Derived State** (useMemo)
Used for:
- Computed values
- Filtered lists
- Formatted data

### 4. **Side Effects** (useEffect)
Used for:
- API calls
- Event listeners
- Subscriptions
- DOM manipulation

---

## 🚀 Performance Optimization

### Strategies

1. **React.memo()**
```jsx
export default React.memo(ExpensiveComponent);
```

2. **useCallback()**
```jsx
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

3. **useMemo()**
```jsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

4. **Lazy Loading**
```jsx
const Modal = React.lazy(() => import('./Modal'));
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// Component tests
test('Toolbar renders correctly', () => {
  render(<Toolbar />);
  expect(screen.getByText('PDF Overlay System')).toBeInTheDocument();
});

// Hook tests
test('usePDF loads document', async () => {
  const { result } = renderHook(() => usePDF());
  await act(() => result.current.loadPDF(mockFile));
  expect(result.current.pdfDocument).toBeTruthy();
});
```

### Integration Tests
```javascript
test('Search flow works end-to-end', async () => {
  render(<App />);
  
  // Load PDF
  fireEvent.change(fileInput, { target: { files: [mockPDF] } });
  
  // Perform search
  fireEvent.change(searchInput, { target: { value: 'test' } });
  
  // Verify results
  expect(screen.getByText(/Found \d+ matches/)).toBeInTheDocument();
});
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) {
  .sidebar { width: 280px; }
}

/* Tablet */
@media (max-width: 1024px) {
  .sidebar { position: absolute; }
}

/* Desktop */
@media (min-width: 1025px) {
  .sidebar { position: static; }
}
```

---

## 🎯 Summary

The React architecture provides:
- ✅ **Clear separation of concerns**
- ✅ **Reusable components**
- ✅ **Centralized state management**
- ✅ **Type-safe with TypeScript support**
- ✅ **Easy to test**
- ✅ **Scalable and maintainable**

All components are built following React best practices and modern patterns!

