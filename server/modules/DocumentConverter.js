const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const { transform } = require('../../src/engine.js');

class DocumentConverter {
    constructor(configManager) {
        this.configManager = configManager;

        // Paths to existing conversion system
        this.templatePath = path.join(__dirname, '../../template/document.tex.xml');
        this.texToPdfScript = path.join(__dirname, '../../src/tex-to-pdf.js');
        this.cliScript = path.join(__dirname, '../../src/cli.js');
    }

    async xmlToTex() {
        try {
            console.log('🔄 Starting XML to TeX conversion using existing engine...');

            const xmlPath = this.configManager.getFilePath('xmlInput');
            const texPath = this.configManager.getFilePath('texOutput');

            if (!await fs.pathExists(xmlPath)) {
                throw new Error(`XML file not found: ${xmlPath}`);
            }

            // Read XML content
            const xmlContent = await fs.readFile(xmlPath, 'utf8');

            // Use the existing transformation engine
            const templateString = await fs.readFile(this.templatePath, 'utf-8');

            console.log('📋 Using template:', this.templatePath);
            console.log('📋 Template loaded, length:', templateString.length);

            const { output, report, performance } = await transform(xmlContent, templateString);

            // Ensure output directory exists
            await fs.ensureDir(path.dirname(texPath));

            // Write TeX file
            await fs.writeFile(texPath, output, 'utf8');

            console.log(`✅ TeX file generated: ${texPath}`);

            // Log transformation report
            if (report.unprocessedNodes && report.unprocessedNodes.length > 0) {
                console.warn(`⚠️  Found ${report.unprocessedNodes.length} unprocessed nodes`);
                report.unprocessedNodes.slice(0, 5).forEach(node => {
                    console.warn(`   - <${node.tagName}> at ${node.path}`);
                });
            }

            console.log(`📊 Processed ${report.processedNodes}/${report.totalNodes} nodes`);
            console.log(`⚡ Transformation took ${performance.cpuUsage.user.toFixed(2)}ms`);

            return {
                success: true,
                texPath,
                message: 'XML to TeX conversion completed successfully'
            };
        } catch (error) {
            console.error('❌ XML to TeX conversion failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }



    async texToPdfWithJson() {
        try {
            console.log('📄 Starting TeX to PDF conversion using existing system...');

            const texPath = this.configManager.getFilePath('texOutput');
            const pdfPath = this.configManager.getFilePath('pdfOutput');
            const outputDir = path.dirname(pdfPath);

            if (!await fs.pathExists(texPath)) {
                throw new Error(`TeX file not found: ${texPath}`);
            }

            // Ensure output directory exists
            await fs.ensureDir(outputDir);

            // Use the existing tex-to-pdf.js script which handles:
            // - LuaTeX compilation with coordinate tracking
            // - JSON geometry generation
            // - Error handling and cleanup
            await this.runTexToPdf(texPath, outputDir);

            const texFileName = path.basename(texPath, '.tex');
            const finalPdfPath = path.join(outputDir, `${texFileName}.pdf`);
            const jsonPath = path.join(outputDir, `${texFileName}-geometry.json`);
            const ndjsonPath = path.join(outputDir, `${texFileName}-texpos.ndjson`);

            // Rename PDF to expected location if needed
            if (finalPdfPath !== pdfPath && await fs.pathExists(finalPdfPath)) {
                await fs.move(finalPdfPath, pdfPath);
            }

            // Check for marked-boxes JSON first (preferred format)
            const markedBoxesPath = path.join(outputDir, `${texFileName}-marked-boxes.json`);
            if (await fs.pathExists(markedBoxesPath)) {
                // Use marked-boxes file if available
                if (markedBoxesPath !== jsonPath) {
                    await fs.copy(markedBoxesPath, jsonPath);
                }
                console.log(`✅ Using marked-boxes JSON: ${jsonPath}`);
            } else if (!await fs.pathExists(jsonPath) && await fs.pathExists(ndjsonPath)) {
                // Fallback: Convert NDJSON to standard JSON format if needed
                console.log('🔄 Converting NDJSON to standard JSON format...');
                await this.convertNdjsonToJson(ndjsonPath, jsonPath);
            }

            console.log(`✅ PDF generated: ${pdfPath}`);
            console.log(`✅ JSON generated: ${jsonPath}`);

            return {
                success: true,
                pdfPath,
                jsonPath,
                message: 'TeX to PDF conversion completed successfully'
            };
        } catch (error) {
            console.error('❌ TeX to PDF conversion failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async runTexToPdf(texPath, outputDir) {
        return new Promise((resolve, reject) => {
            const args = [
                this.texToPdfScript,
                texPath,
                outputDir,
                '--geometry-json', path.join(outputDir, `${path.basename(texPath, '.tex')}-geometry.json`),
                '--marked-boxes', // Generate marked-boxes JSON from NDJSON
                '--keep-aux' // Keep auxiliary files for debugging
            ];

            console.log('� Running tex-to-pdf with args:', args.join(' '));

            const process = spawn('node', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.dirname(texPath) // Run from the TeX file's directory
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                // Forward output to console for real-time feedback
                console.log('📄', output.trim());
            });

            process.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error('🔴', output.trim());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ tex-to-pdf completed successfully');
                    resolve(stdout);
                } else {
                    console.error(`❌ tex-to-pdf failed with exit code ${code}`);
                    reject(new Error(`tex-to-pdf failed with code ${code}\nStderr: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                console.error('❌ Failed to start tex-to-pdf process:', error);
                reject(new Error(`Failed to start tex-to-pdf: ${error.message}`));
            });
        });
    }

    // Helper method to validate that required tools are available
    async validateEnvironment() {
        const checks = [
            { command: 'node', args: ['--version'], name: 'Node.js' },
            { command: 'lualatex', args: ['--version'], name: 'LuaLaTeX' },
        ];

        for (const check of checks) {
            try {
                await this.runCommand(check.command, check.args);
                console.log(`✅ ${check.name} is available`);
            } catch (error) {
                console.error(`❌ ${check.name} is not available:`, error.message);
                throw new Error(`Missing required tool: ${check.name}`);
            }
        }

        // Check if template file exists
        if (!await fs.pathExists(this.templatePath)) {
            throw new Error(`Template file not found: ${this.templatePath}`);
        }

        // Check if tex-to-pdf script exists
        if (!await fs.pathExists(this.texToPdfScript)) {
            throw new Error(`tex-to-pdf script not found: ${this.texToPdfScript}`);
        }

        console.log('✅ Environment validation passed');
    }

    async runCommand(command, args) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, { stdio: 'pipe' });

            let stdout = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    async convertNdjsonToJson(ndjsonPath, outputJsonPath) {
        try {
            console.log(`🔄 Converting NDJSON file: ${ndjsonPath}`);

            // Read the NDJSON file
            const ndjsonContent = await fs.readFile(ndjsonPath, 'utf8');
            const lines = ndjsonContent.split('\n').filter(line => line.trim());

            // Parse each line as JSON
            const records = lines.map(line => JSON.parse(line));

            // Group records by ID
            const grouped = {};
            records.forEach(record => {
                if (!grouped[record.id]) {
                    grouped[record.id] = [];
                }
                grouped[record.id].push(record);
            });

            // Convert to standard coordinate format
            const coordinates = [];
            
            for (const [id, recordList] of Object.entries(grouped)) {
                const startRecord = recordList.find(r => r.role.endsWith('-start'));
                const endRecord = recordList.find(r => r.role.endsWith('-end'));

                if (startRecord && endRecord) {
                    // Convert scaled points to points (1 pt = 65536 sp)
                    const x_pt = startRecord.x / 65536;
                    const y_pt = startRecord.y / 65536;
                    const w_pt = (endRecord.x - startRecord.x) / 65536;
                    const h_pt = Math.abs((endRecord.y - startRecord.y) / 65536);

                    // Convert to other units
                    const x_mm = x_pt * 0.352778;
                    const y_mm = y_pt * 0.352778;
                    const w_mm = w_pt * 0.352778;
                    const h_mm = h_pt * 0.352778;

                    const x_px = x_pt * 1.333333;
                    const y_px = y_pt * 1.333333;
                    const w_px = w_pt * 1.333333;
                    const h_px = h_pt * 1.333333;

                    coordinates.push({
                        id,
                        page: startRecord.page,
                        x_pt: parseFloat(x_pt.toFixed(2)),
                        y_pt: parseFloat(y_pt.toFixed(2)),
                        w_pt: parseFloat(w_pt.toFixed(2)),
                        h_pt: parseFloat(h_pt.toFixed(2)),
                        x_mm: parseFloat(x_mm.toFixed(2)),
                        y_mm: parseFloat(y_mm.toFixed(2)),
                        w_mm: parseFloat(w_mm.toFixed(2)),
                        h_mm: parseFloat(h_mm.toFixed(2)),
                        x_px: parseFloat(x_px.toFixed(2)),
                        y_px: parseFloat(y_px.toFixed(2)),
                        w_px: parseFloat(w_px.toFixed(2)),
                        h_px: parseFloat(h_px.toFixed(2))
                    });
                }
            }

            // Sort by page and then by ID
            coordinates.sort((a, b) => {
                if (a.page !== b.page) return a.page - b.page;
                return a.id.localeCompare(b.id);
            });

            // Write the JSON file
            await fs.writeFile(outputJsonPath, JSON.stringify(coordinates, null, 2));
            console.log(`✅ Converted ${coordinates.length} coordinates to: ${outputJsonPath}`);

        } catch (error) {
            console.error('❌ Failed to convert NDJSON to JSON:', error);
            throw error;
        }
    }

    async copyToUI() {
        try {
            console.log('📁 Copying generated files to UI directory...');

            const settings = this.configManager.getFileSettings();
            const pdfPath = this.configManager.getFilePath('pdfOutput');
            const jsonPath = this.configManager.getFilePath('jsonOutput');

            // Copy PDF to UI directory
            const uiPdfPath = path.join(settings.uiOutputDir, path.basename(pdfPath));
            if (await fs.pathExists(pdfPath)) {
                await fs.copy(pdfPath, uiPdfPath);
                console.log(`✅ PDF copied to: ${uiPdfPath}`);
            }

            // Copy JSON to UI directory
            const uiJsonPath = path.join(settings.uiOutputDir, path.basename(jsonPath));
            if (await fs.pathExists(jsonPath)) {
                await fs.copy(jsonPath, uiJsonPath);
                console.log(`✅ JSON copied to: ${uiJsonPath}`);
            }

            return {
                success: true,
                uiPdfPath,
                uiJsonPath
            };
        } catch (error) {
            console.error('❌ Failed to copy files to UI directory:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getNodeAttributes(node) {
        const attributes = {};
        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes.item(i);
                attributes[attr.name] = attr.value;
            }
        }
        return attributes;
    }
}

module.exports = DocumentConverter;