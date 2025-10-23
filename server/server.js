const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');

// Import our modules
const ConfigManager = require('./modules/ConfigManager');
const XMLProcessor = require('./modules/XMLProcessor');
const DocumentConverter = require('./modules/DocumentConverter');
const FileWatcher = require('./modules/FileWatcher');

class PDFOverlayServer {
    constructor() {
        // Set project root directory
        this.projectRoot = path.join(__dirname, '..');
        
        this.configManager = new ConfigManager();
        this.xmlProcessor = new XMLProcessor(this.configManager);
        
        // Create event emitter for real-time process output
        this.processEmitter = new EventEmitter();
        this.documentConverter = new DocumentConverter(this.configManager, this.processEmitter);
        
        this.fileWatcher = new FileWatcher(this.configManager);
        
        this.clients = new Set();
        this.port = process.env.PORT || 8081;
        this.currentDocument = null; // Track current document
        
        // Setup process event listeners
        this.setupProcessEventListeners();
        
        this.init();
    }
    
    setupProcessEventListeners() {
        // Listen for process output events and broadcast to WebSocket clients
        this.processEmitter.on('process_output', (data) => {
            this.broadcastToAllClients({
                type: 'process_output',
                outputType: data.type, // 'stdout' or 'stderr'
                message: data.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    async init() {
        try {
            // Load configuration
            await this.configManager.loadConfig();
            console.log('📋 Configuration loaded');

            // Setup Express app for serving API endpoints
            this.app = express();
            this.app.use(express.json());
            this.app.use(express.static(path.join(__dirname, '../')));
            
            // Setup HTTP server
            this.server = http.createServer(this.app);
            
            // Setup WebSocket server
            this.wss = new WebSocket.Server({ server: this.server });
            
            // Setup routes
            this.setupRoutes();
            
            // Setup WebSocket handlers
            this.setupWebSocketHandlers();
            
            // Setup file watcher
            this.setupFileWatcher();
            
            // Start server
            this.server.listen(this.port, () => {
                console.log(`🚀 PDF Overlay Server running on port ${this.port}`);
                console.log(`📡 WebSocket server ready for connections`);
                console.log(`🌐 HTTP server: http://localhost:${this.port}`);
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize server:', error);
            process.exit(1);
        }
    }

    setupRoutes() {
        // Get dropdown options for overlay types
        this.app.get('/api/dropdown-options/:type', (req, res) => {
            try {
                const { type } = req.params;
                const options = this.configManager.getDropdownOptions(type);
                
                if (!options) {
                    return res.status(404).json({ error: `Unknown overlay type: ${type}` });
                }
                
                res.json({ type, options });
            } catch (error) {
                console.error('Error getting dropdown options:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get all dropdown options
        this.app.get('/api/dropdown-options', (req, res) => {
            try {
                const allOptions = this.configManager.getAllDropdownOptions();
                res.json(allOptions);
            } catch (error) {
                console.error('Error getting all dropdown options:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                clients: this.clients.size 
            });
        });

        // Get server configuration (for debugging)
        this.app.get('/api/config', (req, res) => {
            res.json(this.configManager.getConfig());
        });
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, request) => {
            console.log('🔗 New WebSocket connection established');
            this.clients.add(ws);

            // Send initial configuration to client
            this.sendToClient(ws, {
                type: 'config',
                data: {
                    dropdownOptions: this.configManager.getAllDropdownOptions()
                }
            });

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('❌ Error processing WebSocket message:', error);
                    this.sendToClient(ws, {
                        type: 'error',
                        message: 'Failed to process message: ' + error.message
                    });
                }
            });

            ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }

    async handleWebSocketMessage(ws, data) {
        console.log('📨 Received message:', data);

        switch (data.type) {
            case 'generate_document':
                await this.generateDocument(ws, data);
                break;

            case 'instruction':
                await this.processInstruction(ws, data);
                break;
                
            case 'ping':
                this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
                break;
                
            case 'getDropdownOptions':
                this.sendDropdownOptions(ws, data.overlayType);
                break;
                
            default:
                console.warn('⚠️ Unknown message type:', data.type);
                this.sendToClient(ws, {
                    type: 'error',
                    message: `Unknown message type: ${data.type}`
                });
        }
    }

    async generateDocument(ws, data) {
        const { documentName } = data;
        console.log(`🚀 Generating document: ${documentName}`);

        try {
            // Validate projectRoot is set
            if (!this.projectRoot) {
                throw new Error('Project root is not set');
            }

            console.log(`📁 Project root: ${this.projectRoot}`);

            // Send generation started notification
            this.sendToClient(ws, {
                type: 'generation_started',
                documentName
            });

            // Determine XML and template paths based on document name
            let xmlPath, templatePath, outputName;
            
            if (documentName === 'document') {
                xmlPath = path.join(this.projectRoot, 'xml/document.xml');
                templatePath = path.join(this.projectRoot, 'template/document.tex.xml');
                outputName = 'document-generated';
            } else if (documentName === 'ENDEND10921') {
                xmlPath = path.join(this.projectRoot, 'xml/ENDEND10921.xml');
                templatePath = path.join(this.projectRoot, 'template/ENDEND10921-sample-style.tex.xml');
                outputName = 'ENDEND10921-generated';
            } else {
                throw new Error(`Unknown document: ${documentName}`);
            }

            // Validate paths
            console.log(`📄 XML path: ${xmlPath}`);
            console.log(`📋 Template path: ${templatePath}`);
            console.log(`📦 Output name: ${outputName}`);

            if (!await fs.pathExists(xmlPath)) {
                throw new Error(`XML file not found: ${xmlPath}`);
            }

            if (!await fs.pathExists(templatePath)) {
                throw new Error(`Template file not found: ${templatePath}`);
            }

            // Track current document
            this.currentDocument = documentName;

            // Progress updates
            this.sendToClient(ws, {
                type: 'generation_progress',
                message: `Converting ${documentName}.xml to TeX...`
            });

            // Convert XML to TeX
            const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath, outputName);
            
            if (!texResult.success) {
                throw new Error(texResult.error);
            }

            this.sendToClient(ws, {
                type: 'generation_progress',
                message: 'Compiling PDF...'
            });

            // Generate PDF with coordinates
            const pdfResult = await this.documentConverter.texToPdf(texResult.texPath, outputName);
            
            if (!pdfResult.success) {
                throw new Error(pdfResult.error);
            }

            this.sendToClient(ws, {
                type: 'generation_progress',
                message: 'Copying files to UI directory...'
            });

            // Copy files to UI directory
            const uiDir = path.join(this.projectRoot, 'ui');
            const pdfPath = pdfResult.pdfPath;
            const jsonPath = pdfResult.jsonPath;

            await fs.promises.copyFile(pdfPath, path.join(uiDir, path.basename(pdfPath)));
            await fs.promises.copyFile(jsonPath, path.join(uiDir, path.basename(jsonPath)));

            // Send completion notification with file paths
            this.sendToClient(ws, {
                type: 'generation_complete',
                documentName,
                pdfPath: path.join(uiDir, path.basename(pdfPath)),
                jsonPath: path.join(uiDir, path.basename(jsonPath))
            });

            console.log(`✅ Document generation complete: ${documentName}`);

        } catch (error) {
            console.error('❌ Document generation failed:', error);
            this.sendToClient(ws, {
                type: 'generation_error',
                documentName,
                error: error.message
            });
        }
    }

    async processInstruction(ws, data) {
        try {
            const { elementId, overlayType, instruction, instructionValue } = data;
            
            console.log(`🎯 Processing instruction: ${overlayType} - ${instruction} for element ${elementId}`);
            
            // Send processing started notification
            this.sendToClient(ws, {
                type: 'processing_started',
                elementId,
                overlayType,
                instruction
            });

            // Apply instruction to XML
            const result = await this.xmlProcessor.applyInstruction(
                elementId, 
                overlayType, 
                instruction, 
                instructionValue
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            // Determine correct XML and template paths based on current document
            let xmlPath, templatePath, outputName;
            if (this.currentDocument === 'ENDEND10921') {
                xmlPath = path.join(this.projectRoot, 'xml/ENDEND10921.xml');
                templatePath = path.join(this.projectRoot, 'template/ENDEND10921-sample-style.tex.xml');
                outputName = 'ENDEND10921-generated';
            } else if (this.currentDocument === 'document') {
                xmlPath = path.join(this.projectRoot, 'xml/document.xml');
                templatePath = path.join(this.projectRoot, 'template/document.tex.xml');
                outputName = 'document-generated';
            } else {
                // Fallback to config if no current document is set
                console.warn('⚠️  No current document set, using config defaults');
                xmlPath = this.configManager.getFilePath('xmlInput');
                templatePath = path.join(this.projectRoot, 'template/document.tex.xml');
                outputName = 'document-generated';
            }

            console.log(`📋 Using document: ${this.currentDocument || 'default'}`);
            console.log(`📄 XML path: ${xmlPath}`);
            console.log(`📋 Template path: ${templatePath}`);

            // Convert XML to TeX with correct template
            console.log('🔄 Converting XML to TeX...');
            const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath, outputName);
            
            if (!texResult.success) {
                throw new Error(texResult.error);
            }

            // Convert TeX to PDF and generate JSON
            console.log('📄 Converting TeX to PDF and generating coordinates...');
            const pdfResult = await this.documentConverter.texToPdf(texResult.texPath, outputName);
            
            if (!pdfResult.success) {
                throw new Error(pdfResult.error);
            }

            // Copy files to UI directory
            console.log('📁 Copying files to UI directory...');
            const uiDir = path.join(this.projectRoot, 'ui');
            await fs.promises.copyFile(pdfResult.pdfPath, path.join(uiDir, path.basename(pdfResult.pdfPath)));
            await fs.promises.copyFile(pdfResult.jsonPath, path.join(uiDir, path.basename(pdfResult.jsonPath)));

            // Notify client of successful completion
            this.broadcastToAllClients({
                type: 'processing_complete',
                elementId,
                overlayType,
                instruction,
                result: {
                    pdfPath: path.join(uiDir, path.basename(pdfResult.pdfPath)),
                    jsonPath: path.join(uiDir, path.basename(pdfResult.jsonPath)),
                    timestamp: new Date().toISOString()
                }
            });

            console.log('✅ Instruction processing completed successfully');

        } catch (error) {
            console.error('❌ Error processing instruction:', error);
            
            this.sendToClient(ws, {
                type: 'processing_error',
                elementId: data.elementId,
                error: error.message
            });
        }
    }

    sendDropdownOptions(ws, overlayType) {
        const options = overlayType 
            ? this.configManager.getDropdownOptions(overlayType)
            : this.configManager.getAllDropdownOptions();
            
        this.sendToClient(ws, {
            type: 'dropdown_options',
            overlayType,
            options
        });
    }

    setupFileWatcher() {
        // Watch for changes to generated files and notify clients
        this.fileWatcher.onFileChange((eventType, filePath) => {
            console.log(`📁 File ${eventType}: ${filePath}`);
            
            this.broadcastToAllClients({
                type: 'file_change',
                eventType,
                filePath,
                timestamp: new Date().toISOString()
            });
        });
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastToAllClients(message) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    async shutdown() {
        console.log('🛑 Shutting down server...');
        
        // Close all WebSocket connections
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        
        // Stop file watcher
        if (this.fileWatcher) {
            this.fileWatcher.stop();
        }
        
        // Close HTTP server
        if (this.server) {
            this.server.close();
        }
        
        console.log('✅ Server shutdown complete');
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    if (global.pdfOverlayServer) {
        global.pdfOverlayServer.shutdown().then(() => {
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Start the server
if (require.main === module) {
    global.pdfOverlayServer = new PDFOverlayServer();
}

module.exports = PDFOverlayServer;