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
 * Group positions by ID only (for multi-page/column detection)
 */
function groupPositionsByIdOnly(positions) {
    const grouped = {};

    for (const pos of positions) {
        if (!grouped[pos.id]) {
            grouped[pos.id] = [];
        }
        grouped[pos.id].push(pos);
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
 * Detect if element spans columns or pages
 * Returns: { spansColumns: boolean, spansPages: boolean, pages: [], columns: {} }
 */
function detectSpanning(positions, columnSettings) {
    // Check for multi-page spanning
    const pages = [...new Set(positions.map(r => r.page))].sort((a, b) => a - b);
    const spansPages = pages.length > 1;
    
    // Detect column for each position based on x coordinate
    const positionsWithCol = positions.map(pos => {
        const xPt = spToPt(pos.xsp);
        // Simplified heuristic: x > 300pt typically means right column
        // Can be improved with actual column width calculation
        const col = xPt > 300 ? 1 : 0;
        return { ...pos, col };
    });
    
    // Group by page to check column spanning within each page
    const byPage = {};
    for (const pos of positionsWithCol) {
        if (!byPage[pos.page]) {
            byPage[pos.page] = [];
        }
        byPage[pos.page].push(pos);
    }
    
    // Check if any page has positions in both columns
    let spansColumns = false;
    const columnsByPage = {};
    for (const [page, pagePositions] of Object.entries(byPage)) {
        const cols = [...new Set(pagePositions.map(p => p.col))];
        columnsByPage[page] = cols;
        if (cols.length > 1) {
            spansColumns = true;
        }
    }
    
    return {
        spansColumns,
        spansPages,
        pages,
        columnsByPage,
        positionsWithCol
    };
}

/**
 * Split positions into segments based on page AND column boundaries
 * Uses the 'col' field from NDJSON to properly split across columns
 */
function splitIntoSegments(positions, pageDimensions, columnSettings) {
    // Group positions by (page, column) to identify all segments
    const segmentMap = new Map();
    
    for (const pos of positions) {
        const key = `p${pos.page}c${pos.col}`;
        if (!segmentMap.has(key)) {
            segmentMap.set(key, {
                page: pos.page,
                column: pos.col,
                positions: []
            });
        }
        segmentMap.get(key).positions.push(pos);
    }
    
    // If only one segment, no splitting needed
    if (segmentMap.size === 1) {
        const segment = Array.from(segmentMap.values())[0];
        return [{
            positions: segment.positions,
            page: segment.page,
            column: segment.column,
            segmentIndex: 0,
            totalSegments: 1
        }];
    }
    
    // Sort segments by page and column
    const sortedSegments = Array.from(segmentMap.entries())
        .sort(([keyA], [keyB]) => {
            const matchA = keyA.match(/p(\d+)c(\d+)/);
            const matchB = keyB.match(/p(\d+)c(\d+)/);
            if (!matchA || !matchB) return 0;
            const pageA = parseInt(matchA[1]);
            const pageB = parseInt(matchB[1]);
            if (pageA !== pageB) {
                return pageA - pageB;
            }
            return parseInt(matchA[2]) - parseInt(matchB[2]);
        })
        .map(([_, segment]) => segment);
    
    const totalSegments = sortedSegments.length;
    const pageHeightPt = parseFloat(pageDimensions.height.replace('pt', ''));
    
    // Define text body area (excluding header and footer)
    // Based on analysis: header ~71pt from top, footer ~69pt from bottom
    const headerMarginPt = 71;
    const footerMarginPt = 69;
    const textBodyTopPt = pageHeightPt - headerMarginPt; // ~774pt
    const textBodyBottomPt = footerMarginPt; // ~69pt
    
    // Convert to scaled points
    const textBodyTopSp = Math.round(textBodyTopPt * 65536);
    const textBodyBottomSp = Math.round(textBodyBottomPt * 65536);
    
    // Create proper start/end pairs for each segment
    const segments = [];
    
    for (let i = 0; i < sortedSegments.length; i++) {
        const segment = sortedSegments[i];
        let startPos = segment.positions.find(p => p.role && p.role.endsWith('-start'));
        let endPos = segment.positions.find(p => p.role && p.role.endsWith('-end'));
        
        // If we have both real markers, use them
        if (startPos && endPos) {
            segments.push({
                positions: [startPos, endPos],
                page: segment.page,
                column: segment.column,
                segmentIndex: i,
                totalSegments: totalSegments
            });
            continue;
        }
        
        // Need to create synthetic markers
        const refPos = startPos || endPos || segment.positions[0];
        
        if (!startPos) {
            // Create synthetic start at top of text body (not page top)
            startPos = {
                ...refPos,
                page: segment.page,
                col: segment.column,
                role: refPos.role ? refPos.role.replace('-end', '-start') : 'P-start',
                ysp: String(textBodyTopSp), // Top of text body (excluding header)
                synthetic: true
            };
        }
        
        if (!endPos) {
            // Create synthetic end at bottom of text body (not page bottom)
            endPos = {
                ...refPos,
                page: segment.page,
                col: segment.column,
                role: refPos.role ? refPos.role.replace('-start', '-end') : 'P-end',
                ysp: String(textBodyBottomSp), // Bottom of text body (excluding footer)
                synthetic: true
            };
        }
        
        segments.push({
            positions: [startPos, endPos],
            page: segment.page,
            column: segment.column,
            segmentIndex: i,
            totalSegments: totalSegments
        });
    }
    
    return segments;
}

/**
 * Calculate bounding box for a segment
 */
function calculateBoundingBoxForSegment(segment, pageDimensions, baseId) {
    const bbox = calculateBoundingBox(segment.positions, pageDimensions);
    
    if (!bbox) return null;
    
    // If this is part of a multi-segment element, modify the ID
    if (segment.totalSegments > 1) {
        const segmentSuffix = `_seg${segment.segmentIndex + 1}of${segment.totalSegments}`;
        return {
            ...bbox,
            id: `${baseId}${segmentSuffix}`,
            originalId: baseId,
            segmentIndex: segment.segmentIndex,
            totalSegments: segment.totalSegments,
            segmentColumn: segment.column
        };
    }
    
    return bbox;
}

/**
 * Read positions from NDJSON file (which has column info)
 */
function readPositionsFromNdjson(ndjsonPath) {
    if (!fs.existsSync(ndjsonPath)) {
        return null;
    }
    
    const content = fs.readFileSync(ndjsonPath, 'utf8');
    const lines = content.trim().split(/\r?\n/);
    const positions = [];
    
    for (const line of lines) {
        try {
            const record = JSON.parse(line);
            positions.push(record);
        } catch (err) {
            console.warn('Failed to parse NDJSON line:', line);
        }
    }
    
    return positions;
}

/**
 * Extract figure bounding boxes from positions
 * Handles figures that span multiple pages/columns by creating separate bounds for each segment
 */
function extractFigureBounds(positions) {
    const figures = {};
    
    for (const pos of positions) {
        // Check if this is a figure marker
        if (!pos.role || !pos.role.startsWith('FIG')) continue;
        
        const figId = pos.id;
        if (!figures[figId]) {
            figures[figId] = { id: figId, positions: [] };
        }
        figures[figId].positions.push(pos);
    }
    
    // Calculate bounding boxes for figures
    const figureBounds = [];
    
    for (const [figId, figData] of Object.entries(figures)) {
        // Check if figure appears on multiple pages or columns by examining ALL positions
        const uniqueLocations = new Set();
        for (const pos of figData.positions) {
            uniqueLocations.add(`p${pos.page}c${pos.col}`);
        }
        const spansMultiple = uniqueLocations.size > 1;
        
        if (spansMultiple) {
                // For multi-page/column figures, create bounds for each segment
                // Group positions by (page, column)
                const segmentMap = new Map();
                for (const pos of figData.positions) {
                    const key = `p${pos.page}c${pos.col}`;
                    if (!segmentMap.has(key)) {
                        segmentMap.set(key, { page: pos.page, col: pos.col, positions: [] });
                    }
                    segmentMap.get(key).positions.push(pos);
                }
                
                // Define text body boundaries (excluding header/footer)
                const pageHeightSp = 845.04684 * 65536; // Default page height
                const headerMarginSp = 71 * 65536;
                const footerMarginSp = 69 * 65536;
                const textBodyTopSp = pageHeightSp - headerMarginSp;
                const textBodyBottomSp = footerMarginSp;
                
                // Create figure bound for each segment
                for (const [key, segment] of segmentMap.entries()) {
                    const segStart = segment.positions.find(p => p.role && p.role.endsWith('-start'));
                    const segEnd = segment.positions.find(p => p.role && p.role.endsWith('-end'));
                    
                    let yTopSp, yBottomSp;
                    
                    if (segStart && segEnd) {
                        // Both markers present - use actual coordinates
                        const segY1Sp = parseInt(segStart.ysp);
                        const segY2Sp = parseInt(segEnd.ysp);
                        yTopSp = Math.max(segY1Sp, segY2Sp);
                        yBottomSp = Math.min(segY1Sp, segY2Sp);
                    } else if (segStart) {
                        // Only start marker - figure continues to bottom of text body
                        yTopSp = parseInt(segStart.ysp);
                        yBottomSp = textBodyBottomSp;
                    } else if (segEnd) {
                        // Only end marker - figure starts from top of text body
                        yTopSp = textBodyTopSp;
                        yBottomSp = parseInt(segEnd.ysp);
                    } else {
                        // No markers in this segment - skip
                        continue;
                    }
                    
                    figureBounds.push({
                        id: figId,
                        page: segment.page,
                        col: segment.col,
                        yTopSp: yTopSp,
                        yBottomSp: yBottomSp,
                        yTopPt: yTopSp / 65536,
                        yBottomPt: yBottomSp / 65536
                    });
                }
        } else {
            // Single page/column figure - use original logic
            const startPos = figData.positions.find(p => p.role && p.role.endsWith('-start'));
            const endPos = figData.positions.find(p => p.role && p.role.endsWith('-end'));
            
            if (startPos && endPos) {
                const y1Sp = parseInt(startPos.ysp);
                const y2Sp = parseInt(endPos.ysp);
                
                figureBounds.push({
                    id: figId,
                    page: startPos.page,
                    col: startPos.col,
                    yTopSp: Math.max(y1Sp, y2Sp), // Top (larger Y in TeX coords)
                    yBottomSp: Math.min(y1Sp, y2Sp), // Bottom (smaller Y)
                    yTopPt: Math.max(y1Sp, y2Sp) / 65536,
                    yBottomPt: Math.min(y1Sp, y2Sp) / 65536
                });
            }
        }
    }
    
    return figureBounds;
}

/**
 * Check if a segment overlaps with any figure
 * Returns the overlapping figure or null
 */
function findOverlappingFigure(segment, figureBounds) {
    // Get segment Y range
    const startPos = segment.positions.find(p => p.role && p.role.endsWith('-start'));
    const endPos = segment.positions.find(p => p.role && p.role.endsWith('-end'));
    
    if (!startPos || !endPos) return null;
    
    const segYTopSp = Math.max(parseInt(startPos.ysp), parseInt(endPos.ysp));
    const segYBottomSp = Math.min(parseInt(startPos.ysp), parseInt(endPos.ysp));
    
    // Find figures in the same (page, column)
    for (const fig of figureBounds) {
        if (fig.page !== segment.page || fig.col !== segment.column) continue;
        
        // Check Y overlap
        // Overlap if: segment bottom < figure top AND segment top > figure bottom
        if (segYBottomSp < fig.yTopSp && segYTopSp > fig.yBottomSp) {
            return fig;
        }
    }
    
    return null;
}

/**
 * Split a segment to avoid figure overlap
 * Returns array of sub-segments with padding around figure
 */
function splitSegmentAroundFigure(segment, figure, pageDimensions, columnSettings) {
    const startPos = segment.positions.find(p => p.role && p.role.endsWith('-start'));
    const endPos = segment.positions.find(p => p.role && p.role.endsWith('-end'));
    
    if (!startPos || !endPos) return [segment];
    
    const segYTopSp = Math.max(parseInt(startPos.ysp), parseInt(endPos.ysp));
    const segYBottomSp = Math.min(parseInt(startPos.ysp), parseInt(endPos.ysp));
    
    // Add padding around figure (in points, converted to scaled points)
    // Typical line height is ~12-14pt, using 6pt padding (~half line) for visual separation
    const figurePaddingPt = 6; // Points of space around figure
    const figurePaddingSp = Math.round(figurePaddingPt * 65536);
    
    // Apply padding to figure bounds
    const figureTopWithPadding = figure.yTopSp + figurePaddingSp;
    const figureBottomWithPadding = figure.yBottomSp - figurePaddingSp;
    
    const subSegments = [];
    
    // Debug logging
    const debug = false;
    if (debug) {
        console.log(`      Splitting ${segment.positions[0]?.id || 'unknown'}:`);
        console.log(`        Segment Y: ${segYBottomSp} to ${segYTopSp}`);
        console.log(`        Figure Y (original): ${figure.yBottomSp} to ${figure.yTopSp}`);
        console.log(`        Figure Y (padded): ${figureBottomWithPadding} to ${figureTopWithPadding}`);
        console.log(`        Check before: ${segYTopSp} > ${figureTopWithPadding} = ${segYTopSp > figureTopWithPadding}`);
        console.log(`        Check after: ${segYBottomSp} < ${figureBottomWithPadding} = ${segYBottomSp < figureBottomWithPadding}`);
    }
    
    // Part before figure (if segment starts before figure)
    // End the segment BEFORE the figure (with padding)
    if (segYTopSp > figureTopWithPadding) {
        const beforeEnd = {
            ...startPos,
            role: startPos.role.replace('-start', '-end'),
            ysp: String(figureTopWithPadding),
            synthetic: true
        };
        
        subSegments.push({
            positions: [startPos, beforeEnd],
            page: segment.page,
            column: segment.column,
            segmentIndex: segment.segmentIndex,
            totalSegments: segment.totalSegments,
            subSegmentType: 'before-figure'
        });
    }
    
    // Skip figure area + padding (no segment created for this)
    
    // Part after figure (if segment continues after figure)
    // Start the segment AFTER the figure (with padding)
    if (segYBottomSp < figureBottomWithPadding) {
        const afterStart = {
            ...endPos,
            role: endPos.role.replace('-end', '-start'),
            ysp: String(figureBottomWithPadding),
            synthetic: true
        };
        
        subSegments.push({
            positions: [afterStart, endPos],
            page: segment.page,
            column: segment.column,
            segmentIndex: segment.segmentIndex,
            totalSegments: segment.totalSegments,
            subSegmentType: 'after-figure'
        });
    }
    
    return subSegments.length > 0 ? subSegments : [segment];
}

/**
 * Generate marked-boxes.json from positions with multi-column/page splitting and figure avoidance
 */
function generateMarkedBoxes(positions, pageDimensions, outputPath, columnSettings) {
    console.log(`\n🔄 Generating marked-boxes.json with multi-column/page support and figure avoidance: ${outputPath}`);

    // Try to read NDJSON file for better column information
    const ndjsonPath = outputPath.replace('-marked-boxes.json', '-texpos.ndjson');
    const ndjsonPositions = readPositionsFromNdjson(ndjsonPath);
    
    // Use NDJSON positions if available (they have col field)
    const positionsToUse = ndjsonPositions || positions;
    
    // Extract figure bounds for overlap detection
    const figureBounds = extractFigureBounds(positionsToUse);
    console.log(`   📐 Found ${figureBounds.length} figure bounds for overlap detection`);
    
    const groupedById = groupPositionsByIdOnly(positionsToUse);
    const markedBoxes = [];
    let splitElementCount = 0;
    let singleElementCount = 0;
    let figureAvoidanceCount = 0;

    for (const [id, elementPositions] of Object.entries(groupedById)) {
        // Skip if this is a figure itself
        const isFigure = elementPositions.some(p => p.role && p.role.startsWith('FIG'));
        
        // Split into segments if element spans columns or pages
        const segments = splitIntoSegments(elementPositions, pageDimensions, columnSettings);
        
        if (segments.length > 1) {
            splitElementCount++;
            console.log(`   ✂️  Split "${id}" into ${segments.length} segments (pages: ${segments.map(s => s.page).join(',')}, cols: ${segments.map(s => s.column).join(',')})`);
        } else {
            singleElementCount++;
        }
        
        // Process each segment and check for figure overlaps (only for paragraphs, not figures)
        let finalSegments = [];
        if (!isFigure) {
            for (const segment of segments) {
                // Check if this segment overlaps with any figure
                const overlappingFigure = findOverlappingFigure(segment, figureBounds);
                
                if (overlappingFigure) {
                    // Split segment to avoid figure
                    const subSegments = splitSegmentAroundFigure(segment, overlappingFigure, pageDimensions, columnSettings);
                    // Count as figure avoidance if any sub-segments have subSegmentType (indicates splitting occurred)
                    if (subSegments.some(s => s.subSegmentType)) {
                        figureAvoidanceCount++;
                        console.log(`   🖼️  Avoided figure "${overlappingFigure.id}" in "${id}" (page ${segment.page}, col ${segment.column})`);
                    }
                    finalSegments.push(...subSegments);
                } else {
                    finalSegments.push(segment);
                }
            }
        } else {
            finalSegments = segments;
        }
        
        // Calculate bounding box for each final segment
        let segIdx = 0;
        for (const segment of finalSegments) {
            const bbox = calculateBoundingBoxForSegment(segment, pageDimensions, id);
            if (bbox) {
                // Add sub-segment indicator if needed
                if (segment.subSegmentType) {
                    bbox.id = bbox.id.replace(/_seg(\d+)of(\d+)/, `_seg$1of$2_${segment.subSegmentType}`);
                    bbox.subSegmentType = segment.subSegmentType;
                }
                markedBoxes.push(bbox);
                segIdx++;
            } else {
                console.warn(`   ⚠️  Skipping segment for ${id} (page ${segment.page}, col ${segment.column}) due to calculation error`);
            }
        }
    }

    // Sort by page and then by ID for consistent output
    markedBoxes.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return (a.originalId || a.id).localeCompare(b.originalId || b.id);
    });

    fs.writeFileSync(outputPath, JSON.stringify(markedBoxes, null, 2));
    console.log(`\n✅ Generated ${markedBoxes.length} marked boxes from ${Object.keys(groupedById).length} elements`);
    console.log(`   📊 Split: ${splitElementCount} | Single: ${singleElementCount} | Figure avoidance: ${figureAvoidanceCount}`);
    console.log(`   📄 Written to: ${outputPath}`);
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
    console.log('\n=== Syncing from aux file with multi-column/page support ===');
    generateNdjson(positions, pageDimensions, columnSettings, ndjsonPath);
    generateMarkedBoxes(positions, pageDimensions, markedBoxesPath, columnSettings);

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

