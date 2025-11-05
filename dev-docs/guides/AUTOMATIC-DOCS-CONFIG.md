# Automatic Documentation Config Generation

**Feature**: Automated discovery and indexing of documentation files  
**Date**: November 5, 2025  
**Version**: 3.0.0+

---

## Overview

The documentation system now automatically scans the `dev-docs` directory and generates the `docs-config.json` file. This eliminates manual updates and ensures all documentation files are automatically discovered and indexed.

## How It Works

### Automatic Generation

```mermaid
┌─────────────────────────────────────┐
│  1. Start Documentation Server      │
│     npm run docs:serve              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  2. Auto-run Generator Script       │
│     generate-docs-config.js         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  3. Scan dev-docs/ Directory        │
│     - Find all .md files            │
│     - Extract titles & descriptions │
│     - Categorize by directory       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  4. Generate docs-config.json       │
│     - Create entries for all files  │
│     - Maintain changelog            │
│     - Update metadata               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  5. Start HTTP Server               │
│     Serve updated documentation     │
└─────────────────────────────────────┘
```

### What Gets Automated

1. **File Discovery**: Automatically finds all `.md` files in:
   - `dev-docs/` (root)
   - `dev-docs/api/`
   - `dev-docs/features/`
   - `dev-docs/guides/`
   - `dev-docs/implementation/`
   - `dev-docs/modules/`
   - `dev-docs/ui/`
   - `dev-docs/workflows/`

2. **Metadata Extraction**:
   - **Title**: Extracted from first `# Heading`
   - **Description**: First paragraph after title
   - **ID**: Auto-generated from filename
   - **Tags**: Auto-generated from filename and directory

3. **Categorization**:
   - Files automatically grouped by directory
   - Categories have predefined names and descriptions
   - Alphabetically sorted within categories

4. **Config Generation**:
   - Creates complete `docs-config.json`
   - Preserves existing changelog
   - Updates statistics and metadata

## Usage

### Automatic (Recommended)

The config is automatically generated when you start the documentation server:

```bash
npm run docs:serve
```

Output:
```
🔄 Generating documentation config...

📚 Documentation Config Generator
==================================

✅ 🎨 React UI Documentation: 28 files
✅ 📝 How-To Guides: 13 files
...

✅ Successfully generated: docs-config.json
📝 Version: 2.2.0
📅 Generated: 2025-11-05T10:36:01.373Z

👨‍💻 Developer Documentation Server Running!
🌐 URL: http://localhost:3000
```

### Manual Generation

Generate the config without starting the server:

```bash
npm run docs:generate
```

Or directly:

```bash
node dev-docs/generate-docs-config.js
```

## Directory to Category Mapping

| Directory | Category ID | Name | Icon |
|-----------|-------------|------|------|
| `(root)` | `core-guides` | Core Developer Guides | 📘 |
| `api/` | `api-reference` | API Reference | 🌐 |
| `features/` | `features` | Features | ✨ |
| `guides/` | `how-to-guides` | How-To Guides | 📝 |
| `implementation/` | `implementation-summaries` | Implementation Summaries | 📋 |
| `modules/` | `modules` | Core Modules | 🔧 |
| `ui/` | `ui-documentation` | React UI Documentation | 🎨 |
| `workflows/` | `workflows` | Application Workflows | 🔄 |

## Metadata Extraction Examples

### Title Extraction

```markdown
# Version Control System

This document describes...
```

**Extracted Title**: "Version Control System"

### Description Extraction

```markdown
# Version Control System

Complete document version management with history tracking.

## Features
...
```

**Extracted Description**: "Complete document version management with history tracking."

### ID Generation

| Filename | Generated ID |
|----------|--------------|
| `VERSION-CONTROL.md` | `version-control` |
| `REST-API.md` | `rest-api` |
| `QUICK-START.md` | `quick-start` |
| `VERSION-HISTORY-UI.md` | `version-history-ui` |

### Tag Generation

