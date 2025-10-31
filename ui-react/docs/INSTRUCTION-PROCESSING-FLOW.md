# Instruction Processing & Auto-Reload Flow

## 🎯 Overview

The React UI now has **complete instruction processing with progress tracking and auto-reload**, matching the vanilla JS system!

When you submit an action on an overlay:
1. ✅ Progress modal shows
2. ✅ Server processes instruction
3. ✅ PDF is regenerated
4. ✅ Updated PDF and JSON auto-load
5. ✅ User sees changes immediately

---

## 🔄 Complete Flow

### Step-by-Step Process:

```
User clicks overlay
    ↓
Action modal opens
    ↓
User selects action (e.g., "Resize Figure")
    ↓
User clicks "Send Instruction"
    ↓
React sends WebSocket message {
  type: 'instruction',
  elementId: 'fig-1',
  overlayType: 'figure',
  instruction: 'resize'
}
    ↓
Action modal closes
    ↓
Server receives instruction
    ↓
Server sends: { type: 'processing_started' }
    ↓
React shows PROGRESS MODAL ✨
  - Title: "Processing resize on fig-1..."
  - Stage 1: Applying Instruction (active)
  - Stage 2: Regenerating PDF (pending)
  - Stage 3: Loading Results (pending)
    ↓
Server applies instruction to XML
    ↓
Server regenerates PDF
    ↓
Server generates new JSON coordinates
    ↓
Server sends: {
  type: 'processing_complete',
  result: {
    pdfPath: '/path/to/updated.pdf',
    jsonPath: '/path/to/updated.json'
  }
}
    ↓
React updates progress modal
  - All stages: completed ✅
  - Status: "Loading updated files..."
    ↓
React auto-loads new PDF
    ↓
React auto-loads new JSON overlays
    ↓
Toast notification: "Updated PDF and 42 overlays loaded!"
    ↓
Progress modal closes
    ↓
User sees UPDATED DOCUMENT ✨
```

---

## 📡 WebSocket Messages

### 1. **Client → Server: Instruction**
```json
{
  "type": "instruction",
  "elementId": "fig-1",
  "overlayType": "figure",
  "instruction": "resize",
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### 2. **Server → Client: Processing Started**
```json
{
  "type": "processing_started",
  "elementId": "fig-1",
  "overlayType": "figure",
  "instruction": "resize"
}
```

### 3. **Server → Client: Processing Complete**
```json
{
  "type": "processing_complete",
  "elementId": "fig-1",
  "overlayType": "figure",
  "instruction": "resize",
  "result": {
    "pdfPath": "/Users/.../ui/document-generated.pdf",
    "jsonPath": "/Users/.../ui/document-generated-marked-boxes.json",
    "timestamp": "2025-10-31T12:00:05.000Z"
  }
}
```

### 4. **Server → Client: Processing Error (if failed)**
```json
{
  "type": "processing_error",
  "elementId": "fig-1",
  "error": "Element not found in XML"
}
```

---

## 🎨 Progress Modal States

### Initial State (processing_started)
```
┌─────────────────────────────────────┐
│ Processing resize on fig-1...       │
├─────────────────────────────────────┤
│                                     │
│ ⚙️  Applying Instruction           │
│ ⏳ Regenerating PDF                │
│ ⏳ Loading Results                 │
│                                     │
│ Applying instruction to XML...     │
│                                     │
│ [Progress Bar: 0%]                 │
│                                     │
│                        [Cancel]    │
└─────────────────────────────────────┘
```

### Complete State (processing_complete)
```
┌─────────────────────────────────────┐
│ Processing resize on fig-1...       │
├─────────────────────────────────────┤
│                                     │
│ ✅ Applying Instruction            │
│ ✅ Regenerating PDF                │
│ ✅ Loading Results                 │
│                                     │
│ Complete! Loading updated files... │
│                                     │
│ [Progress Bar: 100%]               │
│                                     │
│                        [Cancel]    │
└─────────────────────────────────────┘
```

### Error State (processing_error)
```
┌─────────────────────────────────────┐
│ Processing resize on fig-1...       │
├─────────────────────────────────────┤
│                                     │
│ ✅ Applying Instruction            │
│ ❌ Regenerating PDF                │
│ ⏳ Loading Results                 │
│                                     │
│ Error: LaTeX compilation failed    │
│                                     │
│ [Progress Bar: 50%]                │
│                                     │
│                        [Close]     │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Step 1: Start Backend Server
```bash
npm run server
```

