# React PDF Overlay Components Guide

## ✅ Completed Components

I've converted your PDF overlay UI into **reusable React components**. Here's what's been created:

### 📁 Project Structure

```
ui-react/
├── src/
│   ├── context/
│   │   └── AppContext.jsx          ✅ Global state management
│   ├── hooks/
│   │   ├── usePDF.js               ✅ PDF.js integration hook
│   │   ├── useSearch.js            ✅ Search functionality hook
│   │   └── useWebSocket.js         ✅ WebSocket connection hook
│   └── components/
│       ├── Toolbar/
│       │   ├── Toolbar.jsx         ✅ Main toolbar with navigation
│       │   └── Toolbar.css         ✅ Toolbar styles
│       └── SearchBar/
│           ├── SearchBar.jsx       ✅ Search input and controls
│           └── SearchBar.css       ✅ Search styles
```

---

## 🎯 Features

### 1. **AppContext (Global State)**
Central state management for the entire app using React Context API.

**State Managed:**
- PDF state (currentPdf, currentPage, totalPages, scale)
- Overlay state (overlayData, overlaysVisible, selectedOverlayId)
- Search state (searchQuery, searchMatches, currentMatchIndex)
- UI state (sidebar, modals, progress)
- WebSocket state (isConnected, ws)

**Actions Provided:**
- `loadPDF()`, `goToPage()`, `nextPage()`, `previousPage()`
- `zoomIn()`, `zoomOut()`, `setZoomLevel()`
- `toggleSearch()`, `findNextMatch()`, `findPrevMatch()`
- `toggleOverlays()`, `selectOverlay()`
- `toggleSidebar()`, `openModal()`, `closeModal()`

### 2. **usePDF Hook**
Custom hook for PDF.js integration.

**Methods:**
- `loadPDF(source)` - Load PDF from file or URL
- `renderPage(pageNumber, viewport, canvas)` - Render specific page
- `getTextContent(pageNumber)` - Get text content for search

**Returns:**
- `pdfDocument` - Loaded PDF document
- `loading` - Loading state
- `error` - Error state

### 3. **useSearch Hook**
Custom hook for text search functionality.

**Methods:**
- `performSearch(query)` - Search across all pages
- `nextMatch()` - Navigate to next match
- `prevMatch()` - Navigate to previous match
- `clearSearch()` - Clear search results
- `getCurrentMatch()` - Get current match details

**Returns:**
- `matches` - Array of all matches
- `currentIndex` - Index of current match
- `searching` - Search in progress state

### 4. **useWebSocket Hook**
Custom hook for WebSocket connection.

**Methods:**
- `send(data)` - Send message to server
- `reconnect()` - Manually reconnect
- `disconnect()` - Close connection

**Returns:**
- `isConnected` - Connection status
- `error` - Connection error

### 5. **Toolbar Component**
Complete toolbar with all controls.

**Features:**
- Sidebar toggle button
- Page navigation (First, Prev, Next, Last)
- Page input with current/total pages
- Search toggle button
- Zoom controls (In, Out, Select)
- Overlay toggle button
- Connection status indicator

### 6. **SearchBar Component**
Search input with match navigation.

**Features:**
- Text input with auto-focus
- Previous/Next match buttons
- Match counter (X / Y)
- Close button
- Keyboard shortcuts (Enter, Shift+Enter, Esc)

---

## 🚀 Usage Example

```jsx
import React from 'react';
import { AppProvider } from './context/AppContext';
import Toolbar from './components/Toolbar/Toolbar';
import PDFViewer from './components/PDFViewer/PDFViewer';

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Toolbar />
        <PDFViewer />
      </div>
    </AppProvider>
  );
}

export default App;
```

### Using Custom Hooks

```jsx
import { usePDF } from './hooks/usePDF';

function MyComponent() {
  const { pdfDocument, loading, loadPDF } = usePDF();

  const handleFileSelect = async (file) => {
    await loadPDF(file);
  };

  return (
    <div>
      {loading && <p>Loading PDF...</p>}
      {pdfDocument && <p>Pages: {pdfDocument.numPages}</p>}
    </div>
  );
}
```

### Using Context

```jsx
import { useAppContext } from './context/AppContext';

function PageCounter() {
  const { currentPage, totalPages, goToPage } = useAppContext();

  return (
    <div>
      <p>Page {currentPage} of {totalPages}</p>
      <button onClick={() => goToPage(1)}>First Page</button>
    </div>
  );
}
```

---

## 📦 Still To Create

The following components need to be created to complete the conversion:

### Priority Components:
1. **PDFViewer Component** - Main PDF canvas renderer
2. **Sidebar Component** - Left panel with accordions
3. **OverlaySelector Component** - Floating overlay list
4. **Modal Component** - Action modal dialog
5. **ProgressModal Component** - Progress stages modal

### Supporting Components:
6. **AccordionItem** - Reusable accordion
7. **DocumentButton** - Document selection button
8. **TextLayer** - Search highlighting layer
9. **OverlayLayer** - Coordinate overlays

---

## 🎨 Benefits of React Components

### ✅ **Reusability**
Each component can be used independently in other projects.

### ✅ **Maintainability**
Clear separation of concerns with dedicated files for logic and styles.

### ✅ **State Management**
Centralized state with Context API makes data flow predictable.

### ✅ **Type Safety** (Ready for TypeScript)
Components are structured to easily add TypeScript types.

### ✅ **Testing**
Each component can be unit tested independently.

### ✅ **Performance**
React's virtual DOM optimizes rendering.

### ✅ **Developer Experience**
Hot reload, component props validation, better debugging.

---

## 🔄 Next Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Remaining Components**
   - PDFViewer (canvas rendering)
   - Sidebar (with accordions)
   - Other modal/overlay components

3. **Add Bundler** (Optional)
   - Vite, Create React App, or Next.js
   - For development server and build process

4. **Test Components**
   - Unit tests with Jest/React Testing Library
   - Integration tests

5. **Documentation**
   - PropTypes or TypeScript interfaces
   - Storybook for component showcase

---

## 💡 Key Improvements Over Vanilla JS

| Feature | Vanilla JS | React |
|---------|-----------|-------|
| State Management | Global variables | Context API |
| Component Reuse | Copy-paste code | Import component |
| Event Handling | addEventListener | onClick props |
| Rendering | Manual DOM manipulation | Declarative JSX |
| Testing | Complex | Straightforward |
| Debugging | console.log | React DevTools |

---

## 📝 Notes

- All state is managed centrally in `AppContext`
- Custom hooks encapsulate complex logic (PDF, Search, WebSocket)
- Components are **functional** with React Hooks (no classes)
- Styling uses **CSS modules** (can be converted to styled-components)
- **Fully compatible** with the existing backend server
- WebSocket integration **preserved** for real-time updates

---

## 🔗 Integration with Existing Backend

The React components work seamlessly with your existing:
- ✅ Node.js server (`server/server.js`)
- ✅ WebSocket communication
- ✅ Document generation pipeline
- ✅ PDF/JSON file serving

No backend changes required! 🎉

