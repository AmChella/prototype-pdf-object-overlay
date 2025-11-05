# 🚀 Version History UI - Quick Start Guide

Quick guide to use the version history feature in the React UI.

---

## 🎯 What You Can Do

- ✅ View all versions of a document
- ✅ See when each version was created
- ✅ See what instruction was applied
- ✅ Restore any previous version
- ✅ Track the currently active version
- ✅ Switch between documents

---

## 🏃 Quick Start

### 1. Start the Application

```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Start React UI
cd ui-react
npm run dev:react
```

### 2. Open in Browser
```
http://localhost:5173
```

### 3. Locate Version History

Look in the **left sidebar** for:
```
🕒 Version History
   3 versions | v3 active
```

Click the header to expand/collapse.

---

## 📖 Using Version History

### View Versions

**Step 1**: Click on "Version History" header
- Panel expands showing all versions

**Step 2**: Browse the list
- Most recent at top
- Active version has green dot (●)
- Each shows:
  - Version number (v1, v2, v3...)
  - Timestamp
  - What changed
  - Who made the change

```
┌────────────────────────────────┐
│ v3 ● │ Nov 5, 3:45 PM          │
│ Applied move_bottom to fig-F1   │
│ Action: move_bottom             │
│ Type: figure                    │
│ 👤 system    #a3b4c5d6         │
└────────────────────────────────┘
```

---

### Restore a Previous Version

**Step 1**: Find the version you want to restore

**Step 2**: Click the **[↺ Restore]** button

**Step 3**: Confirm the action
- Popup asks: "Restore version 2? This will replace the current document."
- Click OK

**Step 4**: Wait for restoration
- Files are copied
- PDF reloads automatically
- Active badge (●) moves to restored version

**Result**: Document is now at that version!

---

### Switch Between Documents

**Step 1**: Find the document dropdown
```
Document: [ENDEND10921 ▼] 🔄
```

**Step 2**: Select different document
- "document"
- "ENDEND10921"

**Step 3**: Click refresh (🔄) if needed

---

## 🎯 Common Tasks

### Task: See What Changed in Each Version

1. Expand Version History
2. Look at each version card
3. Read the "Action" and "Type" fields
4. Example:
   ```
   Action: move_bottom
   Type: figure
   Element: fig-F1
   ```

### Task: Go Back to Previous State

1. Find the version before your change
2. Click "Restore" on that version
3. Confirm
4. Document reverts to that state

### Task: See All Versions of ENDEND10921

1. Open Version History
2. Select "ENDEND10921" from dropdown
3. View all versions
4. Restore any version as needed

---

## 📊 Understanding the Interface

### Header (Collapsed)
```
🕒 Version History ▶
   5 versions | v5 active
```
- Click to expand
- Shows total count
- Shows active version number

### Header (Expanded)
```
🕒 Version History ▼
   5 versions | v5 active
[Full version list below]
```
- Click to collapse
- Quick summary visible

### Version Card (Active)
```
┌────────────────────────────────┐
│ v5 ● │ Nov 5, 4:15 PM          │  ← Green dot = active
│ Applied para_tight to sec1-p1   │  ← What changed
│ Action: para_tight              │  ← Instruction type
│ Type: paragraph                 │  ← Element type
│ 👤 system    #d4e5f6g7         │  ← User & hash
└────────────────────────────────┘
```

### Version Card (Inactive)
```
┌────────────────────────────────┐
│ v4   │ Nov 5, 4:00 PM          │  ← No dot
│ Applied move_top to fig-F2      │
│ Action: move_top                │
│ Type: figure                    │
│ 👤 system    #a1b2c3d4         │
│           [↺ Restore]           │  ← Restore button
└────────────────────────────────┘
```

---

## 💡 Tips & Tricks

### Tip 1: Automatic Version Creation
Every time you apply an instruction, a new version is **automatically created**. You don't need to do anything!

### Tip 2: Safe to Experiment
You can always restore previous versions, so feel free to try different instructions!

### Tip 3: Track Your Changes
The version history shows exactly what you changed and when. Great for tracking progress!

### Tip 4: Version Hash
Each version has a unique hash (e.g., `#a3b4c5d6`). Use this to reference specific versions.

---

## 🐛 Troubleshooting

### "Disconnected" Status

**Problem**: Version History shows "Disconnected"

**Solution**:
1. Check server is running (`npm run server`)
2. Check WebSocket connection
3. Look for "Connected" in Server Status section

---

### Empty Version List

**Problem**: "No versions yet" message

**Reason**: No instructions have been applied yet

**Solution**:
1. Generate a document first
2. Apply at least one instruction
3. Version will be created automatically
4. Refresh version history (🔄)

---

### Restore Not Working

**Problem**: Clicked Restore but nothing happened

**Check**:
1. Is server running?
2. Is WebSocket connected?
3. Does the file still exist?
4. Check browser console for errors

---

## 🎬 Complete Example Workflow

### Scenario: Make Changes, Then Undo

**Step 1: Generate Document**
```
1. Select "ENDEND10921"
2. Click "Generate PDF"
3. Wait for completion
```

**Step 2: Apply Instruction**
```
1. Click on figure element
2. Select "Move Bottom"
3. Apply instruction
4. New version created (v1)
```

**Step 3: Apply Another Instruction**
```
1. Click on paragraph
2. Select "Para Tight"
3. Apply instruction
4. New version created (v2)
```

**Step 4: View History**
```
1. Open Version History
2. See both versions:
   - v2 ● (active) - Para Tight
   - v1   - Move Bottom
```

**Step 5: Undo Last Change**
```
1. Click "Restore" on v1
2. Confirm
3. Document reverts to v1
4. Active badge moves to v1
5. v2 instruction is undone
```

**Step 6: Redo the Change**
```
1. Click "Restore" on v2
2. Confirm
3. Document goes back to v2
4. Para Tight instruction reapplied
```

---

## 📝 Version Information Explained

### Field: versionNumber
- Sequential number (1, 2, 3...)
- Higher = more recent

### Field: timestamp
- When version was created
- Format: "Nov 5, 3:45 PM"

### Field: instruction
- What action was performed
- Examples: move_bottom, para_tight

### Field: elementId
- Which element was modified
- Examples: fig-F1, sec1-p1

### Field: overlayType
- Type of element
- Examples: figure, paragraph, table

### Field: userId
- Who made the change
- Default: "system"

### Field: versionHash
- Unique identifier
- Format: #a3b4c5d6

---

## 🎉 You're Ready!

You now know how to:
- ✅ View version history
- ✅ Understand version information
- ✅ Restore previous versions
- ✅ Navigate between documents
- ✅ Track your changes

**Start experimenting with the version history feature!**

---

## 📚 More Information

- [Full Version History UI Documentation](./ui-react/docs/VERSION-HISTORY-UI.md)
- [Version Control System](./dev-docs/features/VERSION-CONTROL.md)
- [Quick Start Guide](./VERSION-CONTROL-QUICKSTART.md)

---

*Happy version navigating! 🚀*

*Last Updated: November 5, 2025*

