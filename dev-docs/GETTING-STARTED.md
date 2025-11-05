# 🚀 Getting Started - Development Environment Setup

This guide will help you set up your development environment for the PDF Object Overlay System.

---

## 📋 Prerequisites

### Required Software

#### 1. **Node.js** (>= 12.0.0)
```bash
# Check version
node --version

# Install via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. **LuaLaTeX** (TeX Live distribution)
```bash
# macOS
brew install --cask mactex

# Linux (Ubuntu/Debian)
sudo apt-get install texlive-full

# Check installation
which lualatex
lualatex --version
```

#### 3. **Git**
```bash
# Check version
git --version

# macOS
brew install git

# Linux
sudo apt-get install git
```

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd prototype-pdf-object-overlay
```

### 2. Install Node.js Dependencies
```bash
# Install backend dependencies
npm install

# Install React UI dependencies
cd ui-react
npm install
cd ..
```

### 3. Verify Installation
```bash
# Check npm packages
npm list

# Check LaTeX
lualatex --version
```

---

## 🛠️ Development Environment Configuration

### IDE Setup

#### **VS Code** (Recommended)
1. Install VS Code: https://code.visualstudio.com/

2. Install recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "yzhang.markdown-all-in-one",
    "James-Yu.latex-workshop"
  ]
}
```

3. Configure workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.tex.xml": "xml"
  }
}
```

#### **WebStorm / IntelliJ IDEA**
1. Open project folder
2. Enable Node.js support
3. Configure JavaScript version (ES6+)
4. Set up LaTeX plugin for template files

---

## 🏃 Running the Development Server

### Method 1: Full Stack Development

#### Terminal 1: Backend Server
```bash
npm run server
# Server runs on http://localhost:8081
```

#### Terminal 2: React Development Server
```bash
npm run dev:react
# React UI runs on http://localhost:5173
```

#### Terminal 3: Watch TeX Files (Optional)
```bash
# Auto-recompile on template changes
watch -n 2 'npm run build'
```

### Method 2: Backend Only
```bash
# Start server with vanilla UI
npm run server

# Access vanilla UI
open http://localhost:8081/ui/
```

### Method 3: CLI Development
```bash
# Test CLI directly
node src/cli.js --input xml/document.xml --template template/document.tex.xml
```

---

## 📂 Project Structure Overview

```
prototype-pdf-object-overlay/
├── src/                        # Core engine code
│   ├── cli.js                 # Command-line interface
│   ├── engine.js              # XML → TeX transformation
│   ├── pdf-geometry.js        # Coordinate extraction
│   └── tex-to-pdf.js          # LaTeX compilation
│
├── server/                     # Server code
│   ├── server.js              # Main server
│   ├── modules/               # Server modules
│   │   ├── DocumentConverter.js
│   │   ├── XMLProcessor.js
│   │   ├── ConfigManager.js
│   │   └── FileWatcher.js
│   └── config/
│       └── server-config.json # Server configuration
│
├── ui-react/                   # React UI
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── context/           # React context
│   │   └── App.jsx            # Main app
│   └── public/                # Static assets
│
├── ui/                         # Vanilla JavaScript UI
│   ├── index.html
│   └── app.js
│
├── template/                   # LaTeX templates
│   ├── document.tex.xml       # Generic template
│   └── ENDEND10921-sample-style.tex.xml
│
├── TeX-lib/                    # LaTeX libraries
│   └── geom-marks.tex         # Coordinate marking
│
├── xml/                        # Sample XML documents
│   ├── document.xml
│   └── ENDEND10921.xml
│
├── scripts/                    # Utility scripts
│   ├── generate-pdf-robust.sh
│   └── external/              # External utility scripts
│
├── TeX/                        # Generated TeX/PDF files
│   └── *.pdf, *.tex, *.json
│
├── docs/                       # User documentation
└── dev-docs/                   # Developer documentation
```

---

## 🧪 Testing Your Setup

### 1. Test CLI
```bash
npm run test:cli
# Should generate a test PDF
```

### 2. Test Server
```bash
# Start server
npm run server

# In another terminal, test HTTP API
curl http://localhost:8081/api/health
# Should return: {"status":"ok","timestamp":"...","clients":0}

curl http://localhost:8081/api/dropdown-options
# Should return dropdown options configuration
```

