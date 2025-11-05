# Server Dropdown Configuration

## 🎯 Overview

The React UI now receives dropdown action options from the **server configuration** via WebSocket, just like the vanilla JS version!

---

## 📡 How It Works

### 1. **WebSocket Connection**
When the React app connects to the WebSocket server (`ws://localhost:8081`), it listens for a `config` message.

### 2. **Config Message Format**
The server should send a message with this structure:

```json
{
  "type": "config",
  "data": {
    "dropdownOptions": {
      "figure": [
        { "value": "resize", "label": "Resize Figure" },
        { "value": "reposition", "label": "Reposition Figure" },
        { "value": "caption_edit", "label": "Edit Caption" },
        { "value": "remove", "label": "Remove Figure" }
      ],
      "table": [
        { "value": "resize", "label": "Resize Table" },
        { "value": "reposition", "label": "Reposition Table" },
        { "value": "edit_data", "label": "Edit Table Data" },
        { "value": "add_row", "label": "Add Row" },
        { "value": "add_column", "label": "Add Column" },
        { "value": "remove", "label": "Remove Table" }
      ],
      "paragraph": [
        { "value": "edit_text", "label": "Edit Text" },
        { "value": "reformat", "label": "Reformat Paragraph" },
        { "value": "change_style", "label": "Change Style" },
        { "value": "remove", "label": "Remove Paragraph" }
      ],
      "unknown": [
        { "value": "identify", "label": "Identify Element" },
        { "value": "annotate", "label": "Add Annotation" }
      ]
    }
  }
}
```

### 3. **React Receives & Stores Config**
- `useWebSocket.js` receives the message
- Calls `onConfig` handler in `App.jsx`
- Stores options in `AppContext` (global state)
- Available to all components

### 4. **ActionModal Uses Server Options**
- When overlay is clicked → modal opens
- `ActionModal` checks if server options available
- Uses **server options** if available
- Falls back to **default options** if server config not loaded

---

## 🔧 Server Implementation

### Example Node.js WebSocket Server

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

// Define your dropdown configuration
const dropdownConfig = {
  figure: [
    { value: 'resize', label: 'Resize Figure' },
    { value: 'reposition', label: 'Reposition Figure' },
    { value: 'caption_edit', label: 'Edit Caption' },
    { value: 'remove', label: 'Remove Figure' }
  ],
  table: [
    { value: 'resize', label: 'Resize Table' },
    { value: 'reposition', label: 'Reposition Table' },
    { value: 'edit_data', label: 'Edit Table Data' },
    { value: 'add_row', label: 'Add Row' },
    { value: 'add_column', label: 'Add Column' },
    { value: 'remove', label: 'Remove Table' }
  ],
  paragraph: [
    { value: 'edit_text', label: 'Edit Text' },
    { value: 'reformat', label: 'Reformat Paragraph' },
    { value: 'change_style', label: 'Change Style' },
    { value: 'remove', label: 'Remove Paragraph' }
  ]
};

