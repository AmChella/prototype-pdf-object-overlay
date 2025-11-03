# Documentation Web App - User Guide

A modern, Vue.js-powered documentation site with **index page** and **pagination navigation**.

## 🚀 Quick Start

### Start the Documentation Server

```bash
cd docs
node serve-docs.js
```

Then open: **http://localhost:3000**

### Alternative Methods

```bash
# Python
cd docs && python3 -m http.server 3000

# Direct open (some features may be limited)
open docs/index.html
```

---

## ✨ Key Features

### 📚 Index Page
- **Grid view** of ALL documentation files
- **Document cards** with titles, descriptions, and metadata
- **Category organization** (Getting Started, Implementation, Reference)
- **Click any card** to view that document
- **Statistics** showing total docs and categories

### 📄 Document View with Pagination
- **Previous/Next buttons** to navigate sequentially
- **Page counter** showing current position (e.g., "2 of 6")
- **Beautiful markdown rendering** with syntax highlighting
- **Return to index** via "📚 All Docs" button in header
- **URL persistence** - share specific doc URLs

### 🎨 Modern UI
- Clean, card-based design
- Responsive layout (works on mobile)
- Smooth animations
- Professional typography

---

## 📖 How to Navigate

### Method 1: Index Page (Overview)
1. Start at index page (default)
2. Browse all 6 documentation cards
3. Click any card to read that document
4. Use pagination to read next/previous

### Method 2: Sequential Reading (Pagination)
1. Click first document card
2. Read document
3. Click **"Next →"** button at bottom
4. Continue through all docs sequentially
5. Click **"← Previous"** to go back

### Method 3: Direct Access
- Use **"📚 All Docs"** button to return to index anytime
- Use **"⏮️ First"** button to jump to first document
- Share URL with friends (e.g., `http://localhost:3000/#2`)

---

## 📚 Documentation Structure

### All 6 Documents

**Getting Started** (2 docs)
1. **📋 Project Summary** - Quick overview with test results
2. **🚀 Quick Start Guide** - Get started in 5 steps

**Implementation** (2 docs)
3. **✅ Column Placement Solution** - Technical implementation details
4. **📖 Complete Implementation Guide** - Comprehensive 12-section guide

**Reference** (2 docs)
5. **📁 Project Structure** - Complete file organization
6. **📍 Coordinate Sync System** - Coordinate extraction docs

---

## 🎯 Usage Examples

### Reading All Docs Sequentially

```
1. Open http://localhost:3000
2. Click "📋 Project Summary" card
3. Read document
4. Click "Next →" at bottom
5. Read "🚀 Quick Start Guide"
6. Click "Next →" again
7. Continue through all 6 docs
```

### Jumping to Specific Doc

```
1. Open http://localhost:3000
2. Browse index page cards
3. Click "✅ Column Placement Solution" directly
4. Use "← Previous" / "Next →" to navigate from there
```

### Sharing a Specific Document

```
Current doc URL is saved in hash:
http://localhost:3000/#0  (First doc)
http://localhost:3000/#2  (Third doc)
http://localhost:3000/#5  (Last doc)
```

---

## 💡 Navigation Controls

### Header Buttons
- **📚 All Docs** - Return to index page anytime
- **⏮️ First** - Jump to first document (only shown when viewing docs)

### Pagination Buttons
- **← Previous** - Go to previous document (disabled on first doc)
- **Next →** - Go to next document (disabled on last doc)

### Page Counter
Shows: **"2 of 6"** 
- Current position / Total documents
- Document title shown below counter

---

## 🎨 UI Components

### Index Page Cards
```
┌────────────────────────────────┐
│  📋 Project Summary        [1] │
│  Quick overview with tests     │
│  📁 Getting Started            │
│  📄 FIGURE-PLACEMENT-SUMM...  │
└────────────────────────────────┘
```

Each card shows:
- Icon + Title
- Short description
- Category tag
- File name
- Number badge (1-6)

### Document View
```
┌──────────────────────────────────┐
│ Header: 📄 Figure Placement Docs │
│ [📚 All Docs] [⏮️ First]         │
├──────────────────────────────────┤
│ Document Title                   │
│ 📁 Category | 📄 File | 📍 2/6  │
├──────────────────────────────────┤
│                                  │
│ (Markdown Content Here)          │
│                                  │
├──────────────────────────────────┤
│ [← Previous] [2 of 6] [Next →]  │
└──────────────────────────────────┘
```

---

## 🛠️ Technical Details

### Technology Stack
- **Vue.js 3** - Reactive framework
- **Marked.js** - Markdown to HTML
- **Highlight.js** - Code syntax highlighting
- **Pure CSS** - No CSS framework needed

### File Structure
```
docs/
├── index.html                # Main app (Vue.js)
├── serve-docs.js            # Node.js server
├── DOCS-APP-README.md       # This file
│
└── Documentation Files/
    ├── ../FIGURE-PLACEMENT-SUMMARY.md
    ├── ./FIGURE-PLACEMENT-README.md
    ├── ./FIGURE-COLUMN-PLACEMENT-SOLUTION.md
    ├── ./FIGURE-PLACEMENT-COMPLETE-GUIDE.md
    ├── ./PROJECT-STRUCTURE.md
    └── ./COORDINATE-SYNC-README.md
```