Make sure server has:
- XMLProcessor to apply instructions
- DocumentConverter to regenerate PDF
- WebSocket handlers for processing messages

### Step 2: Start React UI
```bash
cd ui-react
npm run dev
```

### Step 3: Load Document
1. Generate a document or upload PDF + JSON
2. Wait for overlays to load

### Step 4: Test Instruction Processing
1. **Click an overlay** (on PDF or in list)
2. **Action modal opens**
3. **Select an action** (e.g., "Resize Figure")
4. **Click "Send Instruction"**
5. **Watch the magic happen!** ✨

### Expected Behavior:
- ✅ Action modal closes
- ✅ Toast: "Processing figure instruction..."
- ✅ Progress modal appears
- ✅ Progress updates shown
- ✅ Toast: "Document updated successfully!"
- ✅ PDF reloads (may see brief flash)
- ✅ Overlays reload
- ✅ Toast: "Updated PDF and X overlays loaded!"
- ✅ Progress modal closes

### Console Output:
```
📤 Sending instruction: { elementId: 'fig-1', ... }
✅ Instruction sent for element: fig-1
📨 WebSocket message received: { type: 'processing_started', ... }
🎯 Processing started: { elementId: 'fig-1', ... }
📨 WebSocket message received: { type: 'processing_complete', ... }
✅ Processing complete: { result: { pdfPath: '...', jsonPath: '...' } }
📂 Loading updated files:
  PDF: http://localhost:8081/ui/document-generated.pdf
  JSON: http://localhost:8081/ui/document-generated-marked-boxes.json
✅ Rendered page 1 at scale 1.5
📝 Rendered 234 text items on page 1
📊 OverlayLayer rendering for page 1: { overlayCount: 42, ... }
```

---

## 🔧 Server Implementation Requirements

Your backend server must:

### 1. Handle Instruction Messages
```javascript
case 'instruction':
  await this.processInstruction(ws, data);
  break;
```

### 2. Send Processing Started
```javascript
async processInstruction(ws, data) {
  // Send started notification
  this.sendToClient(ws, {
    type: 'processing_started',
    elementId: data.elementId,
    overlayType: data.overlayType,
    instruction: data.instruction
  });
  
  // Process...
}
```

### 3. Apply Instruction to XML
```javascript
const result = await this.xmlProcessor.applyInstruction(
  elementId, 
  overlayType, 
  instruction
);
```

### 4. Regenerate PDF
```javascript
const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath);
const pdfResult = await this.documentConverter.texToPdf(texResult.texPath);
```

### 5. Send Completion
```javascript
this.broadcastToAllClients({
  type: 'processing_complete',
  elementId,
  overlayType,
  instruction,
  result: {
    pdfPath: pdfResult.pdfPath,
    jsonPath: pdfResult.jsonPath,
    timestamp: new Date().toISOString()
  }
});
```

### 6. Handle Errors
```javascript
catch (error) {
  this.sendToClient(ws, {
    type: 'processing_error',
    elementId: data.elementId,
    error: error.message
  });
}
```

---

## 📊 React Implementation

### Files Updated:

