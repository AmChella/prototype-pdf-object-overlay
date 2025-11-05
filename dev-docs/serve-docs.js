#!/usr/bin/env node

/**
 * Simple HTTP server to serve developer documentation
 * Usage: node serve-docs.js [port]
 * 
 * Automatically generates docs-config.json on startup
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 3000;
// Serve from dev-docs directory
const DOCS_DIR = __dirname;

// Auto-generate docs config on startup
console.log('🔄 Generating documentation config...');
try {
  const { main: generateDocsConfig } = require('./generate-docs-config.js');
  generateDocsConfig();
} catch (error) {
  console.error('⚠️  Warning: Could not auto-generate docs config:', error.message);
  console.log('   Continuing with existing config...\n');
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL and decode
    let requestedPath = req.url === '/' ? 'index.html' : decodeURIComponent(req.url);
    
    // Resolve the full path (this handles .. correctly)
    let filePath = path.resolve(DOCS_DIR, requestedPath.startsWith('/') ? requestedPath.slice(1) : requestedPath);
    
    // Normalize the path to prevent directory traversal attacks beyond dev-docs
    if (!filePath.startsWith(DOCS_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Forbidden</h1>', 'utf-8');
        return;
    }

    console.log(`  → Serving: ${filePath}`);

    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                console.log(`  ✗ Not found: ${filePath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1><p>' + filePath + '</p>', 'utf-8');
            } else {
                // Server error
                console.log(`  ✗ Error: ${error.message}`);
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            // Success
            console.log(`  ✓ Sent: ${content.length} bytes`);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('👨‍💻 Developer Documentation Server Running!');
    console.log('=========================================');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Dir: ${DOCS_DIR}`);
    console.log('📖 Serving: Application Developer Docs');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