wss.on('connection', (ws) => {
  console.log('✅ Client connected');
  
  // Send config immediately on connection
  ws.send(JSON.stringify({
    type: 'config',
    data: {
      dropdownOptions: dropdownConfig
    }
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('📨 Received:', data);
    
    if (data.type === 'instruction') {
      // Process instruction
      console.log(`Processing ${data.overlayType} instruction: ${data.instruction}`);
      // ... your processing logic here
    }
  });
});
```

---

## 🧪 Testing

### Step 1: Verify Server Sends Config
Check server console for:
```
✅ Client connected
📤 Sending config to client
```

### Step 2: Verify React Receives Config
Open browser console and look for:
```
📨 WebSocket message received: { type: 'config', data: { dropdownOptions: {...} } }
⚙️ Config received from server: { type: 'config', data: { dropdownOptions: {...} } }
✅ Dropdown options loaded: { figure: [...], table: [...], ... }
```

### Step 3: Test Action Modal
1. Click an overlay
2. Check console for:
   ```
   📋 Using server dropdown options for figure: [...]
   ```
   (If you see "Using default dropdown options", server config not loaded)

3. Verify dropdown shows server-configured options
4. Select an action and submit
5. Check server receives instruction

---

## 📊 Data Flow

```
Backend Server
    ↓ (WebSocket connects)
Sends config message
    ↓
React useWebSocket hook
    ↓
App.jsx onConfig handler
    ↓
AppContext (setDropdownOptions)
    ↓ (Global state)
ActionModal component
    ↓
User sees dropdown options
    ↓
User selects action
    ↓
Instruction sent to server
```

---

## 🎨 Customizing Options

### Adding New Element Types

**Server config:**
```json
{
  "type": "config",
  "data": {
    "dropdownOptions": {
      "figure": [...],
      "table": [...],
      "paragraph": [...],
      "header": [
        { "value": "edit_text", "label": "Edit Header" },
        { "value": "change_style", "label": "Change Style" }
      ],
      "footer": [
        { "value": "edit_text", "label": "Edit Footer" },
        { "value": "add_page_number", "label": "Add Page Number" }
      ]
    }
  }
}
```

**React will automatically use these options** when overlay type is detected as `header` or `footer`!

### Dynamic Options Based on User Role

```javascript
function getDropdownConfig(userRole) {
  const baseOptions = {
    figure: [
      { value: 'resize', label: 'Resize Figure' },
      { value: 'reposition', label: 'Reposition Figure' }
    ]
  };
  
  // Admins get additional options
  if (userRole === 'admin') {
    baseOptions.figure.push(
      { value: 'delete', label: 'Delete Figure' },
      { value: 'replace', label: 'Replace Figure' }
    );
  }
  
  return baseOptions;
}

ws.on('connection', (ws, req) => {
  const userRole = getUserRole(req); // Your auth logic
  const config = getDropdownConfig(userRole);
  
  ws.send(JSON.stringify({
    type: 'config',
    data: { dropdownOptions: config }
  }));
});
```

---

## 🛡️ Fallback Behavior

If server doesn't send config or connection fails:
- React uses **default hardcoded options**
- User can still interact with overlays
- Options are sensible defaults
- No errors or crashes

### Default Options:
- **Figure:** Resize, Reposition, Edit Caption, Remove
- **Table:** Resize, Reposition, Edit Data, Add Row/Column, Remove
- **Paragraph:** Edit Text, Reformat, Change Style, Remove
- **Unknown:** Identify Element, Add Annotation

---

## 🔍 Debugging

### Check if Server Config Loaded

**Console command:**
```javascript
// In browser console
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).getFiberRoots().values().next().value.current.child.memoizedState
```

**Better way - check React DevTools:**
1. Open React DevTools
2. Find `AppProvider` component
3. Check `dropdownOptions` in state

**Or check console logs:**
- Look for "✅ Dropdown options loaded"
- Look for "📋 Using server dropdown options" when opening modal
- If you see "Using default dropdown options", server config not received

### Common Issues

**Problem:** Modal shows default options, not server options
- **Solution:** Check server is sending config on connection
- **Check:** Console for "Config received from server"

**Problem:** Options not updating after server sends config
- **Solution:** Refresh browser or check React state
- **Check:** React DevTools for `dropdownOptions` in context

**Problem:** Server config format incorrect
- **Solution:** Verify JSON structure matches example above
- **Check:** Console for parsing errors

---

## 📝 Server Config Checklist

- [ ] Server sends `type: 'config'` message on connection
- [ ] Config includes `data.dropdownOptions` object
- [ ] Each overlay type has array of `{ value, label }` objects
- [ ] Config sent **before** any overlays are clicked
- [ ] Console shows "✅ Dropdown options loaded"
- [ ] Modal shows server options (check console for "Using server dropdown")

---

## 🎊 Result

The React UI now:
- ✅ Receives dropdown options from server (via WebSocket config message)
- ✅ Stores options in global state (AppContext)
- ✅ Uses server options in ActionModal
- ✅ Falls back to defaults if server config not available
- ✅ Supports dynamic options (different per user, per type, etc.)
- ✅ Matches vanilla JS behavior exactly

**The dropdown options are now fully configurable from the server!** 🚀

