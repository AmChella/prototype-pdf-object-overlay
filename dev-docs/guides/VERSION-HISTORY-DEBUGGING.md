# 🐛 Version History Not Loading - Debug Steps

Step-by-step debugging to find why "No versions yet" always shows.

---

## ✅ Database Exists

```bash
✓ data/versions.db exists (232 bytes)
```

So the issue is in the WebSocket communication chain.

---

## 🔍 Debug Steps

### Step 1: Open Browser Console

1. Open your React app: `http://localhost:5173`
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Clear the console (trash icon)

### Step 2: Expand Version History Panel

Click on "Version History" header to expand it.

### Step 3: Check Console Logs

You should see these logs in this exact order:

#### ✅ Expected Log Sequence:

```javascript
// 1. Event listeners registered
🎧 Setting up version history event listeners
✅ Event listeners registered

// 2. Request sent
📜 Requesting version history for: document
📜 Send result: true

// 3. Server response (in App.jsx)
📜 Version history received in App.jsx: {type: "version_history", ...}
📜 Data type: version_history
📜 History array: [...]
📜 History length: X
📜 Dispatching custom event: CustomEvent {...}
✅ Custom event dispatched

// 4. Event received (in VersionHistory.jsx)
📜 Received versionHistory event: {type: "version_history", ...}
📜 Event type: version_history
📜 Full event: {...}
📜 Version data array: [...]
📜 Version count: X
✅ Version state updated, loading stopped
```

---

## 🐛 Troubleshooting by Log

### Case 1: No logs at all

**Problem**: Event listeners not set up

**Check**:
- Is the VersionHistory component mounted?
- Is it visible in React DevTools?

**Solution**: Refresh the page

---

### Case 2: Stops at "📜 Send result: false"

**Problem**: WebSocket not connected

**Logs you'll see**:
```
⚠️ Not connected, cannot fetch version history
📜 Send result: false
```

**Solution**:
1. Check if server is running
2. Look for "✅ WebSocket connected" in console
3. Check server console for errors

---

### Case 3: No server response

**Logs you'll see**:
```
📜 Requesting version history for: document
📜 Send result: true
... nothing else ...
```

**Problem**: Server not responding

**Check Server Console**:
```bash
# Should see:
📨 Received message: {type: 'getVersionHistory', ...}
📚 Fetching version history for: document
✅ Found X versions
```

**If NOT seeing this**:
- Server not receiving message
- WebSocket connection issue
- Restart server

---

### Case 4: Server responds but no custom event

**Logs you'll see**:
```
📜 Requesting version history for: document
📜 Send result: true
📜 Version history received in App.jsx: {...}
... nothing else after "✅ Custom event dispatched" ...
```

**Problem**: Event listeners not working

**Solution**:
1. Check if VersionHistory component is still mounted
2. Refresh the page
3. Try collapsing and re-expanding the panel

---

### Case 5: Everything logs but still "No versions yet"

**Check the data**:

Look at these specific logs:
```
📜 History length: X
📜 Version count: X
```

**If X = 0**:
- Database has no versions
- Need to apply an instruction first

**If X > 0 but still shows "No versions yet"**:
- React state update issue
- Check the version data structure

---

## 🧪 Test Creating a Version

### Step 1: Generate a Document

1. Select "document" from dropdown
2. Click "Generate PDF"
3. Wait for completion

### Step 2: Apply an Instruction

1. Click on any element (figure, paragraph)
2. Select an action from dropdown
3. Click "Apply"
4. Wait for "Document updated successfully!"

### Step 3: Check Server Logs

Should see:
```
💾 Version saved successfully
```

### Step 4: Refresh Version History

1. Collapse the panel
2. Expand it again
3. Check console logs

Should now see:
```
📜 History length: 1
📜 Version count: 1
```

---

## 📊 Quick Diagnostic

Copy and run this in browser console while Version History is expanded:

```javascript
// Check if event listeners are registered
console.log('Listeners:', window.getEventListeners?.(window));

// Manually trigger fetch
const send = window.appSend; // You'll need to expose this
if (send) {
  send({
    type: 'getVersionHistory',
    documentName: 'document',
    limit: 50
  });
}
```

---

## 🔧 Manual Test

If nothing works, try this manual test in browser console:

```javascript
// 1. Create test event
const testData = {
  type: 'version_history',
  documentName: 'document',
  history: [
    {
      _id: 'test1',
      versionNumber: 1,
      versionHash: 'abc123',
      timestamp: new Date().toISOString(),
      instruction: 'test',
      isActive: true,
      userId: 'test',
      description: 'Test version'
    }
  ]
};

// 2. Dispatch event
window.dispatchEvent(new CustomEvent('versionHistory', { detail: testData }));

// 3. Check if version appears in UI
// If it does, the issue is with WebSocket communication
// If it doesn't, the issue is with React rendering
```

---

## 📝 Information to Collect

If still not working, collect this info:

### 1. Browser Console Logs
Copy all logs from expanding the panel

### 2. Server Console Logs
Copy logs when expanding panel

### 3. Network Tab
Check WebSocket frames:
1. Open DevTools → Network tab
2. Filter by WS (WebSocket)
3. Click on the connection
4. Go to "Messages" tab
5. Look for messages with type "getVersionHistory"

### 4. React DevTools
1. Install React DevTools extension
2. Open Components tab
3. Find VersionHistory component
4. Check its state:
   - `versions` array
   - `loading` boolean
   - `isExpanded` boolean
   - `isConnected` boolean

---

## ✅ Success Criteria

When working, you should see:

1. **Console**: Complete log sequence (12+ messages)
2. **UI**: Versions appear (or "No versions yet" if database empty)
3. **Loader**: Shows briefly then stops
4. **Server**: Responds with version data

---

## 🚨 Common Issues

### Issue: "send is not a function"

**Cause**: `send` not properly passed from context

**Check**: `ui-react/src/context/AppContext.jsx`
- Is `send` in context state?
- Is it being set in App.jsx?

---

### Issue: Events not firing

**Cause**: Event listeners removed or not registered

**Solution**:
- Refresh page
- Check component is mounted
- Check useEffect dependencies

---

### Issue: Database has versions but UI shows none

**Cause**: Data structure mismatch

**Check server response**:
```javascript
// Should have this structure:
{
  type: 'version_history',
  documentName: 'document',
  history: [
    {
      _id: '...',
      versionNumber: 1,
      versionHash: '...',
      timestamp: '...',
      // ... more fields
    }
  ]
}
```

---

## 📞 Next Steps

After running these debug steps, you should see exactly where the chain breaks:

1. ✅ Event listeners registered → Check
2. ✅ Request sent → Check  
3. ✅ Server receives → Check server console
4. ✅ Server responds → Check server console
5. ✅ App.jsx receives → Check browser console
6. ✅ Custom event dispatched → Check browser console
7. ✅ VersionHistory receives → Check browser console
8. ✅ State updated → Check React DevTools
9. ✅ UI renders → Check page

The problem will be at one of these 9 steps. The logs will show you which one.

---

**Run these debug steps and share the console output!** 🔍

