# Automated Documentation - Quick Reference

**TL;DR**: Just add markdown files to `dev-docs/` and they're automatically indexed! 🎉

---

## 🚀 Quick Start

### Add New Documentation

```bash
# 1. Create your markdown file
echo "# My New Guide\n\nThis is my guide." > dev-docs/guides/MY-GUIDE.md

# 2. Start docs server (auto-generates config)
npm run docs:serve

# 3. Done! Your file is now indexed and available
```

## 📁 Where to Put Files

| Content Type | Directory | Example |
|--------------|-----------|---------|
| How-to guides | `guides/` | `HOW-TO-DEBUG.md` |
| Feature docs | `features/` | `NEW-FEATURE.md` |
| UI docs | `ui/` | `COMPONENT-GUIDE.md` |
| API docs | `api/` | `REST-API-V2.md` |
| Module docs | `modules/` | `PARSER.md` |
| Workflow docs | `workflows/` | `DEPLOYMENT.md` |
| Implementation summaries | `implementation/` | `FEATURE-COMPLETE.md` |
| Core guides | `(root)` | `GETTING-STARTED.md` |

## ✍️ Markdown Format

```markdown
# Your Title Here

Your description here (first paragraph will be extracted).

## Section 1
Content...

## Section 2
More content...
```

## 📜 Commands

```bash
# Generate config only
npm run docs:generate

# Serve docs (auto-generates config)
npm run docs:serve

# Direct execution
node dev-docs/generate-docs-config.js
```

## 🤖 What Gets Automated

✅ **Title** - Extracted from first `# Heading`  
✅ **Description** - First paragraph after title  
✅ **ID** - Auto-generated from filename  
✅ **Tags** - Auto-generated from filename/directory  
✅ **Category** - Based on directory location  
✅ **Path** - Relative path to file  

## 🎯 Best Practices

### ✅ Do This

```markdown
# Clear Descriptive Title

A clear one-paragraph description of what this document covers.

## Details
Your detailed content here...
```

### ❌ Not This

```markdown
Title without hashtag

Random text...
```

## 📊 Example Output

**Your File**: `dev-docs/guides/DEPLOYMENT-GUIDE.md`

```markdown
# Deployment Guide

Learn how to deploy the application to production.

## Prerequisites
...
```

**Generated Entry**:

```json
{
  "id": "deployment-guide",
  "title": "Deployment Guide",
  "description": "Learn how to deploy the application to production.",
  "file": "./guides/DEPLOYMENT-GUIDE.md",
  "tags": ["guide"]
}
```

## 🔄 Workflow

```
1. Create/Edit Markdown File
   ↓
2. Save File
   ↓
3. Run: npm run docs:serve
   ↓
4. Config Auto-Generated
   ↓
5. Documentation Available!
```

## 💾 Backup

Every generation creates a backup:

```bash
docs-config.json         # Current
docs-config.backup.json  # Previous
```

Restore if needed:
```bash
cp dev-docs/docs-config.backup.json dev-docs/docs-config.json
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| File not appearing | Ensure `.md` extension, restart server |
| Wrong title | Add `# Heading` as first line |
| No description | Add paragraph after title |
| Wrong category | Move to correct directory |

## 📚 Full Documentation

See [AUTOMATIC-DOCS-CONFIG.md](./guides/AUTOMATIC-DOCS-CONFIG.md) for complete details.

---

**Remember**: Just add markdown files and restart the docs server. Everything else is automatic! 🎉