### Adding New Documents

Edit `docs/index.html` and add to `allDocs` array:

```javascript
allDocs: [
    // ... existing docs ...
    {
        id: 'new-doc',
        title: '🆕 New Document',
        description: 'Description of new document',
        category: 'Getting Started', // or 'Implementation' or 'Reference'
        file: './NEW-DOC.md'
    }
]
```

Documents will automatically appear:
- In the index grid
- In pagination sequence
- In the counter (e.g., "7 of 7")

---

## 🎯 Keyboard Shortcuts (Future Enhancement)

Planned keyboard navigation:
- `→` or `n` - Next document
- `←` or `p` - Previous document
- `h` or `i` - Go to index/home
- `/` - Focus search (when implemented)

---

## 📱 Responsive Design

### Desktop (>768px)
- 3-column grid for index cards
- Full-width document view
- All navigation visible

### Mobile (<768px)
- Single-column grid
- Stacked pagination buttons
- Compact header with smaller fonts

---

## 🔧 Customization

### Change Theme Colors

Edit CSS variables in `index.html`:

```css
:root {
    --color-primary: #42b883;      /* Green accent */
    --color-primary-dark: #35495e; /* Dark blue */
    --color-bg: #ffffff;           /* Background */
    /* ... */
}
```

### Change Code Highlighting Theme

Replace the stylesheet link:

```html
<!-- Current: GitHub Dark -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">

<!-- Other options: -->
<!-- Monokai: /styles/monokai.min.css -->
<!-- Atom One Dark: /styles/atom-one-dark.min.css -->
```

---

## 📊 Statistics

- **Total Documents**: 6
- **Categories**: 3 (Getting Started, Implementation, Reference)
- **Navigation Methods**: 3 (Index, Pagination, Direct URL)
- **File Size**: ~20KB (single HTML file)
- **Dependencies**: 3 (Vue.js, Marked.js, Highlight.js from CDN)

---

## 🚀 Deployment Options

### 1. GitHub Pages
```bash
# Push docs/ to repository
git add docs/
git commit -m "Add documentation site"
git push

# Enable GitHub Pages in repo settings
# Choose: main branch / docs folder
```

### 2. Netlify
```bash
# Drag and drop docs/ folder to Netlify
# Or use CLI:
cd docs && netlify deploy --prod
```

### 3. Static Hosting
- Upload `docs/` folder to any static host
- Works with: Vercel, Cloudflare Pages, AWS S3, etc.

---

## 🔍 Troubleshooting

### Issue: Documents Won't Load

**Symptom**: Clicking cards does nothing or shows errors

**Solution**: 
```bash
# Use a proper HTTP server (not direct file open)
cd docs
node serve-docs.js
```

### Issue: Code Not Highlighted

**Symptom**: Code blocks show as plain text

**Solution**: Check browser console for CDN loading errors. Try refreshing page.

### Issue: Pagination Buttons Disabled

**Symptom**: Can't click Previous/Next

**Solution**: This is normal! 
- "Previous" disabled on first document (doc #1)
- "Next" disabled on last document (doc #6)

### Issue: Hash URLs Not Working

**Symptom**: Sharing URLs doesn't go to correct doc

**Solution**: Ensure server is running and hash is number (0-5):
```
✅ http://localhost:3000/#2
❌ http://localhost:3000/#summary
```

---

## 💡 Pro Tips

1. **Sequential Reading**: Start from doc #1 and use "Next →" to read all docs in order
2. **Bookmarks**: Bookmark specific doc URLs (e.g., `#2` for most-used doc)
3. **Print to PDF**: Use browser print (Ctrl+P) to save any doc as PDF
4. **Mobile Reading**: Site works great on phones - perfect for reading on the go
5. **Share Links**: Send colleagues direct links to specific docs using hash URLs

---

## 📚 Related Resources

- [Vue.js Guide](https://vuejs.org/guide/)
- [Marked.js Documentation](https://marked.js.org/)
- [Highlight.js Styles](https://highlightjs.org/demo)
- [Markdown Guide](https://www.markdownguide.org/)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-03 | Initial release with sidebar navigation |
| 2.0.0 | 2025-11-03 | **NEW: Index page + pagination navigation** |

---

## 🎉 What's New in v2.0

✨ **Index Page**
- Grid view of all 6 documents
- Document cards with descriptions
- Category organization

✨ **Pagination Navigation**  
- Previous/Next buttons
- Page counter (e.g., "2 of 6")
- Sequential document reading

✨ **Better UX**
- Click any card to jump to that doc
- Navigate sequentially with pagination
- Return to index anytime

---

**Created**: November 3, 2025  
**Updated**: November 3, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready

## 🚀 Get Started Now!

```bash
cd docs && node serve-docs.js
```

Open: **http://localhost:3000** and explore! 📚
