# 📝 How to Add New XML Instructions

Step-by-step guide for adding new user instructions (like "move figure", "change style", etc.) to the PDF Object Overlay System.

---

## 📋 Overview

Instructions allow users to modify XML documents through the UI, which then triggers PDF regeneration. Examples:
- Move figure to different location
- Change text color
- Modify element attributes
- Reorder elements

**Time Required**: 15-30 minutes

---

## 🎯 What You'll Need

- Understanding of XML structure
- Basic knowledge of XPath
- Familiarity with `server-config.json`
- Text editor

---

## 🔄 Complete Workflow

```
1. Define instruction in server-config.json
    ↓
2. Implement operation in XMLProcessor.js  
    ↓
3. Add UI controls (optional)
    ↓
4. Test with sample XML
    ↓
5. Document the feature
```

---

## 📝 Step-by-Step Guide

### Step 1: Define Instruction in `server-config.json`

**File**: `server/config/server-config.json`

Add your instruction in three places:

#### A. Add to `dropdown Options`

```json
{
  "dropdownOptions": {
    "figure": [
      // ... existing options ...
      {
        "value": "change_color",
        "label": "Change Color"
      }
    ]
  }
}
```

#### B. Add to `xmlInstructionTemplates`

```json
{
  "xmlInstructionTemplates": {
    "figure": {
      // ... existing templates ...
      "change_color": "<instruction type=\"figure\" action=\"change_color\" target=\"{elementId}\" color=\"{color}\" />"
    }
  }
}
```

#### C. Add to `xmlProcessingRules`

```json
{
  "xmlProcessingRules": {
    "figure": {
      // ... existing rules ...
      "change_color": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "setAttribute",
        "attribute": "color",
        "value": "{color}"
      }
    }
  }
}
```

---

### Step 2: Implement Operation (if needed)

**File**: `server/modules/XMLProcessor.js`

If using an existing operation (like `setAttribute`), skip this step. Otherwise, add a new operation:

```javascript
class XMLProcessor {
    // ... existing methods ...
    
    applyOperation(node, rule) {
        switch (rule.operation) {
            // ... existing cases ...
            
            case 'changeColor':
                return this.changeColorOperation(node, rule);
            
            default:
                console.error('Unknown operation:', rule.operation);
                return false;
        }
    }
    
    changeColorOperation(node, rule) {
        try {
            // Your custom logic here
            node.setAttribute('color', rule.value);
            console.log(`✅ Changed color to ${rule.value}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to change color:', error);
            return false;
        }
    }
}
```

---

### Step 3: Add UI Controls (React)

**File**: `ui-react/src/components/InstructionModal.jsx` (or similar)

```javascript
// Add to dropdown options
const actionOptions = {
    figure: [
        { value: 'move_bottom', label: 'Move Bottom' },
        { value: 'move_top', label: 'Move Top' },
        { value: 'change_color', label: 'Change Color' }  // New option
    ]
};

// Add conditional inputs
{selectedAction === 'change_color' && (
    <div className="form-group">
        <label>Color:</label>
        <select value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
        </select>
    </div>
)}

// Send instruction
const sendInstruction = async () => {
    const response = await fetch('http://localhost:8081/api/process-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            elementType: 'figure',
            action: 'change_color',
            elementId: selectedElement,
            color: color  // Additional parameter
        })
    });
};
```

---

### Step 4: Test Your Instruction

#### A. Manual API Test

```bash
curl -X POST http://localhost:8081/api/process-instruction \
  -H "Content-Type: application/json" \
  -d '{
    "elementType": "figure",
    "action": "change_color",
    "elementId": "fig-1",
    "color": "red",
    "xmlFile": "xml/document.xml"
  }'
```

#### B. Check XML Modification

```bash
# View the modified XML
cat xml/document.xml | grep 'fig-1'

# Should show: <figure id="fig-1" color="red">
```

#### C. Verify PDF Regeneration

```bash
# Check that PDF was regenerated
ls -ltr TeX/document-generated.pdf

