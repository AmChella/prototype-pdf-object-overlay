# Instruction Stack Feature

## Overview
The instruction stack feature allows users to queue multiple PDF editing instructions before sending them to the server for processing. This improves workflow efficiency by batching multiple changes into a single PDF regeneration cycle.

## Implementation

### Vanilla JavaScript UI (`/ui`)

#### Files Modified:
1. **ui/index.html**
   - Added instruction stack panel UI
   - Styled with dark theme matching existing UI

2. **ui/app.js**
   - Added `instructionStack` array to store pending instructions
   - Created `updateInstructionStackUI()` to manage visual display
   - Created `removeInstructionFromStack()` to remove individual instructions
   - Created `clearInstructionStack()` to clear all instructions
   - Created `sendAllInstructions()` to send batch to server
   - Modified `sendBtn` click handler to add to stack instead of sending immediately

### React UI (`/ui-react`)

#### Files Created:
1. **ui-react/src/components/InstructionStack/InstructionStack.jsx**
   - React component for instruction stack panel
   - Displays queued instructions
   - Provides remove and clear functionality
   - Handles batch submission

2. **ui-react/src/components/InstructionStack/InstructionStack.css**
   - Dark-themed styling matching existing UI
   - Responsive design
   - Smooth animations

#### Files Modified:
1. **ui-react/src/context/AppContext.jsx**
   - Added `instructionStack` state
   - Created `addInstruction()` action
   - Created `removeInstruction()` action
   - Created `clearInstructionStack()` action
   - Created `sendBatchInstructions()` action

2. **ui-react/src/components/ActionModal/ActionModal.jsx**
   - Updated to add instructions to stack instead of sending immediately
   - Changed button text to "Add to Queue"
   - Shows success notification when added

3. **ui-react/src/App.jsx**
   - Imported and added InstructionStack component
   - Updated WebSocket handlers to detect batch operations
   - Shows batch-specific progress messages

### Server (`/server`)

#### Files Modified:
1. **server/server.js**
   - Added `batch_instructions` message type handler
   - Created `processBatchInstructions()` method
   - Processes all instructions sequentially before regenerating PDF
   - Saves version history for batch operations

## User Workflow

### Before (Single Instruction):
1. Click overlay element
2. Select action from modal
3. Click "Send" → **Server processes immediately**
4. Wait for PDF regeneration
5. Repeat for each element

### After (Instruction Stack):
1. Click overlay element
2. Select action from modal
3. Click "Add to Queue" → **Added to local stack**
4. Repeat steps 1-3 for multiple elements
5. View all queued instructions in stack panel
6. Click "Update Document" → **All instructions sent as batch**
7. Server processes all instructions once
8. Wait for single PDF regeneration

## Benefits

✅ **Efficiency**: Single PDF compilation for multiple changes  
✅ **Better UX**: See all planned changes before committing  
✅ **Flexibility**: Remove or reorder instructions before sending  
✅ **Reduced Load**: Fewer server requests and PDF compilations  
✅ **Visual Feedback**: Clear indication of queued changes  

## Technical Details

### Message Format

**Batch Instructions (Client → Server)**
```json
{
  "type": "batch_instructions",
  "instructions": [
    {
      "elementId": "para-123",
      "overlayType": "paragraph",
      "instruction": "edit_text"
    },
    {
      "elementId": "fig-1",
      "overlayType": "figure",
      "instruction": "resize"
    }
  ],
  "timestamp": "2025-11-10T12:34:56.789Z"
}
```

**Processing Started (Server → Client)**
```json
{
  "type": "processing_started",
  "batchSize": 2
}
```

**Processing Complete (Server → Client)**
```json
{
  "type": "processing_complete",
  "batchSize": 2,
  "result": {
    "pdfPath": "/ui/document-generated.pdf",
    "jsonPath": "/ui/document-generated-marked-boxes.json",
    "timestamp": "2025-11-10T12:35:10.123Z"
  }
}
```

### State Management

**Vanilla JS**
- Global `instructionStack` array
- Direct DOM manipulation for UI updates

**React**
- Context API for global state
- `instructionStack` in AppContext
- React components for UI

### Server Processing Flow

1. Receive batch_instructions message
2. Validate instruction count
3. Apply each instruction to XML sequentially
4. Convert XML to TeX (once)
5. Compile PDF from TeX (once)
6. Generate coordinate JSON
7. Copy files to UI directory
8. Save version history
9. Broadcast completion to all clients

## Testing

### Test Scenarios

1. **Add Single Instruction**
   - Click overlay → Select action → Verify appears in stack

2. **Add Multiple Instructions**
   - Add 3-5 instructions → Verify all appear in correct order

3. **Remove Instruction**
   - Add 3 instructions → Remove middle one → Verify remaining correct

4. **Clear All**
   - Add several instructions → Click clear → Confirm dialog → Verify empty

5. **Send Batch**
   - Add multiple instructions → Click "Update Document"
   - Verify progress modal shows batch count
   - Verify PDF regenerated with all changes

6. **Error Handling**
   - Disconnect WebSocket → Try to send → Verify error message
   - Send empty stack → Verify warning

## UI Components

### Instruction Stack Panel
- **Location**: Fixed position, right side of screen
- **Visibility**: Shows only when instructions queued
- **Layout**: Header, scrollable list, footer with update button
- **Styling**: Dark theme matching PDF.js toolbar

### Stack Item
- **Number Badge**: Shows position in queue (#1, #2, etc.)
- **Element ID**: Shows target element
- **Type Badge**: Color-coded by overlay type
- **Action Label**: Human-readable instruction
- **Remove Button**: X button to remove from stack

## Future Enhancements

- [ ] Drag-and-drop reordering of instructions
- [ ] Edit instruction before sending
- [ ] Save/load instruction presets
- [ ] Undo/redo support
- [ ] Preview changes before sending
- [ ] Group instructions by page or element type