| Filename | Directory | Generated Tags |
|----------|-----------|----------------|
| `VERSION-CONTROL-QUICKSTART.md` | `guides/` | `guide`, `quickstart`, `version-control` |
| `NEDB-MIGRATION.md` | `guides/` | `guide`, `migration` |
| `COMPONENT-ARCHITECTURE.md` | `ui/` | `react`, `ui`, `component` |
| `OVERLAY-DEBUGGING.md` | `ui/` | `react`, `ui`, `debugging` |

## Adding New Documentation

### Step 1: Create Your Markdown File

```bash
# Create in appropriate directory
touch dev-docs/guides/MY-NEW-GUIDE.md
```

### Step 2: Write Your Documentation

```markdown
# My New Feature Guide

This guide explains how to use the new feature.

## Introduction
...
```

### Step 3: Regenerate Config (Automatic)

**Option A**: Restart docs server (automatic)
```bash
npm run docs:serve
```

**Option B**: Manual generation
```bash
npm run docs:generate
```

### Step 4: Verify

Open `docs-config.json` and verify your file is included:

```json
{
  "id": "my-new-feature-guide",
  "title": "My New Feature Guide",
  "description": "This guide explains how to use the new feature.",
  "file": "./guides/MY-NEW-GUIDE.md",
  "tags": ["guide"]
}
```

## Configuration File Structure

### Generated `docs-config.json`

```json
{
  "title": "PDF Object Overlay - Developer Documentation",
  "version": "2.2.0",
  "lastUpdated": "2025-11-05",
  "totalFiles": 53,
  "generatedAt": "2025-11-05T10:36:01.373Z",
  "autoGenerated": true,
  "technologies": ["Node.js", "Express", "WebSocket", "LuaLaTeX", "NeDB", "React"],
  "categories": [
    {
      "id": "core-guides",
      "name": "📘 Core Developer Guides",
      "description": "Essential guides...",
      "docs": [...]
    },
    ...
  ],
  "changelog": [...],
  "quickLinks": [...]
}
```

### Important Fields

- **`totalFiles`**: Auto-counted from discovered files
- **`generatedAt`**: ISO timestamp of generation
- **`autoGenerated: true`**: Indicates automated generation
- **`changelog`**: Preserved from previous config
- **`categories`**: Automatically organized

## Backup System

### Automatic Backups

Every time the config is generated, a backup is created:

```
docs-config.json          ← New config
docs-config.backup.json   ← Previous config
```

### Restore from Backup

```bash
# If something goes wrong
cp dev-docs/docs-config.backup.json dev-docs/docs-config.json
```

## Customization

### Modify Category Mapping

Edit `generate-docs-config.js`:

```javascript
const CATEGORY_MAP = {
  'mynewdir': {
    id: 'my-category',
    name: '🎉 My Category',
    description: 'My custom category'
  }
};
```

### Modify Tag Generation

Edit the `generateTags()` function:

```javascript
function generateTags(filename, directory) {
  const tags = [];
  
  // Add custom logic
  if (filename.includes('tutorial')) tags.push('tutorial');
  if (filename.includes('advanced')) tags.push('advanced');
  
  return tags;
}
```

### Core Docs Configuration

Edit `CORE_DOCS_INFO` for root-level files:

```javascript
const CORE_DOCS_INFO = {
  'README.md': {
    id: 'dev-guide',
    title: '📘 Application Developer Guide',
    description: 'Main developer guide...'
  }
};
```

## Troubleshooting

### Issue: Files Not Appearing

**Problem**: New markdown file not in config

**Solutions**:
1. Verify file is in correct directory
2. Ensure file has `.md` extension
3. Run `npm run docs:generate` manually
4. Check console output for errors

### Issue: Wrong Title Extracted

**Problem**: Title doesn't match expectation

**Solution**: Ensure first line is `# Heading`:

```markdown
# This Will Be The Title

Not this paragraph.
```

### Issue: Missing Description