# Open PDF to verify changes
open TeX/document-generated.pdf
```

---

## 📚 Complete Examples

### Example 1: Move Element to Specific Position

**Goal**: Move element to specific line number

**server-config.json**:
```json
{
  "dropdownOptions": {
    "paragraph": [
      {"value": "move_to_line", "label": "Move to Line"}
    ]
  },
  "xmlInstructionTemplates": {
    "paragraph": {
      "move_to_line": "<instruction type=\"paragraph\" action=\"move_to_line\" target=\"{elementId}\" line=\"{lineNumber}\" />"
    }
  },
  "xmlProcessingRules": {
    "paragraph": {
      "move_to_line": {
        "xpath": "//para[@id='{elementId}']",
        "operation": "moveToLine",
        "lineNumber": "{lineNumber}"
      }
    }
  }
}
```

**XMLProcessor.js**:
```javascript
moveToLine(node, rule) {
    // Implementation to move element to specific line
    const lineNumber = parseInt(rule.lineNumber);
    // ... move logic ...
    return true;
}
```

---

### Example 2: Duplicate Element

**Goal**: Create a copy of an element

**server-config.json**:
```json
{
  "dropdownOptions": {
    "figure": [
      {"value": "duplicate", "label": "Duplicate"}
    ]
  },
  "xmlProcessingRules": {
    "figure": {
      "duplicate": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "duplicate"
      }
    }
  }
}
```

**XMLProcessor.js**:
```javascript
duplicate(node, rule) {
    try {
        const clone = node.cloneNode(true);
        // Generate new ID
        const newId = `${node.getAttribute('id')}-copy`;
        clone.setAttribute('id', newId);
        // Insert after original
        node.parentNode.insertBefore(clone, node.nextSibling);
        console.log(`✅ Duplicated element as ${newId}`);
        return true;
    } catch (error) {
        console.error('❌ Duplication failed:', error);
        return false;
    }
}
```

---

### Example 3: Change Multiple Attributes

**Goal**: Change multiple attributes at once

**server-config.json**:
```json
{
  "xmlProcessingRules": {
    "figure": {
      "apply_style": {
        "xpath": "//figure[@id='{elementId}']",
        "operation": "setMultipleAttributes",
        "attributes": {
          "placement": "[!h]",
          "width": "0.8\\textwidth",
          "align": "center"
        }
      }
    }
  }
}
```

**XMLProcessor.js**:
```javascript
setMultipleAttributes(node, rule) {
    try {
        Object.entries(rule.attributes).forEach(([key, value]) => {
            node.setAttribute(key, value);
            console.log(`✅ Set ${key}=${value}`);
        });
        return true;
    } catch (error) {
        console.error('❌ Failed to set attributes:', error);
        return false;
    }
}
```

---

## 🧪 Testing Checklist

- [ ] Instruction appears in UI dropdown
- [ ] API accepts instruction
- [ ] XML is modified correctly
- [ ] PDF regenerates successfully
- [ ] Coordinates update properly
- [ ] Error handling works
- [ ] Works with multiple elements
- [ ] Undo/redo works (if implemented)

---

## 🐛 Common Issues

### Issue 1: Instruction Not Found

**Error**: `Unknown action: my_action`

**Solution**: Check `server-config.json` has action in all three places:
```bash
# Search config
grep "my_action" server/config/server-config.json
# Should appear 3 times
```

---

### Issue 2: XPath Not Matching

**Error**: `Element not found`

**Solution**: Test XPath separately:
```javascript
// In node console
const xpath = require('xpath');
const dom = require('xmldom').DOMParser;
const doc = new dom().parseFromString(xmlContent);
const nodes = xpath.select("//figure[@id='fig-1']", doc);
console.log(nodes.length); // Should be > 0
```

---

### Issue 3: Operation Not Executing

**Error**: `Operation failed`

**Solution**: Add debug logging:
```javascript
applyOperation(node, rule) {
    console.log('🔍 Executing operation:', rule.operation);
    console.log('🔍 Node:', node.tagName);
    console.log('🔍 Rule:', rule);
    // ... rest of code
}
```

---

## 📝 Documentation Template

When adding a new instruction, document it:

```markdown
### [Instruction Name]

**Purpose**: Brief description

**Element Types**: figure, paragraph, section, etc.

**Parameters**:
- `parameter1` (type): Description
- `parameter2` (type): Description

**Example**:
\`\`\`json
{
  "elementType": "figure",
  "action": "my_action",
  "elementId": "fig-1",
  "parameter1": "value1"
}
\`\`\`

**Result**: What happens when instruction is applied

**XML Changes**:
\`\`\`xml
<!-- Before -->
<figure id="fig-1">...</figure>

<!-- After -->
<figure id="fig-1" attribute="new-value">...</figure>
\`\`\`
```

---

## 🎯 Best Practices

1. **Use Descriptive Action Names**: `move_to_section_start` not `mvss`
2. **Validate Inputs**: Check element exists before modifying
3. **Handle Errors Gracefully**: Return meaningful error messages
4. **Test Edge Cases**: Empty XML, missing elements, invalid values
5. **Log Operations**: Use console.log for debugging
6. **Document Changes**: Update README and API docs
7. **Keep It Simple**: One instruction = one operation

---

## 📚 Related Documentation

- [XML Processor Module](../modules/XML-PROCESSOR.md)
- [Server Configuration Reference](../api/SERVER-CONFIG.md)
- [Instruction Processing Workflow](../workflows/INSTRUCTION-PROCESSING.md)

---

## 🎉 You're Done!

Your new instruction should now:
- ✅ Appear in UI dropdown
- ✅ Be processable via API
- ✅ Modify XML correctly
- ✅ Trigger PDF regeneration
- ✅ Work reliably

**Next Steps**: Test thoroughly and document your feature!

---

**Last Updated**: November 3, 2025

