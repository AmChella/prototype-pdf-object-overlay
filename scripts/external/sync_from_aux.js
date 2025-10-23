#!/usr/bin/env node

/**
 * sync_from_aux.js - Synchronize coordinates from .aux file to NDJSON and marked-boxes.json
 *
 * This script reads the .aux file directly and generates/updates the NDJSON and marked-boxes.json
 * files to ensure perfect coordinate accuracy from the source of truth (the .aux file).
 *
 * Usage:
 *   node sync_from_aux.js <aux-file> [options]
 *
 * Options:
 *   --output-dir <dir>   Output directory for generated files (default: same as aux file)
 *   --job-name <name>    Base name for output files (default: derived from aux file)
 *   --force              Overwrite existing files without prompting
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse .aux file and extract position data
 */
function parseAuxFile(auxFilePath) {
    console.log(`Reading aux file: ${auxFilePath}`);
    const content = fs.readFileSync(auxFilePath, 'utf8');
    const lines = content.split(/\r?\n/);

    const positions = [];
    const seen = new Set();

    // Match lines like: \zref@newlabel{gm:sec-p-002:P-start}{\posx{3729359}\posy{30964035}\page{1}}
    const labelPattern = /\\zref@newlabel\{gm:([^:]+):([^}]+)\}\{\\posx\{(\d+)\}\\posy\{(\d+)\}\\page\{(\d+)\}\}/;

    for (const line of lines) {
        const match = line.match(labelPattern);
        if (match) {
            const [, id, role, xsp, ysp, page] = match;

            // Create a unique key to detect duplicates
            const key = `${id}:${role}:${page}`;

            // Keep the last occurrence (most recent/accurate)
            if (seen.has(key)) {
                // Remove previous occurrence
                const index = positions.findIndex(p =>
                    p.id === id && p.role === role && p.page === parseInt(page, 10)
                );
                if (index !== -1) {
                    positions.splice(index, 1);
                }
            }

            seen.add(key);
            positions.push({
                id,
                role,
                xsp,
                ysp,
                page: parseInt(page, 10)
            });
        }
    }

    console.log(`Found ${positions.length} position records in aux file (duplicates removed)`);
    return positions;
}

/**
 * Get page dimensions from aux file or use defaults
 */
function getPageDimensions(auxFilePath) {
    // Default A4 dimensions with 1in margins
    const defaults = {
        width: '597.50787pt',
        height: '845.04684pt'
    };

    try {
        const content = fs.readFileSync(auxFilePath, 'utf8');

        // Try to extract from other sources if available
        // For now, return defaults - could be enhanced to read from PDF or log file
        return defaults;
    } catch (err) {
        console.warn('Could not extract page dimensions, using defaults');
        return defaults;
    }
}

/**
 * Get column settings from existing NDJSON if available
 */
function getColumnSettings(ndjsonPath) {
    const defaults = {
        cwsp: 15456563,  // column width in sp
        twsp: 31699558,  // text width in sp
        colsep: 786432,  // column separation in sp
        twocolumn: 1     // two-column flag
    };

    if (!fs.existsSync(ndjsonPath)) {
        return defaults;
    }

    try {
        const content = fs.readFileSync(ndjsonPath, 'utf8');
        const lines = content.split(/\r?\n/).filter(l => l.trim());

        if (lines.length > 0) {
            const firstRecord = JSON.parse(lines[0]);
            return {
                cwsp: firstRecord.cwsp || defaults.cwsp,
                twsp: firstRecord.twsp || defaults.twsp,
                colsep: firstRecord.colsep || defaults.colsep,
                twocolumn: firstRecord.twocolumn || defaults.twocolumn
            };
        }
    } catch (err) {
        console.warn('Could not read column settings from existing NDJSON, using defaults');
    }

    return defaults;
}

/**
 * Convert positions from aux to NDJSON format
 */