**Problem**: Description is generic "Documentation file"

**Solution**: Add a paragraph after the title:

```markdown
# My Guide

This is the description that will be extracted.

## Section 1
...
```

### Issue: Config Not Updating

**Problem**: Changes not reflected in config

**Solutions**:
1. Restart documentation server
2. Manually run `npm run docs:generate`
3. Check for errors in console
4. Verify backup wasn't accidentally restored

## Performance

### Generation Speed

- **Small repo** (< 50 files): < 1 second
- **Medium repo** (50-200 files): 1-3 seconds
- **Large repo** (200+ files): 3-10 seconds

### Server Startup Impact

The generation adds ~1-2 seconds to server startup time, which is acceptable for development.

## Best Practices

### 1. Always Start with Title

```markdown
# Clear, Descriptive Title

Brief description paragraph.
```

### 2. Use Descriptive Filenames

✅ Good:
- `VERSION-CONTROL-QUICKSTART.md`
- `COMPONENT-ARCHITECTURE.md`
- `NEDB-MIGRATION.md`

❌ Bad:
- `doc1.md`
- `temp.md`
- `UNTITLED.md`

### 3. Organize by Directory

Place files in appropriate directories:
- **guides/**: How-to guides and tutorials
- **features/**: Feature documentation
- **implementation/**: Implementation summaries
- **ui/**: React UI documentation

### 4. Review Generated Config

After adding files, review `docs-config.json` to ensure:
- Title is correct
- Description is meaningful
- Tags are appropriate
- File path is correct

## Migration from Manual Config

### Before (Manual)

```json
{
  "id": "my-doc",
  "title": "My Documentation",
  "description": "Manually written description",
  "file": "./guides/MY-DOC.md",
  "tags": ["manually", "added"]
}
```

### After (Automatic)

```json
{
  "id": "my-doc",
  "title": "Automatically Extracted Title",
  "description": "Automatically extracted description from file content",
  "file": "./guides/MY-DOC.md",
  "tags": ["guide", "auto-generated"]
}
```

### Preserving Manual Customizations

If you need custom titles/descriptions, you can:

1. **Option A**: Edit the file's markdown content
2. **Option B**: Post-process the generated config
3. **Option C**: Modify the generator script

## Scripts Reference

### Available Commands

```bash
# Generate config only
npm run docs:generate

# Serve docs (auto-generates config first)
npm run docs:serve

# Direct script execution
node dev-docs/generate-docs-config.js
```

### Integration

The generator is automatically called by `serve-docs.js`:

```javascript
// Auto-generate docs config on startup
console.log('🔄 Generating documentation config...');
try {
  const { main: generateDocsConfig } = require('./generate-docs-config.js');
  generateDocsConfig();
} catch (error) {
  console.error('⚠️  Warning: Could not auto-generate docs config');
  console.log('   Continuing with existing config...\n');
}
```

## Benefits

### ✅ Zero Manual Maintenance

- No need to manually edit `docs-config.json`
- Add files, they're automatically discovered
- Remove files, they're automatically removed

### ✅ Always Up-to-Date

- Config regenerated on every server start
- No stale documentation entries
- Automatic statistics updates

### ✅ Consistency

- Standardized metadata extraction
- Consistent categorization
- Predictable structure

### ✅ Developer Friendly

- Just write markdown files
- No configuration syntax to learn
- Automatic organization

### ✅ Error Prevention

- No manual typos in paths
- No forgotten entries
- No duplicate IDs

---

## Summary

🎉 **Documentation is now fully automated!**

✅ **Just add markdown files** - they're automatically discovered  
✅ **Start the server** - config is automatically generated  
✅ **No manual edits** - zero maintenance required  
✅ **Always current** - reflects actual file system state  
✅ **Backup protected** - previous config saved automatically  

**Next Steps**: 
1. Create new documentation files
2. Run `npm run docs:serve`
3. Watch them appear automatically! 🚀