### 3. Test PDF Generation
```bash
# Generate PDF from sample XML
node src/cli.js \
  --input xml/document.xml \
  --template template/document.tex.xml \
  --output TeX/test-output.pdf

# Check output
ls -la TeX/test-output.pdf
open TeX/test-output.pdf
```

### 4. Test React UI
```bash
# Start backend
npm run server

# Start React (in another terminal)
npm run dev:react

# Open browser
open http://localhost:5173
```

---

## 🔧 Common Setup Issues

### Issue 1: LuaLaTeX Not Found
**Symptom:** `lualatex: command not found`

**Solution:**
```bash
# Add TeX Live to PATH
export PATH="/Library/TeX/texbin:$PATH"  # macOS
export PATH="/usr/local/texlive/2023/bin/x86_64-linux:$PATH"  # Linux

# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH="/Library/TeX/texbin:$PATH"' >> ~/.zshrc
```

### Issue 2: Node Module Errors
**Symptom:** `Cannot find module 'express'`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For React UI
cd ui-react
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Port Already in Use
**Symptom:** `Error: listen EADDRINUSE: address already in use :::8081`

**Solution:**
```bash
# Find process using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=8082 npm run server
```

---

## 🌐 Environment Variables

Create a `.env` file in the project root:

```bash
# Server configuration
PORT=8081
NODE_ENV=development

# LaTeX settings
LUALATEX_PATH=/Library/TeX/texbin/lualatex

# File paths
XML_DIR=./xml
TEMPLATE_DIR=./template
OUTPUT_DIR=./TeX

# Development settings
DEBUG=true
VERBOSE_LOGGING=true
```

Load in your code:
```javascript
require('dotenv').config();
const port = process.env.PORT || 8081;
```

---

## 📝 Development Workflow

### 1. **Start Development Session**
```bash
# Open terminals
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev:react

# Terminal 3: Git/misc commands
git status
```

### 2. **Make Changes**
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes to code
# ... edit files ...

# Test changes
npm run test
```

### 3. **Test Locally**
```bash
# Test backend HTTP API changes
curl http://localhost:8081/api/health
curl http://localhost:8081/api/dropdown-options

# Test WebSocket connection (using wscat)
npm install -g wscat
wscat -c ws://localhost:8081
# Send: {"type":"ping"}

# Test frontend changes
# Open browser to http://localhost:5173

# Test CLI changes
node src/cli.js --input xml/document.xml --template template/document.tex.xml
```

### 4. **Commit Changes**
```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/my-feature
```

---

## 🔍 Debugging Setup

### Node.js Debugging in VS Code

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server/server.js",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/src/cli.js",
      "args": ["--input", "xml/document.xml", "--template", "template/document.tex.xml"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Chrome DevTools for React

1. Start React dev server: `npm run dev:react`
2. Open Chrome DevTools (F12)
3. Sources tab → Set breakpoints
4. Use React DevTools extension

### LaTeX Debugging

```bash
# Enable LaTeX tracing
lualatex -interaction=nonstopmode -file-line-error document-generated.tex

# View detailed log
cat TeX/document-generated.log
```

---

## 📊 Performance Monitoring

### Development Metrics

```javascript
// Add to any module
const { performance } = require('perf_hooks');

const start = performance.now();
// ... your code ...
const end = performance.now();
console.log(`⏱️ Execution time: ${(end - start).toFixed(2)}ms`);
```

### Memory Usage

```javascript
const used = process.memoryUsage();
console.log('Memory Usage:');
for (let key in used) {
  console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}
```

---

## 🎯 Next Steps

1. ✅ **Environment is set up** → Proceed to [Architecture Overview](./ARCHITECTURE.md)
2. ✅ **Ready to code** → Read [Contributing Guide](./CONTRIBUTING.md)
3. ✅ **Want to understand modules** → Check [Module Documentation](./modules/)
4. ✅ **Need API reference** → See [API Documentation](./api/)

---

## 📚 Additional Resources

### Internal
- [Project README](../README.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Module Documentation](./modules/)

### External
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)
- [LuaLaTeX Guide](http://www.luatex.org/documentation.html)

---

**Your development environment is ready! 🎉**

*Last Updated: November 3, 2025*

