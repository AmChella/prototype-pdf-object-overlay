# 👨‍💻 Developer Guide - Quick Access

Welcome to the PDF Object Overlay System developer resources!

---

## 📚 Developer Documentation

All developer documentation is located in the `/dev-docs/` directory.

### 🚀 Quick Start

#### For New Developers
1. **Read First**: [Developer Guide](./dev-docs/README.md) - Overview and key concepts
2. **Setup Environment**: [Getting Started](./dev-docs/GETTING-STARTED.md) - Complete setup guide
3. **Understand System**: [Architecture](./dev-docs/ARCHITECTURE.md) - System design
4. **Start Contributing**: [Contributing](./dev-docs/CONTRIBUTING.md) - Guidelines

#### For Existing Developers
- **Module Reference**: [modules/](./dev-docs/modules/) - API documentation
- **Architecture Details**: [architecture/](./dev-docs/architecture/) - Deep dives
- **Workflow Guides**: [workflows/](./dev-docs/workflows/) - Process documentation
- **API Reference**: [api/](./dev-docs/api/) - HTTP/WebSocket APIs

---

## 📖 Core Documentation

| Document | Purpose | When to Read |
|----------|---------|-------------|
| [Developer Guide](./dev-docs/README.md) | Main entry point | First time setup |
| [Getting Started](./dev-docs/GETTING-STARTED.md) | Environment setup | Setting up dev environment |
| [Architecture](./dev-docs/ARCHITECTURE.md) | System design | Understanding the system |
| [Contributing](./dev-docs/CONTRIBUTING.md) | How to contribute | Before first contribution |
| [Engine Module](./dev-docs/modules/ENGINE.md) | Core engine docs | Working with transformations |

---

## 🎯 Documentation Structure

```
/dev-docs/
├── README.md               # Developer guide overview
├── GETTING-STARTED.md      # Setup instructions
├── ARCHITECTURE.md         # System architecture
├── CONTRIBUTING.md         # Contributing guidelines
│
├── modules/                # Module documentation
│   └── ENGINE.md          # Example: Engine module
│
├── architecture/           # Architecture deep dives
│   ├── SYSTEM-OVERVIEW.md
│   ├── XML-TO-PDF-PIPELINE.md
│   ├── COORDINATE-SYSTEM.md
│   └── DATA-FLOW.md
│
├── workflows/              # Workflow documentation
│   ├── DOCUMENT-GENERATION.md
│   ├── INSTRUCTION-PROCESSING.md
│   ├── COORDINATE-EXTRACTION.md
│   └── WEBSOCKET-UPDATES.md
│
└── api/                    # API documentation
    ├── REST-API.md
    ├── WEBSOCKET-API.md
    └── MODULE-API.md
```

---

## 🏃 Quick Commands

```bash
# Setup development environment
npm install
cd ui-react && npm install && cd ..

# Start development server
npm run server          # Backend on :8081
npm run dev:react       # Frontend on :5173

# Test your setup
npm run test:cli

# Generate PDF from CLI
node src/cli.js --input xml/document.xml --template template/document.tex.xml
```

---

## 🔑 Key Concepts

### XML → PDF Pipeline
```
XML Input → Engine (Template) → TeX → LuaLaTeX → PDF + Coordinates
```

### Architecture Layers
1. **Presentation** - React UI, Vanilla UI, CLI
2. **Application** - Express Server, WebSocket
3. **Business Logic** - Converter, Processor, Engine
4. **Processing** - TeX Compiler, Geometry Extractor

### Module Responsibilities
- **Server**: HTTP/WebSocket server, API endpoints
- **Engine**: XML → TeX transformation
- **PDF Geometry**: Coordinate extraction
- **TeX to PDF**: LaTeX compilation
- **Document Converter**: High-level processing
- **XML Processor**: XML manipulation

---

## 📊 What's Documented

✅ **Development Environment Setup**
- Prerequisites (Node.js, LuaLaTeX, Python, Git)
- IDE configuration
- Running development servers
- Troubleshooting

✅ **System Architecture**
- 4-layer architecture
- Component interactions
- Data flow
- Design patterns

✅ **Contributing Guidelines**
- Development workflow
- Coding standards
- Testing guidelines
- Commit conventions
- Pull request process

✅ **Module Documentation**
- API reference
- Code examples
- Error handling
- Extension guides

---

## 🎓 Learning Path

### Week 1: Getting Started
- [ ] Read Developer Guide
- [ ] Setup development environment
- [ ] Run first PDF generation
- [ ] Explore the codebase

### Week 2: Understanding the System
- [ ] Read Architecture documentation
- [ ] Study module documentation
- [ ] Try modifying templates
- [ ] Experiment with XML transformations

### Week 3: First Contribution
- [ ] Read Contributing guidelines
- [ ] Find a good first issue
- [ ] Make your first pull request
- [ ] Respond to code review

### Week 4+: Advanced Topics
- [ ] Deep dive into specific modules
- [ ] Implement new features
- [ ] Optimize performance
- [ ] Write documentation

---

## 🆚 User Docs vs Developer Docs

### User Documentation (`/docs/`)
- **Purpose**: Learn how to use the system
- **Audience**: End users, operators
- **Content**: Features, bug fixes, user guides
- **Access**: http://localhost:3000 (docs web app)

### Developer Documentation (`/dev-docs/`)
- **Purpose**: Learn how to develop the system
- **Audience**: Developers, contributors
- **Content**: Architecture, APIs, contributing
- **Access**: Files in `/dev-docs/` directory

---

## 📞 Need Help?

### Documentation
- Start with [Developer Guide](./dev-docs/README.md)
- Check [FAQ sections](#) in module docs
- Review [Architecture](./dev-docs/ARCHITECTURE.md) for design questions

### Issues
- Search existing issues
- Check closed issues for solutions
- Open a new issue with details

### Contributing
- Read [Contributing Guide](./dev-docs/CONTRIBUTING.md)
- Follow coding standards
- Include tests with PRs
- Update documentation

---

## 🎉 Ready to Start?

**Begin here**: [`dev-docs/README.md`](./dev-docs/README.md)

This is the main entry point for all developer documentation. It will guide you through setup, architecture, and contributing.

---

**Happy Developing! 🚀**

*For user documentation, see: [`docs/`](./docs/) or http://localhost:3000*  
*For developer documentation, see: [`dev-docs/`](./dev-docs/)*

---

*Last Updated: November 3, 2025*

