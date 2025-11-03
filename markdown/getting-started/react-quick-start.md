# Quick Start Guide - React PDF Overlay UI

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd /Users/che/Code/Tutorial/prototype-pdf-object-overlay
npm install
```

This will install React, React-DOM, and all existing dependencies.

### Step 2: Project Structure

Your React components are ready in `ui-react/`:

```
ui-react/
├── README.md                          # Overview
├── REACT-COMPONENTS-GUIDE.md          # Detailed guide
├── QUICK-START.md                     # This file
└── src/
    ├── context/AppContext.jsx         # ✅ State management
    ├── hooks/
    │   ├── usePDF.js                  # ✅ PDF.js integration
    │   ├── useSearch.js               # ✅ Search functionality
    │   └── useWebSocket.js            # ✅ WebSocket connection
    └── components/
        ├── Toolbar/                   # ✅ Main toolbar
        └── SearchBar/                 # ✅ Search bar
```

### Step 3: Use the Components

Create your main App component:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import Toolbar from './components/Toolbar/Toolbar';

function App() {
  return (
    <AppProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Toolbar />
        {/* Add PDFViewer and other components here */}
      </div>
    </AppProvider>
  );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

---

## 📖 What's Included

### ✅ Complete Components

1. **AppContext** - Global state manager
   - Manages PDF, search, overlay, and UI state
   - Provides actions (goToPage, toggleSearch, etc.)

2. **Custom Hooks**
   - `usePDF()` - Load and render PDFs
   - `useSearch()` - Full-text search
   - `useWebSocket()` - Server connection

3. **UI Components**
   - `<Toolbar />` - Navigation, zoom, search controls
   - `<SearchBar />` - Search input with match counter

---

## 🎯 Component Examples

### Example 1: Simple PDF Viewer

```jsx
import { AppProvider, useAppContext } from './context/AppContext';
import { usePDF } from './hooks/usePDF';

function PDFLoader() {
  const { loadPDF: contextLoadPDF } = useAppContext();
  const { loadPDF, pdfDocument } = usePDF();
  
  const handleFile = async (e) => {
    const file = e.target.files[0];
    const pdf = await loadPDF(file);
    contextLoadPDF(pdf);
  };
  
  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFile} />
      {pdfDocument && <p>Loaded: {pdfDocument.numPages} pages</p>}
    </div>
  );
}
```

### Example 2: Page Navigation

```jsx
function PageNav() {
  const { currentPage, totalPages, nextPage, previousPage } = useAppContext();
  
  return (
    <div>
      <button onClick={previousPage} disabled={currentPage === 1}>
        Previous
      </button>
      <span>{currentPage} / {totalPages}</span>
      <button onClick={nextPage} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
}
```

### Example 3: Search with Results

```jsx
function SearchComponent() {
  const { 
    searchQuery, 
    searchMatches, 
    currentMatchIndex,
    setSearchQuery 
  } = useAppContext();
  
  return (
    <div>
      <input 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />
      <p>Found {searchMatches.length} matches</p>
      {currentMatchIndex >= 0 && (
        <p>Showing match {currentMatchIndex + 1}</p>
      )}
    </div>
  );
}
```

---

## 🔌 WebSocket Integration

```jsx
import { useWebSocket } from './hooks/useWebSocket';

function useDocumentGeneration() {
  const { send, isConnected } = useWebSocket(
    'ws://localhost:8081',
    (data) => {
      console.log('Received:', data);
      // Handle server messages
    }
  );
  
  const generateDocument = (docName) => {
    if (isConnected) {
      send({
        type: 'generate_document',
        documentName: docName
      });
    }
  };
  
  return { generateDocument, isConnected };
}
```

---

## 🎨 Styling

Components use **CSS files** for styling:
- `Toolbar.css` - Toolbar styles
- `SearchBar.css` - Search styles

You can:
1. **Keep CSS files** (modular approach)
2. **Convert to CSS Modules** (`.module.css`)
3. **Use styled-components** (CSS-in-JS)
4. **Use Tailwind CSS** (utility classes)

---

## 🛠️ Development Workflow

### Option A: Add to Existing HTML

Replace the vanilla JS in `ui/index.html` with React:

```html
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" src="ui-react/src/App.jsx"></script>
```

### Option B: Use Bundler (Recommended)

Set up Vite for better development experience:

```bash
npm install -D vite @vitejs/plugin-react
```

Create `vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'ui-react',
});
```

Add to `package.json`:
```json
{
  "scripts": {
    "dev:react": "vite",
    "build:react": "vite build"
  }
}
```

Run: `npm run dev:react`

---

## 📚 Next Steps

1. **Create PDFViewer Component** - Canvas rendering
2. **Create Sidebar Component** - Left panel
3. **Add remaining components** (Modal, OverlaySelector, etc.)
4. **Test with your existing backend**
5. **Customize styles** to match your brand

---

## 💡 Pro Tips

- Use **React DevTools** browser extension for debugging
- Add **PropTypes** for type checking
- Use **React.memo()** for performance optimization
- Convert to **TypeScript** for better type safety
- Add **Storybook** for component documentation

---

## 🐛 Troubleshooting

### React is not defined
```bash
# Make sure React is imported
import React from 'react';
```

### Hooks error
```bash
# Make sure component is inside <AppProvider>
<AppProvider>
  <YourComponent />
</AppProvider>
```

### PDF.js worker error
```bash
# Worker is set up in usePDF.js
# Make sure CDN link is accessible
```

---

## ✅ Benefits

| Benefit | Description |
|---------|-------------|
| **Reusable** | Use components anywhere |
| **Maintainable** | Clear structure, easy to update |
| **Testable** | Unit test each component |
| **Scalable** | Add features without breaking existing code |
| **Modern** | Latest React patterns and hooks |

---

## 🎉 You're Ready!

Start by importing and using the components. Check `REACT-COMPONENTS-GUIDE.md` for detailed documentation.

Happy coding! 🚀