function generateNdjson(positions, pageDimensions, columnSettings, outputPath) {
    console.log(`Generating NDJSON: ${outputPath}`);

    const lines = positions.map(pos => {
        // Determine column based on x position (simplified heuristic)
        const xPt = parseInt(pos.xsp, 10) / 65536.0;
        const col = xPt > 300 ? 1 : 0; // Rough estimate: x > 300pt means right column

        return JSON.stringify({
            id: pos.id,
            role: pos.role,
            xsp: pos.xsp,
            ysp: pos.ysp,
            pw: pageDimensions.width,
            ph: pageDimensions.height,
            page: pos.page,
            page_source: "zref",
            cwsp: columnSettings.cwsp,
            twsp: columnSettings.twsp,
            col: col,
            colsep: columnSettings.colsep,
            twocolumn: columnSettings.twocolumn
        });
    });

    fs.writeFileSync(outputPath, lines.join('\n') + '\n');
    console.log(`Written ${lines.length} records to NDJSON`);
}

/**
 * Convert scaled points to points (1 pt = 65536 sp)
 */
function spToPt(spValue) {
    return parseFloat(spValue) / 65536.0;
}

/**
 * Convert points to millimeters (1 pt = 0.352778 mm)
 */
function ptToMm(ptValue) {
    return ptValue * 0.352778;
}

/**
 * Convert points to pixels (default 72 DPI, 1 pt = 1 px at 72 DPI)
 */
function ptToPx(ptValue, dpi = 72) {
    return ptValue * (dpi / 72.0);
}

/**
 * Group positions by ID and page
 */
