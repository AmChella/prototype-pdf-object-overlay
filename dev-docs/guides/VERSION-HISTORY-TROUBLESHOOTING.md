# 🔧 Version History Not Loading - Complete Fix

Complete troubleshooting and fix for version history loading issues.

---

## 🐛 Issues Fixed

### Issue 1: Message Type Mismatch
**Problem**: Server sends `version_history` (snake_case), client expects `versionHistory` (camelCase)

**Fix**: Updated `useWebSocket.js` to handle both formats:
```javascript
case 'version_history':  // From server
case 'versionHistory':   // Alternative format
  if (handlersRef.current.onVersionHistory) {
    handlersRef.current.onVersionHistory(data);
  }
  break;
```

### Issue 2: Data Structure Mismatch
**Problem**: Server sends `history` array, client expects `versions` array

**Fix**: Updated `VersionHistory.jsx` to handle both:
```javascript
const versionData = event.detail.history || event.detail.versions || [];
setVersions(versionData);
```

### Issue 3: Missing Fields
**Problem**: Server was only sending limited fields, missing `_id`, `versionHash`, `overlayType`, `elementId`

**Fix**: Updated server to send all necessary fields:
```javascript
history: history.map(v => ({
    _id: v._id,
    versionNumber: v.versionNumber,
    versionHash: v.versionHash,
    timestamp: v.timestamp,
    instruction: v.instruction,
    instructionValue: v.instructionValue,
    elementId: v.elementId,
    overlayType: v.overlayType,
    isActive: v.isActive,
    userId: v.userId,
    description: v.description
}))
```

---

## 📝 Files Modified

### 1. `ui-react/src/hooks/useWebSocket.js`
**Lines**: 90-116

**Changes**:
- Added `version_history` case (snake_case from server)
- Added `version_stats` case (snake_case from server)
- Added `version_restored` case (snake_case from server)
- Added `restore_error` case (snake_case from server)
- Kept camelCase versions for compatibility

### 2. `ui-react/src/components/VersionHistory/VersionHistory.jsx`
**Lines**: 20-26, 204

**Changes**:
- Updated to handle both `history` and `versions` arrays
- Added better logging for debugging
- Fixed React key to handle missing `_id`

### 3. `server/server.js`
**Lines**: 521-544

**Changes**:
- Added all necessary fields to version history response
- Added log for version count
- Includes `_id`, `versionHash`, `overlayType`, `elementId`, etc.

---

## ✅ How to Test

### 1. Start the Server
```bash
npm run server
```

**Expected Output**:
```
🚀 PDF Overlay Server starting...
✅ Server started on http://localhost:8081
🔌 WebSocket server ready
```

### 2. Start React UI
```bash
cd ui-react
npm run dev:react
```

**Expected Output**:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### 3. Open Browser Console
Open browser DevTools (F12) and go to Console tab.

### 4. Test Version History

**Step 1**: Expand Version History panel

**Step 2**: Check Console for Logs

**Expected Logs**:
```
📜 Requesting version history for: document
📨 Received message: {type: "version_history", documentName: "document", history: Array(0)}
📜 Version history received: {type: "version_history", ...}
📜 Received versionHistory event: {type: "version_history", ...}
📜 Version data: []
```

**Step 3**: If no versions, apply an instruction first

1. Generate a document
2. Click on an element
3. Apply an instruction (e.g., "Move Bottom")
4. Wait for completion
5. Expand Version History again

**Expected**:
```
✅ Found 1 versions
📜 Version data: [{versionNumber: 1, ...}]
```

---

## 🔍 Debugging Checklist

### Check 1: Server Running?
```bash
ps aux | grep "node.*server"
```

### Check 2: WebSocket Connected?
In browser console:
```javascript
// Should see in console when connecting:
✅ WebSocket connected
🔗 Connected to server
```

### Check 3: Message Sent?
When you expand Version History, console should show:
```
📜 Requesting version history for: document
```

### Check 4: Server Receives Request?
In server console:
```
📨 Received message: {type: 'getVersionHistory', documentName: 'document', limit: 50}
📚 Fetching version history for: document
```

### Check 5: Server Responds?
In server console:
```
✅ Found X versions
```

### Check 6: Client Receives Response?
In browser console:
```
📜 Version history received: {type: "version_history", documentName: "document", history: [...]}
📜 Received versionHistory event: {type: "version_history", ...}
📜 Version data: [...]
```

### Check 7: Versions Display?
- Loader should stop
- Version cards should appear
- If no versions, "No versions yet" message shows

---

## 🐛 Common Issues

### Issue: Loader Never Stops

**Symptoms**:
- Loader spins forever
- No versions appear
- Console shows request sent but no response

**Possible Causes**:
1. Server not running
2. WebSocket disconnected
3. Server error processing request
4. Database error

**Debug**:
```bash
# Check server logs
npm run server

# Look for errors like:
❌ Error fetching version history: ...
```

