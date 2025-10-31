# React PDF Overlay UI

This is the React version of the PDF Overlay System UI.

## Structure

```
ui-react/
├── src/
│   ├── components/          # React components
│   │   ├── PDFViewer/      # Main PDF viewer component
│   │   ├── Toolbar/        # Top toolbar with controls
│   │   ├── Sidebar/        # Left sidebar with options
│   │   ├── SearchBar/      # Search functionality
│   │   ├── OverlaySelector/ # Floating overlay panel
│   │   ├── Modal/          # Action modals
│   │   └── ProgressModal/  # Progress indicators
│   ├── hooks/              # Custom React hooks
│   │   ├── usePDF.js       # PDF.js integration
│   │   ├── useSearch.js    # Search functionality
│   │   └── useWebSocket.js # WebSocket connection
│   ├── context/            # React context providers
│   │   └── AppContext.js   # Global state management
│   ├── utils/              # Utility functions
│   │   ├── pdfUtils.js     # PDF helper functions
│   │   └── searchUtils.js  # Search helpers
│   ├── App.jsx             # Main App component
│   └── index.jsx           # React entry point
├── public/
│   └── index.html          # HTML template
└── package.json            # React dependencies
```

## Usage

The components are designed to be reusable and can be integrated into any React application.

### Example

```jsx
import { PDFViewerApp } from './src/App';

function MyApp() {
  return <PDFViewerApp />;
}
```

## Features

- ✅ Reusable React components
- ✅ Custom hooks for PDF.js integration
- ✅ Context API for state management
- ✅ TypeScript-ready (can be converted)
- ✅ Modular and maintainable architecture

