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
const VersionManager = require('./modules/VersionManager');

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
        
        this.versionManager = new VersionManager(this.configManager);

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

            // Enable CORS for React app
            this.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

                // Handle preflight requests
                if (req.method === 'OPTIONS') {
                    return res.sendStatus(200);
                }
                next();
            });

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

            case 'getVersionHistory':
                await this.getVersionHistory(ws, data);
                break;

            case 'restoreVersion':
                await this.restoreVersion(ws, data);
                break;

            case 'getVersionStats':
                await this.getVersionStats(ws, data);
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

            // Progress updates with percentages
            this.sendToClient(ws, {
                type: 'generation_progress',
                progress: 10,
                message: `Converting ${documentName}.xml to TeX...`
            });

            // Convert XML to TeX
            const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath, outputName);

            if (!texResult.success) {
                throw new Error(texResult.error);
            }

            this.sendToClient(ws, {
                type: 'generation_progress',
                progress: 33,
                message: 'TeX conversion complete. Compiling PDF...'
            });

            // Generate PDF with coordinates
            const pdfResult = await this.documentConverter.texToPdf(texResult.texPath, outputName);

            if (!pdfResult.success) {
                throw new Error(pdfResult.error);
            }

            this.sendToClient(ws, {
                type: 'generation_progress',
                progress: 75,
                message: 'PDF compiled. Copying files to UI directory...'
            });

            // Copy files to UI directory
            const uiDir = path.join(this.projectRoot, 'ui');
            const pdfPath = pdfResult.pdfPath;
            const jsonPath = pdfResult.jsonPath;

            await fs.promises.copyFile(pdfPath, path.join(uiDir, path.basename(pdfPath)));
            await fs.promises.copyFile(jsonPath, path.join(uiDir, path.basename(jsonPath)));

            this.sendToClient(ws, {
                type: 'generation_progress',
                progress: 95,
                message: 'Files copied. Finalizing...'
            });

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

            // Determine correct XML and template paths based on current document FIRST
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

            // Apply instruction to XML (pass the correct XML path based on current document)
            const result = await this.xmlProcessor.applyInstruction(
                elementId,
                overlayType,
                instruction,
                instructionValue,
                xmlPath  // Pass the xmlPath so XMLProcessor loads the correct file
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            // Convert XML to TeX with correct template
            console.log('🔄 Converting XML to TeX...');
            this.sendToClient(ws, {
                type: 'processing_progress',
                progress: 20,
                message: 'Converting modified XML to TeX...'
            });

            const texResult = await this.documentConverter.xmlToTex(xmlPath, templatePath, outputName);

            if (!texResult.success) {
                throw new Error(texResult.error);
            }

            // Convert TeX to PDF and generate JSON
            console.log('📄 Converting TeX to PDF and generating coordinates...');
            this.sendToClient(ws, {
                type: 'processing_progress',
                progress: 50,
                message: 'Compiling updated PDF...'
            });

            const pdfResult = await this.documentConverter.texToPdf(texResult.texPath, outputName);

            if (!pdfResult.success) {
                throw new Error(pdfResult.error);
            }

            // Copy files to UI directory
            console.log('📁 Copying files to UI directory...');
            this.sendToClient(ws, {
                type: 'processing_progress',
                progress: 85,
                message: 'Copying updated files...'
            });

            const uiDir = path.join(this.projectRoot, 'ui');
            await fs.promises.copyFile(pdfResult.pdfPath, path.join(uiDir, path.basename(pdfResult.pdfPath)));
            await fs.promises.copyFile(pdfResult.jsonPath, path.join(uiDir, path.basename(pdfResult.jsonPath)));

            this.sendToClient(ws, {
                type: 'processing_progress',
                progress: 95,
                message: 'Files updated. Finalizing...'
            });

            // Save version after successful processing
            try {
                await this.versionManager.saveVersion({
                    documentName: this.currentDocument || 'document',
                    instruction: data.instruction,
                    instructionValue: data.instructionValue,
                    elementId: data.elementId,
                    overlayType: data.overlayType,
                    xmlPath: xmlPath,
                    texPath: texResult.texPath,
                    pdfPath: pdfResult.pdfPath,
                    jsonPath: pdfResult.jsonPath,
                    templatePath: templatePath,
                    userId: data.userId || 'system',
                    description: `Applied ${data.instruction} to ${data.elementId}`
                });

                console.log('💾 Version saved successfully');
            } catch (versionError) {
                console.error('⚠️  Failed to save version:', versionError);
                // Don't fail the operation if version saving fails
            }

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

    async getVersionHistory(ws, data) {
        try {
            const { documentName, limit } = data;
            console.log(`📚 Fetching version history for: ${documentName}`);

            const history = await this.versionManager.getVersionHistory(
                documentName || this.currentDocument || 'document',
                limit || 50
            );

            console.log(`✅ Found ${history.length} versions`);

            this.sendToClient(ws, {
                type: 'version_history',
                documentName: documentName || this.currentDocument,
                history: history.map(v => ({
                    _id: v._id,
                    versionNumber: v.versionNumber,
                    versionHash: v.versionHash,
                    timestamp: v.timestamp,
                    instruction: v.instruction,
                    instructionValue: v.instructionValue,
                    elementId: v.elementId,
                    overlayType: v.overlayType,
                    isActive: v.isActive,
                    userId: v.userId,
                    description: v.description
                }))
            });

        } catch (error) {
            console.error('❌ Error fetching version history:', error);
            this.sendToClient(ws, {
                type: 'error',
                message: `Failed to fetch version history: ${error.message}`
            });
        }
    }

    async restoreVersion(ws, data) {
        try {
            const { documentName, versionNumber } = data;
            console.log(`⏮️  Restoring version ${versionNumber} for: ${documentName}`);

            this.sendToClient(ws, {
                type: 'restore_started',
                documentName,
                versionNumber
            });

            const result = await this.versionManager.restoreVersion(
                documentName || this.currentDocument || 'document',
                versionNumber
            );

            // Broadcast to all clients that version was restored
            this.broadcastToAllClients({
                type: 'version_restored',
                documentName: documentName || this.currentDocument,
                versionNumber: result.version,
                timestamp: result.timestamp,
                files: {
                    pdf: result.files.pdf,
                    json: result.files.json,
                    xml: result.files.xml
                }
            });

            console.log(`✅ Version ${versionNumber} restored successfully`);

        } catch (error) {
            console.error('❌ Error restoring version:', error);
            this.sendToClient(ws, {
                type: 'restore_error',
                documentName: data.documentName,
                versionNumber: data.versionNumber,
                error: error.message
            });
        }
    }

    async getVersionStats(ws, data) {
        try {
            const { documentName } = data;
            console.log(`📊 Fetching version stats for: ${documentName}`);

            const stats = await this.versionManager.getVersionStats(
                documentName || this.currentDocument || 'document'
            );

            this.sendToClient(ws, {
                type: 'version_stats',
                documentName: documentName || this.currentDocument,
                stats
            });

        } catch (error) {
            console.error('❌ Error fetching version stats:', error);
            this.sendToClient(ws, {
                type: 'error',
                message: `Failed to fetch version stats: ${error.message}`
            });
        }
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