**Solution**:
- Restart server
- Check database file exists: `data/versions.db`
- Verify NeDB is installed: `npm install nedb`

---

### Issue: "No versions yet" Message

**Symptoms**:
- Versions.length === 0
- Message shows "No versions yet"

**Causes**:
- No instructions have been applied yet
- Wrong document selected
- Database is empty

**Solution**:
1. Generate a document
2. Apply at least one instruction
3. Check that version was saved (server logs should show "💾 Version saved successfully")
4. Refresh version history

---

### Issue: Versions Don't Update After Instruction

**Symptoms**:
- Apply instruction
- Version History doesn't refresh

**Solution**:
The component only fetches when:
1. Panel is expanded
2. Document changes
3. Connection status changes

**Workaround**: Click refresh button (🔄) or re-expand the panel

---

### Issue: Console Shows "Unknown message type"

**Symptoms**:
```
⚠️ Unknown message type: getVersionHistory
```

**Cause**: Server doesn't recognize the message type

**Check**:
1. Server has latest code
2. Server.js includes version control handlers
3. Server restarted after code changes

**Solution**:
```bash
# Restart server
npm run server
```

---

## 📊 Message Flow Diagram

```
User expands panel
       ↓
VersionHistory.jsx
fetchVersionHistory()
       ↓
send({
  type: 'getVersionHistory',
  documentName: 'document',
  limit: 50
})
       ↓
useWebSocket.js
ws.send(JSON.stringify(...))
       ↓
── WebSocket ──
       ↓
server.js
handleWebSocketMessage()
       ↓
getVersionHistory()
       ↓
VersionManager.getVersionHistory()
       ↓
NeDB query
       ↓
Return history array
       ↓
server.js
sendToClient({
  type: 'version_history',
  history: [...]
})
       ↓
── WebSocket ──
       ↓
useWebSocket.js
onmessage event
       ↓
Switch on data.type
case 'version_history':
       ↓
Call onVersionHistory(data)
       ↓
App.jsx
window.dispatchEvent(
  new CustomEvent('versionHistory', {detail: data})
)
       ↓
VersionHistory.jsx
handleVersionHistory(event)
       ↓
setVersions(event.detail.history)
setLoading(false)
       ↓
UI Updates ✅
Loader stops ✅
Versions display ✅
```

---

## 🧪 Test Scenarios

### Test 1: Fresh Installation
```bash
# Clean start
rm -rf data/versions.db
npm run server

# In UI, expand Version History
# Expected: "No versions yet" message
```

### Test 2: After First Instruction
```bash
# Generate document
# Apply instruction
# Check server logs: "💾 Version saved successfully"
# Expand Version History
# Expected: 1 version appears
```

### Test 3: Multiple Instructions
```bash
# Apply 3 instructions
# Expand Version History
# Expected: 3 versions appear
# Latest version has green badge
```

### Test 4: Switch Documents
```bash
# Generate document
# Apply instruction (creates v1 for "document")
# Generate ENDEND10921
# Apply instruction (creates v1 for "ENDEND10921")
# In Version History, select "document"
# Expected: Shows versions for "document"
# Select "ENDEND10921"
# Expected: Shows versions for "ENDEND10921"
```

### Test 5: Restore Version
```bash
# Apply 3 instructions (v1, v2, v3)
# v3 is active
# Click Restore on v2
# Expected:
#   - Toast: "Version 2 restored successfully!"
#   - PDF reloads
#   - v2 now has green badge
#   - v3 no longer has green badge
```

---

## 📝 Verification Commands

### Check Server Logs
```bash
# Should see:
📨 Received message: {type: 'getVersionHistory', ...}
📚 Fetching version history for: document
✅ Found X versions
```

### Check Browser Console
```bash
# Should see:
📜 Requesting version history for: document
📜 Version history received: {type: "version_history", ...}
📜 Received versionHistory event: {type: "version_history", ...}
📜 Version data: [...]
```

### Check Database
```bash
# Check if database file exists
ls -lah data/versions.db

# Size should be > 0 if versions exist
```

---

## ✅ Success Criteria

All of these should work:

- [ ] Loader shows when fetching
- [ ] Loader stops when data arrives
- [ ] Versions display correctly
- [ ] Active version has green badge
- [ ] Document selector works
- [ ] Refresh button works
- [ ] Restore button works
- [ ] PDF reloads after restore
- [ ] Stats show correct count
- [ ] Console shows helpful logs
- [ ] No errors in console
- [ ] No errors in server logs

---

## 🎉 If Everything Works

You should see:

1. **Expand panel** → Loader shows briefly
2. **Data arrives** → Loader stops
3. **Versions display** → Cards appear
4. **Active version** → Green badge (●)
5. **Stats correct** → "X versions | vY active"
6. **Smooth experience** → No errors or delays

---

**Version History Should Now Work! 🚀**

*Complete Fix Applied: November 5, 2025*

