# 📚 Documentation Index

Complete index of all documentation files organized by category.

---

## 🎯 Quick Access

### 🆕 Latest Additions (v2.1.0)
- [🕒 Version History UI Quick Start](./guides/VERSION-HISTORY-QUICKSTART.md)
- [🔄 Dynamic Schema Detection](./features/DYNAMIC-SCHEMA-DETECTION.md)
- [🧪 Schema Detection Testing](./guides/SCHEMA-DETECTION-TEST-GUIDE.md)
- [✅ Version History Implementation](./implementation/VERSION-HISTORY-IMPLEMENTATION.md)

### 🌟 Most Popular
- [🚀 Getting Started](./GETTING-STARTED.md)
- [🏗️ Architecture](./ARCHITECTURE.md)
- [📚 Version Control System](./features/VERSION-CONTROL.md)
- [🌐 REST API Reference](./api/REST-API.md)

---

## 📘 Core Developer Guides

Essential guides to get started with application development.

| Document | Description |
|----------|-------------|
| [📘 Application Developer Guide](./README.md) | Main developer guide for PDF Object Overlay application |
| [🚀 Development Environment Setup](./GETTING-STARTED.md) | Setup Node.js and LuaLaTeX |
| [🏗️ Application Architecture](./ARCHITECTURE.md) | XML→PDF pipeline, coordinate system, version control |
| [🤝 Contributing to the Application](./CONTRIBUTING.md) | How to contribute features and improvements |

---

## 🔧 Core Modules

Deep dives into the application's core modules (100% JavaScript).

| Document | Description |
|----------|-------------|
| [🔧 XML Transformation Engine](./modules/ENGINE.md) | XML→TeX engine, templates, and filters |
| [🖥️ Server Module](./modules/SERVER.md) | HTTP REST API, WebSocket server, version control |
| [📍 PDF Geometry & Coordinates](./modules/PDF-GEOMETRY.md) | Coordinate extraction using zref-savepos |

---

## 🔄 Application Workflows

Understanding the application's key workflows.

| Document | Description |
|----------|-------------|
| [🔄 XML→PDF Pipeline Workflow](./workflows/XML-TO-PDF-PIPELINE.md) | Complete document generation workflow with versioning |

---

## ✨ Features

In-depth documentation for key application features.

| Document | Tags | Description |
|----------|------|-------------|
| [📚 Version Control System](./features/VERSION-CONTROL.md) | `version-control` `database` `history` | Complete document version management with NeDB |
| [🔄 Dynamic Schema Detection](./features/DYNAMIC-SCHEMA-DETECTION.md) | `NEW` `schema` `xml` | Automatic XML element name adaptation |

---

## 🌐 API Reference

Complete API documentation for integration.

| Document | Description |
|----------|-------------|
| [🌐 REST API Reference](./api/REST-API.md) | HTTP REST endpoints and WebSocket protocol |

---

## 📝 How-To Guides

Practical step-by-step guides for common tasks.

| Document | Tags | Description |
|----------|------|-------------|
| [📝 How to Add New Instructions](./guides/ADDING-NEW-INSTRUCTIONS.md) | `how-to` | Step-by-step guide to adding XML instructions |
| [🚀 Version Control Quick Start](./guides/VERSION-CONTROL-QUICKSTART.md) | `quickstart` `version-control` | Quick reference for version control system |
| [🎨 Version History UI Quick Start](./guides/VERSION-HISTORY-QUICKSTART.md) | `NEW` `quickstart` `ui` `react` | User guide for navigating versions in UI |
| [🧪 Testing Schema Detection](./guides/SCHEMA-DETECTION-TEST-GUIDE.md) | `NEW` `testing` `schema` | Quick guide to test schema detection |

---

## 🎨 React UI Documentation

Documentation for the React UI components and features.

| Document | Tags | Description |
|----------|------|-------------|
| [🕒 Version History UI Component](../ui-react/docs/VERSION-HISTORY-UI.md) | `NEW` `react` `component` | Complete component documentation |
| [🎨 Version History Visual Guide](../ui-react/docs/VERSION-HISTORY-VISUAL-GUIDE.md) | `NEW` `react` `visual` `design` | Visual walkthrough with UI states |

---

## 📋 Implementation Summaries

Complete implementation summaries for major features.

| Document | Tags | Description |
|----------|------|-------------|
| [✅ Version History Implementation](./implementation/VERSION-HISTORY-IMPLEMENTATION.md) | `NEW` `implementation` `summary` | Complete summary of Version History UI implementation |

---

## 📊 Documentation Statistics

### Current Version: 2.1.0
- **Total Files**: 19 documents
- **Categories**: 8 sections
- **Technologies**: Node.js, Express, WebSocket, LuaLaTeX, NeDB, React
- **Last Updated**: November 5, 2025

### Distribution by Category
```
Core Guides:             4 documents
Core Modules:            3 documents
Workflows:               1 document
Features:                2 documents
API Reference:           1 document
How-To Guides:           4 documents
React UI Documentation:  2 documents
Implementation Summaries: 1 document
```

---

## 🔍 Find Documentation By...

### By Technology
- **Node.js**: [Engine](./modules/ENGINE.md), [Server](./modules/SERVER.md), [Getting Started](./GETTING-STARTED.md)
- **React**: [Version History UI](../ui-react/docs/VERSION-HISTORY-UI.md), [Visual Guide](../ui-react/docs/VERSION-HISTORY-VISUAL-GUIDE.md)
- **WebSocket**: [Server Module](./modules/SERVER.md), [REST API](./api/REST-API.md)
- **NeDB**: [Version Control](./features/VERSION-CONTROL.md)
- **LuaLaTeX**: [PDF Geometry](./modules/PDF-GEOMETRY.md), [XML→PDF Pipeline](./workflows/XML-TO-PDF-PIPELINE.md)
- **XML**: [Engine](./modules/ENGINE.md), [Schema Detection](./features/DYNAMIC-SCHEMA-DETECTION.md)