function groupPositions(positions) {
    const grouped = {};

    for (const pos of positions) {
        const key = `${pos.id}-page${pos.page}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(pos);
    }

    return grouped;
}

/**
 * Calculate bounding box from start/end positions
 */
function calculateBoundingBox(positions, pageDimensions) {
    // Find start and end records
    let startRecord = null;
    let endRecord = null;

    for (const pos of positions) {
        if (pos.role && pos.role.endsWith('-start')) {
            startRecord = pos;
        } else if (pos.role && pos.role.endsWith('-end')) {
            endRecord = pos;
        }
    }

    if (!startRecord || !endRecord) {
        if (positions.length > 0) {
            const id = positions[0].id;
            const page = positions[0].page;
            console.warn(`Warning: Incomplete pair for ${id} on page ${page} (missing ${!startRecord ? 'start' : 'end'})`);
        }
        return null;
    }

    if (positions.length > 2) {
        console.warn(`Warning: Multiple records for ${startRecord.id} on page ${startRecord.page}, using first start/end pair`);
    }

    // Convert coordinates from sp to pt
    const x1Pt = spToPt(startRecord.xsp);
    const y1Pt = spToPt(startRecord.ysp);
    const x2Pt = spToPt(endRecord.xsp);
    const y2Pt = spToPt(endRecord.ysp);

    // Get page height for coordinate system conversion
    const pageHeightPt = parseFloat(pageDimensions.height.replace('pt', ''));

    // Convert Y coordinates from TeX (top-left origin) to PDF (bottom-left origin)
    const y1PtPdf = pageHeightPt - y1Pt;
    const y2PtPdf = pageHeightPt - y2Pt;

    // Calculate bounding box (min/max coordinates)
    const xPt = Math.min(x1Pt, x2Pt);
    const yPt = Math.min(y1PtPdf, y2PtPdf);
    let wPt = Math.abs(x2Pt - x1Pt);
    const hPt = Math.abs(y2PtPdf - y1PtPdf);

    // If width is 0, use column width from the record
    if (wPt === 0) {
        // Default to single column width
        wPt = spToPt(15456563); // column width
    }

    // Convert to other units
    const xMm = ptToMm(xPt);
    const yMm = ptToMm(yPt);
    const wMm = ptToMm(wPt);
    const hMm = ptToMm(hPt);

    const xPx = ptToPx(xPt);
    const yPx = ptToPx(yPt);
    const wPx = ptToPx(wPt);
    const hPx = ptToPx(hPt);

    return {
        id: startRecord.id,
        page: startRecord.page,
        x_pt: Math.round(xPt * 100) / 100,
        y_pt: Math.round(yPt * 100) / 100,
        w_pt: Math.round(wPt * 100) / 100,
        h_pt: Math.round(hPt * 100) / 100,
        x_mm: Math.round(xMm * 100) / 100,
        y_mm: Math.round(yMm * 100) / 100,
        w_mm: Math.round(wMm * 100) / 100,
        h_mm: Math.round(hMm * 100) / 100,
        x_px: Math.round(xPx * 100) / 100,
        y_px: Math.round(yPx * 100) / 100,
        w_px: Math.round(wPx * 100) / 100,
        h_px: Math.round(hPx * 100) / 100
    };
}

/**
 * Generate marked-boxes.json from positions
 */
function generateMarkedBoxes(positions, pageDimensions, outputPath) {
    console.log(`Generating marked-boxes.json: ${outputPath}`);

    const grouped = groupPositions(positions);
    const markedBoxes = [];

    for (const [key, group] of Object.entries(grouped)) {
        const bbox = calculateBoundingBox(group, pageDimensions);
        if (bbox) {
            markedBoxes.push(bbox);
        } else {
            console.warn(`Skipping ${key} due to calculation error`);
        }
    }

    // Sort by page and then by ID for consistent output
    markedBoxes.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.id.localeCompare(b.id);
    });

    fs.writeFileSync(outputPath, JSON.stringify(markedBoxes, null, 2));
    console.log(`Written ${markedBoxes.length} marked boxes`);
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Sync coordinates from .aux file to NDJSON and marked-boxes.json

Usage:
  node sync_from_aux.js <aux-file> [options]

Options:
  --output-dir <dir>   Output directory for generated files (default: same as aux file)
  --job-name <name>    Base name for output files (default: derived from aux file)
  --force              Overwrite existing files without prompting

Examples:
  node sync_from_aux.js TeX/ENDEND10921-generated.aux
  node sync_from_aux.js TeX/ENDEND10921-generated.aux --output-dir ui
  node sync_from_aux.js TeX/ENDEND10921-generated.aux --job-name document --force
        `);
        process.exit(args.length === 0 ? 1 : 0);
    }

    const auxFile = args[0];
    let outputDir = path.dirname(auxFile);
    let jobName = path.basename(auxFile, '.aux');
    let force = false;

    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--output-dir' && i + 1 < args.length) {
            outputDir = args[++i];
        } else if (args[i] === '--job-name' && i + 1 < args.length) {
            jobName = args[++i];
        } else if (args[i] === '--force') {
            force = true;
        }
    }

    // Validate input
    if (!fs.existsSync(auxFile)) {
        console.error(`Error: Aux file not found: ${auxFile}`);
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        console.error(`Error: Output directory not found: ${outputDir}`);
        process.exit(1);
    }

    // Parse aux file
    const positions = parseAuxFile(auxFile);

    if (positions.length === 0) {
        console.error('Error: No position data found in aux file');
        console.error('Make sure the LaTeX document uses the geom-marks.tex package');
        process.exit(1);
    }

    // Get page dimensions
    const pageDimensions = getPageDimensions(auxFile);
    console.log(`Using page dimensions: ${pageDimensions.width} × ${pageDimensions.height}`);

    // Define output paths
    const ndjsonPath = path.join(outputDir, `${jobName}-texpos.ndjson`);
    const markedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes.json`);

    // Get column settings from existing NDJSON if available
    const columnSettings = getColumnSettings(ndjsonPath);

    // Generate files
    console.log('\n=== Syncing from aux file ===');
    generateNdjson(positions, pageDimensions, columnSettings, ndjsonPath);
    generateMarkedBoxes(positions, pageDimensions, markedBoxesPath);

    console.log('\n✅ Successfully synchronized coordinates from aux file');
    console.log(`   NDJSON: ${ndjsonPath}`);
    console.log(`   Marked boxes: ${markedBoxesPath}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseAuxFile,
    generateNdjson,
    generateMarkedBoxes
};