1. **useWebSocket.js** - Added processing message handlers
   ```javascript
   case 'processing_started':
     if (handlersRef.current.onProcessingStarted) {
       handlersRef.current.onProcessingStarted(data);
     }
     break;
   
   case 'processing_complete':
     if (handlersRef.current.onProcessingComplete) {
       handlersRef.current.onProcessingComplete(data);
     }
     break;
   
   case 'processing_error':
     if (handlersRef.current.onProcessingError) {
       handlersRef.current.onProcessingError(data);
     }
     break;
   ```

2. **App.jsx** - Added processing handlers
   ```javascript
   const wsHandlers = {
     onProcessingStarted: (data) => {
       // Show progress modal
       setProgress({
         isOpen: true,
         title: `Processing ${data.instruction} on ${data.elementId}...`,
         stages: [...]
       });
     },
     
     onProcessingComplete: async (data) => {
       // Auto-load updated PDF and JSON
       const pdf = await loadPDF(pdfUrl);
       const overlays = await loadOverlayJSON(jsonUrl);
       // ...
     },
     
     onProcessingError: (data) => {
       // Show error in progress modal
       toast.showError('Processing failed: ' + data.error);
     }
   };
   ```

3. **ActionModal.jsx** - Already sends instructions via `onSubmit` prop

---

## 🎨 Toast Notifications

Throughout the process, users see helpful toast notifications:

1. **On Submit**: "Processing figure instruction..." (info)
2. **On Complete**: "Document updated successfully!" (success)
3. **On Load**: "Updated PDF and 42 overlays loaded!" (success)
4. **On Error**: "Processing failed: [error message]" (error)

---

## ⚡ Performance Considerations

### Caching & Reload
- PDF.js caches documents
- To force reload, URLs include timestamp or cache-busting parameter
- React state updates trigger re-render

### Progress Updates
- Progress modal shows immediately on `processing_started`
- No polling needed - WebSocket push updates
- Stages update based on server messages

### Auto-Load Timing
- 500ms delay before loading files (let server finish writing)
- 1000ms delay before closing progress modal (let user see success)

---

## 🔍 Debugging

### Check Server Logs
```
🎯 Processing instruction: figure - resize for element fig-1
🔄 Converting XML to TeX...
📄 Converting TeX to PDF and generating coordinates...
📁 Copying files to UI directory...
✅ Instruction processing completed successfully
```

### Check Browser Console
```
📤 Sending instruction: {...}
✅ Instruction sent for element: fig-1
📨 WebSocket message received: { type: 'processing_started' }
🎯 Processing started: {...}
📨 WebSocket message received: { type: 'processing_complete' }
✅ Processing complete: {...}
📂 Loading updated files:
  PDF: http://localhost:8081/ui/document-generated.pdf
  JSON: http://localhost:8081/ui/document-generated-marked-boxes.json
```

### Common Issues

**Problem**: Progress modal doesn't show
- **Check**: Server sending `processing_started` message?
- **Check**: WebSocket handler registered in `wsHandlers`?

**Problem**: PDF doesn't reload
- **Check**: Server sending correct file paths in `processing_complete`?
- **Check**: Files accessible at URLs?
- **Check**: Browser console for loading errors?

**Problem**: Overlays don't update
- **Check**: JSON file regenerated with new coordinates?
- **Check**: JSON format valid?
- **Check**: React loading JSON after PDF?

---

## 🎊 Result

The React UI now has **complete instruction processing with auto-reload**:

- ✅ **Progress modal** - Shows while processing
- ✅ **Real-time updates** - WebSocket push notifications
- ✅ **Auto-reload** - PDF and JSON load automatically
- ✅ **Error handling** - Graceful error display
- ✅ **Toast notifications** - Visual feedback at every step
- ✅ **Matches vanilla JS** - Exact same behavior

**The instruction processing flow is COMPLETE!** 🚀

Users can now:
1. Click overlay → Select action → Submit
2. Watch progress in real-time
3. See updated document automatically
4. Continue editing without manual reload

**Perfect workflow for iterative document editing!** ✨