### By Task
- **Getting Started**: [Development Setup](./GETTING-STARTED.md)
- **Understanding System**: [Architecture](./ARCHITECTURE.md), [README](./README.md)
- **Adding Features**: [Adding Instructions](./guides/ADDING-NEW-INSTRUCTIONS.md), [Contributing](./CONTRIBUTING.md)
- **Using Version Control**: [Version Control Quick Start](./guides/VERSION-CONTROL-QUICKSTART.md), [Version History UI](./guides/VERSION-HISTORY-QUICKSTART.md)
- **Testing**: [Schema Detection Testing](./guides/SCHEMA-DETECTION-TEST-GUIDE.md)
- **API Integration**: [REST API Reference](./api/REST-API.md)

### By Skill Level
- **Beginner**: [Getting Started](./GETTING-STARTED.md), [README](./README.md)
- **Intermediate**: [Architecture](./ARCHITECTURE.md), [Version Control Quick Start](./guides/VERSION-CONTROL-QUICKSTART.md)
- **Advanced**: [Engine Module](./modules/ENGINE.md), [Server Module](./modules/SERVER.md), [Version Control System](./features/VERSION-CONTROL.md)

---

## 📚 Documentation Viewing Options

### Option 1: Documentation Server (Recommended)
```bash
cd dev-docs
node serve-docs.js
# Open http://localhost:3000
```

### Option 2: File Browser
Navigate to `dev-docs/` directory and browse by category.

### Option 3: GitHub/GitLab
View directly in repository with automatic markdown rendering.

### Option 4: VS Code
Use markdown preview for enhanced viewing experience.

---

## 🔄 Recent Changes

### Version 2.1.0 (November 5, 2025)
- ✅ Added Version History UI component for React application
- ✅ Added Dynamic XML Schema Detection feature
- ✅ Added comprehensive UI documentation with visual guides
- ✅ Added quick start guides for version control and schema detection
- ✅ Added implementation summaries section
- ✅ Organized all documentation into proper dev-docs structure
- ✅ Updated docs-config.json with all new documentation

### Version 2.0.0 (November 5, 2025)
- ✅ Added Version Control System with NeDB database
- ✅ Removed all Python dependencies - 100% JavaScript/Node.js
- ✅ Updated REST API documentation (HTTP vs WebSocket clarification)
- ✅ Added automatic version tracking for every instruction
- ✅ Added WebSocket endpoints for version history and restoration
- ✅ Updated all module documentation to reflect current implementation

---

## 🎯 Learning Paths

### Path 1: New Developer
1. Start with [Getting Started](./GETTING-STARTED.md)
2. Read [README](./README.md) for overview
3. Review [Architecture](./ARCHITECTURE.md)
4. Try [Version Control Quick Start](./guides/VERSION-CONTROL-QUICKSTART.md)
5. Explore [REST API Reference](./api/REST-API.md)

### Path 2: Feature Developer
1. Review [Architecture](./ARCHITECTURE.md)
2. Study [Engine Module](./modules/ENGINE.md)
3. Read [Adding Instructions Guide](./guides/ADDING-NEW-INSTRUCTIONS.md)
4. Check [Contributing Guide](./CONTRIBUTING.md)
5. Reference [Server Module](./modules/SERVER.md)

### Path 3: UI Developer
1. Start with [Getting Started](./GETTING-STARTED.md)
2. Read [Version History UI Guide](../ui-react/docs/VERSION-HISTORY-UI.md)
3. Review [Visual Guide](../ui-react/docs/VERSION-HISTORY-VISUAL-GUIDE.md)
4. Try [Version History Quick Start](./guides/VERSION-HISTORY-QUICKSTART.md)
5. Study [REST API Reference](./api/REST-API.md)

### Path 4: System Integrator
1. Read [Architecture](./ARCHITECTURE.md)
2. Study [REST API Reference](./api/REST-API.md)
3. Review [Server Module](./modules/SERVER.md)
4. Understand [XML→PDF Pipeline](./workflows/XML-TO-PDF-PIPELINE.md)
5. Check [Version Control System](./features/VERSION-CONTROL.md)

---

## 🔗 External Resources

### Related Documentation
- React UI Docs: `ui-react/docs/`
- Server Configuration: `server/config/server-config.json`
- Package Dependencies: `package.json`

### Community
- Issues: Report bugs and feature requests
- Discussions: Ask questions and share ideas
- Wiki: Community-maintained documentation

---

## 📝 Documentation Standards

### File Naming
- Use kebab-case: `my-document.md`
- Be descriptive: `VERSION-HISTORY-QUICKSTART.md`
- Avoid abbreviations unless common: `API`, `PDF`, `XML`

### Content Structure
- Start with title (H1)
- Include overview section
- Use clear headings (H2, H3)
- Add code examples where helpful
- End with summary or next steps

### Metadata
- Update `docs-config.json` when adding files
- Add appropriate tags
- Update changelog
- Include "Last Updated" date

---

## 🆘 Need Help?

### Can't Find Documentation?
1. Check this index
2. Search in `docs-config.json`
3. Browse by category
4. Ask in discussions

### Documentation Issues?
1. Check [Contributing Guide](./CONTRIBUTING.md)
2. Report in issues
3. Submit pull request with fixes

### Feature Questions?
1. Check relevant module documentation
2. Review API reference
3. Try quick start guides
4. Ask in discussions

---

**Complete Documentation Index! 📚**

*All documentation organized, indexed, and ready to use*

*Last Updated: November 5, 2025*

