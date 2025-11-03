# 🏗️ System Architecture

This document provides a comprehensive overview of the PDF Object Overlay System architecture, design principles, and implementation details.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Design Principles](#system-design-principles)
3. [Architecture Layers](#architecture-layers)
4. [Component Interactions](#component-interactions)
5. [Data Flow](#data-flow)
6. [Key Subsystems](#key-subsystems)
7. [Technology Stack](#technology-stack)
8. [Design Patterns](#design-patterns)

---

## 🎯 Overview

The PDF Object Overlay System is a multi-layered application that transforms XML documents into PDFs with precise element coordinate extraction. The system enables interactive visualization and manipulation of PDF content through a web interface.

### Core Capabilities
- **XML to PDF Conversion**: Transform structured XML into formatted PDFs
- **Coordinate Extraction**: Extract precise element positions from PDFs
- **Interactive Overlays**: Visualize and interact with PDF elements
- **Real-time Processing**: Live updates via WebSocket communication
- **Template-Based Transformation**: Flexible XML transformation using templates

---

## 🎨 System Design Principles

### 1. **Separation of Concerns**
- **Presentation Layer**: UI components (React/Vanilla JS)
- **Application Layer**: Server logic and API
- **Business Logic**: Core transformation engine
- **Data Layer**: File system and generated artifacts

### 2. **Modularity**
- Independent, reusable modules
- Clear module responsibilities
- Loose coupling between components
- High cohesion within modules

### 3. **Extensibility**
- Plugin-based template system
- Configurable transformation rules
- Extensible instruction processing
- Schema-agnostic XML processing

### 4. **Reliability**
- 3-pass LaTeX compilation for accuracy
- Robust error handling
- File watching for auto-regeneration
- Comprehensive logging

### 5. **Performance**
- Asynchronous operations
- Streaming where possible
- Caching of intermediate results
- Parallel processing where applicable

---

## 🏛️ Architecture Layers

```mermaid
graph TB
    subgraph "PRESENTATION LAYER"
        ReactUI[React UI<br/>Modern]
        VanillaUI[Vanilla UI<br/>Legacy]
        CLI[CLI Tool<br/>Scripting]
    end
    
    subgraph "APPLICATION LAYER"
        Express[Express HTTP API]
        WebSocket[WebSocket Server]
        Orchestration[Server Orchestration<br/>PDFOverlayServer]
    end
    
    subgraph "BUSINESS LOGIC LAYER"
        DocConverter[Document Converter]
        XMLProc[XML Processor]
        FileWatch[File Watcher]
        Engine[Transformation Engine<br/>engine.js]
    end
    
    subgraph "PROCESSING LAYER"
        TexToPDF[TeX to PDF Compiler<br/>LuaLaTeX]
        PDFGeom[PDF Geometry Extractor]
        PyScripts[Python Scripts]
    end
    
    subgraph "DATA LAYER"
        XMLFiles[(XML Files)]
        TexFiles[(TeX Files)]
        PDFFiles[(PDF Files)]
        JSONFiles[(JSON/NDJSON Files)]
    end
    
    ReactUI --> Express
    VanillaUI --> WebSocket
    CLI --> Orchestration
    
    Express --> Orchestration
    WebSocket --> Orchestration
    
    Orchestration --> DocConverter
    Orchestration --> XMLProc
    Orchestration --> FileWatch
    
    DocConverter --> Engine
    XMLProc --> Engine
    
    Engine --> TexToPDF
    TexToPDF --> PDFGeom
    PDFGeom --> PyScripts
    
    Engine --> XMLFiles
    Engine --> TexFiles
    TexToPDF --> PDFFiles
    PDFGeom --> JSONFiles
    
    style ReactUI fill:#42b883,color:#fff
    style VanillaUI fill:#42b883,color:#fff
    style CLI fill:#42b883,color:#fff
    style Orchestration fill:#35495e,color:#fff
    style Engine fill:#ff6b6b,color:#fff
    style TexToPDF fill:#4ecdc4,color:#fff
```

---

## 🔄 Component Interactions

### 1. **User Initiates PDF Generation**

```mermaid
sequenceDiagram
    participant User
    participant ReactUI
    participant Server
    participant DocConverter
    participant Engine
    participant LuaLaTeX
    participant PDFGeometry
    
    User->>ReactUI: Request PDF Generation
    ReactUI->>Server: POST /api/generate-document<br/>{xmlFile, templateFile}
    Server->>DocConverter: generateDocument()
    DocConverter->>Engine: transformXMLToTeX()
    
    Engine->>Engine: Load XML document
    Engine->>Engine: Load template
    Engine->>Engine: Parse selectors
    Engine->>Engine: Apply transformations
    Engine->>Engine: Generate .tex file
    
    Engine-->>DocConverter: .tex file created
    DocConverter->>LuaLaTeX: compilePDF()
    
    LuaLaTeX->>LuaLaTeX: Pass 1: Initial compilation
    LuaLaTeX->>LuaLaTeX: Pass 2: Resolve references
    LuaLaTeX->>LuaLaTeX: Pass 3: Final positioning
    
    LuaLaTeX-->>DocConverter: .pdf + .aux + .ndjson
    DocConverter->>PDFGeometry: extractCoordinates()
    
    PDFGeometry->>PDFGeometry: Parse .aux file
    PDFGeometry->>PDFGeometry: Read .ndjson file
    PDFGeometry->>PDFGeometry: Process coordinates
    PDFGeometry->>PDFGeometry: Generate .json geometry
    
    PDFGeometry-->>Server: geometry.json created
    Server->>ReactUI: WebSocket: document_ready
    ReactUI->>User: Display PDF & Overlays
```

### 2. **User Applies Instruction (e.g., Move Figure)**

```mermaid
sequenceDiagram
    participant User
    participant ReactUI
    participant Server
    participant XMLProcessor
    participant ConfigManager
    participant Regeneration
    
    User->>ReactUI: Select "Move to Section Start"
    ReactUI->>Server: POST /api/process-instruction<br/>{action: 'move_to_section_start', elementId: 'fig-1'}
    Server->>XMLProcessor: processInstruction()
    
    XMLProcessor->>ConfigManager: getProcessingRule()
    ConfigManager-->>XMLProcessor: {xpath, operation, parentTag}
    
    XMLProcessor->>XMLProcessor: Find element by XPath
    XMLProcessor->>XMLProcessor: Execute moveToParentStart()
    XMLProcessor->>XMLProcessor: Save modified XML
    
    XMLProcessor-->>Server: XML updated
    Server->>Regeneration: Trigger PDF regeneration
    
    Note over Server,Regeneration: Follows PDF Generation flow
    
    Regeneration-->>ReactUI: WebSocket: document_ready
    ReactUI->>User: Display updated PDF
```

### 3. **File Watcher Detects Change**

```mermaid
sequenceDiagram
    participant FileSystem
    participant FileWatcher
    participant Server
    participant Generator
    
    FileSystem->>FileWatcher: XML file modified
    FileWatcher->>FileWatcher: Emit 'change' event
    FileWatcher->>Server: handleFileChange(path)
    Server->>Generator: Auto-regenerate PDF
    
    Note over Generator: Follows PDF Generation flow
    
    Generator-->>Server: Regeneration complete
    Server->>Server: broadcastToClients()
    
    Note over Server: All connected clients<br/>receive update
```

---

## 📊 Data Flow

### XML → PDF Transformation Flow

```mermaid
flowchart TD
    A[XML Input<br/>document.xml] --> B[XML Processor<br/>Optional: Apply Instructions]
    B --> C[Template Loader<br/>document.tex.xml]
    C --> D[Transformation Engine<br/>engine.js]
    
    D --> E[TeX File<br/>document-generated.tex]
    
    E --> F[LuaLaTeX Compiler]
    F --> G{3-Pass Compilation}
    
    G -->|Pass 1| H[Initial Compilation]
    H -->|Pass 2| I[Resolve References]
    I -->|Pass 3| J[Final Positioning]
    
    J --> K[PDF File]
    J --> L[.aux File<br/>zref data]
    J --> M[.ndjson File<br/>raw coordinates]
    
    L --> N[PDF Geometry Extractor]
    M --> N
    
    N --> O[geometry.json<br/>Final Output]
    K --> P[Display PDF]
    O --> Q[Display Overlays]
    
    style A fill:#e1f5e1
    style E fill:#fff3cd
    style K fill:#f8d7da
    style O fill:#d1ecf1
```

### Coordinate Extraction Pipeline

```mermaid
flowchart LR
    A[LaTeX Source<br/>with Markers] --> B["\saveTextPos{elem-1}{start}<br/>Content<br/>\saveTextPos{elem-1}{end}"]
    B -->|LuaLaTeX<br/>Compile| C[.aux File<br/>zref labels]
    C -->|Parse .aux| D[.ndjson File<br/>raw coordinates]
    D -->|Process &<br/>Calculate| E[geometry.json<br/>bounding boxes]
    
    E --> F[Element Geometry]
    F --> G["{ page: 1,<br/>bounds: {<br/>  left: 72,<br/>  top: 720,<br/>  width: 200,<br/>  height: 20<br/>} }"]
    
    style A fill:#e1f5e1
    style C fill:#fff3cd
    style D fill:#f8d7da
    style E fill:#d1ecf1
    style G fill:#cfe2ff
```

---

## 🔑 Key Subsystems

### 1. **Template Engine (engine.js)**

**Purpose**: Transform XML to TeX using declarative templates

```mermaid
graph LR
    A[XML Document] --> B[Selector Parser]
    C[Template File] --> D[Template Parser]
    
    B --> E[Matcher]
    D --> E
    
    E --> F[Transformation Engine]
    F --> G[Filter System]
    G --> H[TeX Output]
    
    style A fill:#e1f5e1
    style C fill:#e1f5e1
    style F fill:#ff6b6b,color:#fff
    style H fill:#d1ecf1
```

**Key Components**:
- **Selector Parser**: CSS-like selectors for XML matching
- **Template Parser**: Parse template placeholders and filters
- **Transformation Engine**: Apply templates recursively
- **Filter System**: Transform text (escape, format, etc.)

**Example**:
```xml
<!-- Template -->
<template match="title">
  <tex-cmd name="section">[[./text()]]</tex-cmd>
</template>

<!-- XML -->
<title>Introduction</title>

<!-- Output TeX -->
\section{Introduction}
```

### 2. **Coordinate System (pdf-geometry.js)**

**Purpose**: Extract precise element positions from compiled PDFs

```mermaid
flowchart TD
    A[LaTeX Position<br/>Markers] --> B[zref-savepos<br/>Package]
    B --> C[.aux File]
    C --> D[Parse zref Labels]
    D --> E[Extract Coordinates<br/>x, y, page]
    E --> F[Convert Units<br/>sp → pt]
    F --> G[Group start/end Pairs]
    G --> H[Calculate Bounding Boxes]
    H --> I[Multi-column Detection]
    I --> J[Final Geometry JSON]
    
    style B fill:#4ecdc4,color:#fff
    style H fill:#ff6b6b,color:#fff
    style J fill:#d1ecf1
```

**Key Features**:
- Uses `zref-savepos` for LaTeX position marking
- Parses `.aux` file for coordinate data
- Processes NDJSON format
- Calculates bounding boxes
- Handles multi-page and multi-column layouts

**Coordinate Format**:
```json
{
  "elementId": {
    "page": 1,
    "bounds": {
      "left": 72.0,
      "top": 720.0,
      "width": 200.0,
      "height": 20.0
    },
    "type": "paragraph"
  }
}
```

### 3. **Instruction Processing (XMLProcessor.js)**

**Purpose**: Apply user instructions to modify XML documents

```mermaid
graph TD
    A[User Instruction] --> B[ConfigManager]
    B --> C{Get Processing Rule}
    C --> D[XPath Query]
    D --> E[Find Element]
    E --> F{Operation Type}
    
    F -->|setAttribute| G[Modify Attributes]
    F -->|moveToParentStart| H[Move to Beginning]
    F -->|moveToParentEnd| I[Move to End]
    F -->|insertBefore| J[Insert Before]
    F -->|insertAfter| K[Insert After]
    
    G --> L[Save Modified XML]
    H --> L
    I --> L
    J --> L
    K --> L
    
    style A fill:#e1f5e1
    style B fill:#42b883,color:#fff
    style L fill:#d1ecf1
```

**Operations**:
- `setAttribute`: Modify element attributes
- `moveToParentStart`: Move element to beginning of parent
- `moveToParentEnd`: Move element to end of parent
- `insertBefore`: Insert before another element
- `insertAfter`: Insert after another element

**Configuration-Driven**:
```json
{
  "figure": {
    "move_to_section_start": {
      "xpath": "//figure[@id='{elementId}']",
      "operation": "moveToParentStart",
      "parentTag": "section"
    }
  }
}
```

### 4. **WebSocket Communication**

**Purpose**: Real-time updates between server and clients

```mermaid
sequenceDiagram
    participant Client1
    participant Client2
    participant Server
    participant LaTeX
    
    Client1->>Server: Connect WebSocket
    Client2->>Server: Connect WebSocket
    
    Note over Server: Client registry maintained
    
    Client1->>Server: Request PDF Generation
    Server->>LaTeX: Start Compilation
    
    LaTeX->>Server: process_output (pass 1)
    Server-->>Client1: Broadcast: stage_update
    Server-->>Client2: Broadcast: stage_update
    
    LaTeX->>Server: process_output (pass 2)
    Server-->>Client1: Broadcast: stage_update
    Server-->>Client2: Broadcast: stage_update
    
    LaTeX->>Server: Compilation complete
    Server-->>Client1: Broadcast: document_ready
    Server-->>Client2: Broadcast: document_ready
```

**Message Types**:
- `process_output`: LaTeX compilation progress
- `stage_update`: Processing stage changes
- `document_ready`: PDF generation complete
- `error`: Error notifications

**Example Message**:
```json
{
  "type": "stage_update",
  "stage": "compiling",
  "message": "Compiling LaTeX (pass 2/3)...",
  "timestamp": "2025-11-03T12:00:00.000Z"
}
```

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime environment | >= 12.0.0 |
| Express | HTTP server & routing | ^4.18.2 |
| WebSocket (ws) | Real-time communication | ^8.14.2 |
| xmldom | XML parsing/manipulation | ^0.6.0 |
| xpath | XML querying | ^0.0.32 |
| peggy | Parser generator | ^1.2.0 |
| chokidar | File system watching | ^3.5.3 |
| fs-extra | Enhanced file operations | ^11.1.1 |

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI framework (modern) | ^18.2.0 |
| React DOM | React rendering | ^18.2.0 |
| Vite | Build tool | Latest |
| Vanilla JS | Legacy UI | ES6+ |

### Document Processing
| Technology | Purpose | Version |
|------------|---------|---------|
| LuaLaTeX | PDF generation | TeX Live 2023+ |
| zref-savepos | Coordinate marking | LaTeX package |
| Python 3 | Helper scripts | >= 3.7 |

---

## 🎯 Design Patterns

### 1. **Event-Driven Architecture**

```mermaid
graph LR
    A[Event Source] -->|emit| B[EventEmitter]
    B -->|process_output| C[Listener 1]
    B -->|stage_update| D[Listener 2]
    B -->|document_ready| E[Listener 3]
    
    C --> F[WebSocket Broadcast]
    D --> F
    E --> F
    
    style A fill:#e1f5e1
    style B fill:#42b883,color:#fff
    style F fill:#d1ecf1
```

- EventEmitter for process events
- WebSocket for client updates
- File watcher for auto-regeneration

```javascript
// Event emission
this.processEmitter.emit('process_output', {
  type: 'stdout',
  message: 'Compiling...'
});

// Event listening
this.processEmitter.on('process_output', (data) => {
  this.broadcastToClients(data);
});
```

### 2. **Strategy Pattern**
- Different XML processing operations
- Configurable transformation rules
- Schema-specific adaptations

```javascript
// Operation selection
const operation = config.xmlProcessingRules[elementType][action];
switch (operation.operation) {
  case 'setAttribute': return this.setAttribute(...);
  case 'moveToParentStart': return this.moveToParentStart(...);
  // ...
}
```

### 3. **Template Method Pattern**
- PDF generation workflow
- 3-pass compilation process
- Consistent error handling

```javascript
async generateDocument() {
  try {
    await this.validateInputs();
    await this.transformXMLToTeX();
    await this.compilePDF();
    await this.extractCoordinates();
    await this.notifyClients();
  } catch (error) {
    await this.handleError(error);
  }
}
```

### 4. **Observer Pattern**

```mermaid
graph TD
    A[File System] -->|change| B[File Watcher]
    B --> C[Observer 1]
    B --> D[Observer 2]
    B --> E[Observer 3]
    
    C --> F[Auto-regenerate]
    D --> G[Clear Cache]
    E --> H[Notify Clients]
    
    style B fill:#42b883,color:#fff
```

- File system monitoring
- Client subscriptions
- Real-time updates

```javascript
// File watching
this.watcher.on('change', (path) => {
  this.handleFileChange(path);
});

// Client subscriptions
this.clients.forEach(client => {
  client.send(JSON.stringify(message));
});
```

### 5. **Facade Pattern**
- ConfigManager abstracts config complexity
- DocumentConverter provides simple interface
- Server orchestrates complex workflows

```javascript
// Simple public interface
class DocumentConverter {
  async generateDocument(xmlFile, templateFile) {
    // Complex internal steps hidden
  }
}
```

---

## 📈 Scalability Considerations

### Current Limitations
- Single-threaded LaTeX compilation
- In-memory XML processing
- Local file system dependency

### Future Improvements
- Worker threads for parallel compilation
- Stream processing for large files
- Database for metadata storage
- Distributed processing queue
- Caching layer for frequently used templates

---

## 🔐 Security Considerations

### Input Validation
- Validate all file paths
- Sanitize XML input
- Restrict LaTeX commands

### Sandboxing
- Run LaTeX in restricted environment
- Limit file system access
- Timeout long-running processes

### Authentication
- WebSocket authentication (future)
- API key validation (future)
- Rate limiting (future)

---

## 📚 Further Reading

- [Module Documentation](./modules/) - Detailed module APIs
- [Workflow Documentation](./workflows/) - Process flows
- [API Documentation](./api/) - HTTP/WebSocket APIs

---

**Last Updated**: November 3, 2025
