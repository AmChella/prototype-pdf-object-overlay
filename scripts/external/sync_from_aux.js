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
function getPageDimensions(auxFilePath, ndjsonPath = null) {
    // Default A4 dimensions with 1in margins
    const defaults = {
        width: '597.50787pt',
        height: '845.04684pt'
    };

    // Try to read from NDJSON file first (most accurate)
    if (ndjsonPath && fs.existsSync(ndjsonPath)) {
        try {
            const content = fs.readFileSync(ndjsonPath, 'utf8');
            const lines = content.trim().split('\n');
            if (lines.length > 0) {
                const firstRecord = JSON.parse(lines[0]);
                if (firstRecord.pw && firstRecord.ph) {
                    return {
                        width: firstRecord.pw,
                        height: firstRecord.ph
                    };
                }
            }
    } catch (err) {
            console.warn('Could not read page dimensions from NDJSON, using defaults');
    }
    }

    // Fallback to defaults
    return defaults;
}

/**
 * Get column settings from existing NDJSON if available
 * 
 * Note: We only need cwsp, twsp, and colsep to calculate everything.
 * Multi-column layout is auto-detected: twsp > cwsp * 1.5
 */
function getColumnSettings(ndjsonPath) {
    const defaults = {
        cwsp: 15456563,  // column width in sp
        twsp: 31699558,  // text width in sp (for 2-col, this is ~2x cwsp + colsep)
        colsep: 786432   // column separation in sp
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
                colsep: firstRecord.colsep || defaults.colsep
            };
        }
    } catch (err) {
        console.warn('Could not read column settings from existing NDJSON, using defaults');
    }

    return defaults;
}

/**
 * Convert positions from aux to NDJSON format
 * 
 * Note: The 'col' field is calculated for reference/debugging only.
 * Bounding box calculations use pure coordinates (xsp, ysp) and do NOT
 * depend on the col field. This makes the system work with any layout:
 * 2-col, 3-col, asymmetric (30/70), etc.
 */
function generateNdjson(positions, pageDimensions, columnSettings, outputPath) {
    console.log(`Generating NDJSON: ${outputPath}`);

    const lines = positions.map(pos => {
        // Calculate which column this position is in (for reference only)
        const xPt = parseInt(pos.xsp, 10) / 65536.0;
        const cwPt = spToPt(columnSettings.cwsp);
        const twPt = spToPt(columnSettings.twsp);
        const colsepPt = spToPt(columnSettings.colsep);
        
        // Auto-detect multi-column layout: if textwidth > columnwidth * 1.5, it's multi-column
        // This is more robust than relying on a twocolumn flag
        const isMultiColumn = twPt > (cwPt * 1.5);
        
        // Calculate column index
        // For floats (table, figure): always col=0 (atomic units, not split by column)
        // For non-floats (paragraphs): calculate from X position
        let col = 0;
        // Use type field if available (from NDJSON), otherwise parse role (fallback for AUX)
        const isFloat = pos.type ? (pos.type === 'table' || pos.type === 'figure') : /TABLE|FIG/i.test(pos.role);
        
        if (!isFloat && isMultiColumn) {
            // Calculate column boundaries
            // Column 0: left edge to (columnWidth + columnSep/2)
            // Column 1+: beyond the boundary
            const columnBoundary = cwPt + (colsepPt / 2);
            col = xPt > columnBoundary ? 1 : 0;
        }
        
        // NOTE: This 'col' field is for reference/debugging only.
        // Bounding boxes are calculated using actual xsp/ysp coordinates.

        // Infer type from role as fallback (for AUX-derived positions)
        // LaTeX-generated NDJSON already has proper type field
        let type = pos.type; // Use type if already available
        if (!type) {
            // Fallback: infer from role
            if (/TABLE/i.test(pos.role)) {
                type = 'table';
            } else if (/FIG/i.test(pos.role)) {
                type = 'figure';
            } else if (/P-/i.test(pos.role)) {
                type = 'para';
            } else if (/SEC|TITLE/i.test(pos.role)) {
                type = 'section';
            } else {
                type = 'unknown';
            }
        }

        return JSON.stringify({
            id: pos.id,
            role: pos.role,
            type: type,
            xsp: pos.xsp,
            ysp: pos.ysp,
            pw: pageDimensions.width,
            ph: pageDimensions.height,
            page: pos.page,
            page_source: "zref",
            cwsp: columnSettings.cwsp,
            twsp: columnSettings.twsp,
            col: col,
            colsep: columnSettings.colsep
            // Note: twocolumn flag removed - detected from measurements
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
 * @param {Array} positions - Array of position records
 * @param {Object} pageDimensions - Page dimensions
 * @param {Object} segmentInfo - Optional segment information {totalSegments, segmentIndex}
 * @param {Map} pageColumnMode - Map of page -> boolean (true if two-column mode)
 */
function calculateBoundingBox(positions, pageDimensions, segmentInfo = null, pageColumnMode = null) {
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

    // Calculate bounding box using PURE COORDINATES (no column assumptions)
    // This approach works for any layout: 2-col, 3-col, asymmetric, etc.
    const xPt = Math.min(x1Pt, x2Pt);
    const yPt = Math.min(y1PtPdf, y2PtPdf);
    let wPt = Math.abs(x2Pt - x1Pt);
    const hPt = Math.abs(y2PtPdf - y1PtPdf);

    // Handle zero or very small width cases
    // This happens when start and end markers are at the same (or very close) X position
    // Common in: 1) longtables, 2) abstracts/single-column content in two-column documents
    if (wPt === 0 || wPt < 10) {
        const isTable = (startRecord.type === 'table');
        const isParagraph = (startRecord.type === 'para');
        const textWidthPt = spToPt(startRecord.twsp || 31699558);
        const columnWidthPt = spToPt(startRecord.cwsp || 15456563);
        const isMultiColumn = textWidthPt > columnWidthPt * 1.5;
        
        // Check if both markers are in the same column
        const sameColumn = (startRecord.col === endRecord.col);
        
        // Check if this is a single-element paragraph (not part of a split)
        const isMultiSegment = segmentInfo && segmentInfo.totalSegments > 1;
        
        if (isTable && isMultiColumn) {
            // Longtables in single-column mode: use textwidth
            console.warn(`Warning: Zero width for ${startRecord.id} (type=${startRecord.type}, longtable), using textwidth`);
            wPt = textWidthPt;
        } else if (isParagraph && isMultiColumn && Math.abs(x1Pt - x2Pt) < 1 && !isMultiSegment) {
            // Paragraphs with same X position in multi-column layout
            // Check if the page is truly in two-column mode
            const page = startRecord.page;
            const pageIsTwoColumn = pageColumnMode ? pageColumnMode.get(page) : true; // Default to two-column if unknown
            
            if (!pageIsTwoColumn) {
                // Page is in single-column mode (e.g., abstract) - use textwidth
                console.warn(`Warning: Zero width for ${startRecord.id} (type=${startRecord.type}, single-column page), using textwidth`);
                wPt = textWidthPt;
            } else {
                // Page is in two-column mode - use columnwidth
                console.warn(`Warning: Zero width for ${startRecord.id} (type=${startRecord.type}, col=${startRecord.col}, two-column page), using column width`);
                wPt = columnWidthPt;
            }
        } else {
            // Default case: use column width
            // This includes segments of multi-segment paragraphs
            console.warn(`Warning: Zero width for ${startRecord.id} (type=${startRecord.type}), using default column width`);
            wPt = columnWidthPt;
        }
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
        type: startRecord.type || 'unknown',
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
 * 
 * Note: This function is primarily used for paragraph text flow analysis.
 * Floats (tables/figures) should NOT use this for splitting - they're atomic units.
 */
function detectSpanning(positions, columnSettings) {
    // Check for multi-page spanning
    const pages = [...new Set(positions.map(r => r.page))].sort((a, b) => a - b);
    const spansPages = pages.length > 1;
    
    // Detect column for each position based on actual column settings
    const cwPt = spToPt(columnSettings.cwsp);
    const twPt = spToPt(columnSettings.twsp);
    const colsepPt = spToPt(columnSettings.colsep);
    
    // Auto-detect multi-column: textwidth > columnwidth * 1.5
    const isMultiColumn = twPt > (cwPt * 1.5);
    const columnBoundary = cwPt + (colsepPt / 2);
    
    const positionsWithCol = positions.map(pos => {
        const xPt = spToPt(pos.xsp);
        const isFloat = (pos.type === 'table' || pos.type === 'figure');
        
        // For floats (table, figure): always col=0 (atomic units)
        // For non-floats: calculate from X position
        let col = 0;
        if (!isFloat && isMultiColumn && xPt > columnBoundary) {
            col = 1;
        }
        
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
 * Infer missing column segments based on geometry
 * If a paragraph starts in left column on page N and ends in left column on page N+1,
 * it likely flows through the right column on page N
 */
function inferColumnFlow(positions, pageDimensions, columnSettings, col1StartPt) {
    if (positions.length < 2) return positions;
    
    const startPos = positions.find(p => p.role && p.role.endsWith('-start'));
    const endPos = positions.find(p => p.role && p.role.endsWith('-end'));
    
    if (!startPos || !endPos) return positions;
    
    // Only infer for paragraphs (not floats)
    if (startPos.type === 'table' || startPos.type === 'figure') return positions;
    
    // Check if it's multi-page and both in left column
    if (startPos.page < endPos.page && startPos.col === 0 && endPos.col === 0) {
        const pageHeightPt = parseFloat(pageDimensions.height.replace('pt', ''));
        const startYPt = spToPt(parseInt(startPos.ysp));
        
        // Calculate available space in left column on first page
        const bottomMarginPt = 72.27;
        const availableHeightInLeftCol = pageHeightPt - startYPt - bottomMarginPt;
        
        // If paragraph is large (spans pages), infer it flows through right column
        // Heuristic: if start is not near bottom (more than 150pt available)
        if (availableHeightInLeftCol > 150) {
            console.log(`   💡 Inferring column flow for ${startPos.id}: LEFT (p${startPos.page})→RIGHT (p${startPos.page})→LEFT (p${endPos.page})`);
            
            // Create synthetic positions for right column segment on first page
            const pageHeightSp = Math.round(pageHeightPt * 65536);
            const bottomMarginSp = Math.round(bottomMarginPt * 65536);
            const topMarginSp = Math.round(72.27 * 65536);
            const col1StartSp = Math.round(col1StartPt * 65536);
            
            // Synthetic end for left column (bottom of page)
            const syntheticLeftEnd = {
                ...startPos,
                page: startPos.page,
                col: 0,
                ysp: String(bottomMarginSp),
                role: startPos.role.replace('-start', '-end'),
                synthetic: true
            };
            
            // Synthetic start for right column (top of page)
            const syntheticRightStart = {
                ...startPos,
                page: startPos.page,
                col: 1,
                xsp: String(col1StartSp),
                ysp: String(pageHeightSp - topMarginSp),
                role: startPos.role.replace('-end', '-start'),
                synthetic: true
            };
            
            // Synthetic end for right column (bottom of page)
            const syntheticRightEnd = {
                ...startPos,
                page: startPos.page,
                col: 1,
                xsp: String(col1StartSp),
                ysp: String(bottomMarginSp),
                role: startPos.role.replace('-start', '-end'),
                synthetic: true
            };
            
            // Synthetic start for left column on next page (top of page)
            const syntheticNextPageStart = {
                ...endPos,
                page: endPos.page,
                col: 0,
                ysp: String(pageHeightSp - topMarginSp),
                role: endPos.role.replace('-end', '-start'),
                synthetic: true
            };
            
            // Return positions with inferred segments
            const newPositions = [
                ...positions,
                syntheticLeftEnd,
                syntheticRightStart,
                syntheticRightEnd,
                syntheticNextPageStart
            ];
            
            return newPositions.sort((a, b) => {
                if (a.page !== b.page) return a.page - b.page;
                if (a.col !== b.col) return a.col - b.col;
                // Ensure start comes before end
                const aIsStart = a.role && a.role.endsWith('-start') ? 0 : 1;
                const bIsStart = b.role && b.role.endsWith('-start') ? 0 : 1;
                return aIsStart - bIsStart;
            });
        }
    }
    
    return positions;
}

/**
 * Split positions into segments based on page AND column boundaries
 * Uses the 'col' field from NDJSON to properly split across columns
 */
function splitIntoSegments(positions, pageDimensions, columnSettings, col0StartPt, col1StartPt) {
    // First, infer any missing column segments based on geometry
    const inferredPositions = inferColumnFlow(positions, pageDimensions, columnSettings, col1StartPt);
    
    // Group positions by (page, column) to identify all segments
    const segmentMap = new Map();
    
    for (const pos of inferredPositions) {
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
        
        // Calculate column boundaries for synthetic markers
        const cwPt = spToPt(refPos.cwsp || 15456563); // column width
        
        // Use detected column starts instead of hardcoded values
        // Calculate X positions based on column
        let syntheticStartXSp, syntheticEndXSp;
        if (segment.column === 0) {
            // Left column: use detected start position
            syntheticStartXSp = String(Math.round(col0StartPt * 65536));
            syntheticEndXSp = String(Math.round((col0StartPt + cwPt) * 65536));
        } else {
            // Right column: use detected start position
            syntheticStartXSp = String(Math.round(col1StartPt * 65536));
            syntheticEndXSp = String(Math.round((col1StartPt + cwPt) * 65536));
        }
        
        if (!startPos) {
            // Create synthetic start at top-left of text body for this column
            startPos = {
                ...refPos,
                page: segment.page,
                col: segment.column,
                role: refPos.role ? refPos.role.replace('-end', '-start') : 'P-start',
                xsp: syntheticStartXSp, // Left edge of column
                ysp: String(textBodyTopSp), // Top of text body (excluding header)
                synthetic: true
            };
        }
        
        if (!endPos) {
            // Create synthetic end at bottom-right of text body for this column
            endPos = {
                ...refPos,
                page: segment.page,
                col: segment.column,
                role: refPos.role ? refPos.role.replace('-start', '-end') : 'P-end',
                xsp: syntheticEndXSp, // Right edge of column
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
function calculateBoundingBoxForSegment(segment, pageDimensions, baseId, pageColumnMode) {
    // Pass segment info to calculateBoundingBox for proper width calculation
    const segmentInfo = segment.totalSegments > 1 ? {
        totalSegments: segment.totalSegments,
        segmentIndex: segment.segmentIndex
    } : null;
    
    const bbox = calculateBoundingBox(segment.positions, pageDimensions, segmentInfo, pageColumnMode);
    
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
 * Determine actual column based on X position  
 */
function getActualColumn(xsp, col0StartPt, col1StartPt) {
    const xPt = parseInt(xsp) / 65536;
    // If closer to col1 start, it's in col1, otherwise col0
    const distToCol0 = Math.abs(xPt - col0StartPt);
    const distToCol1 = Math.abs(xPt - col1StartPt);
    return distToCol1 < distToCol0 ? 1 : 0;
}

/**
 * Extract figure bounding boxes from positions
 * Handles figures that span multiple pages/columns by creating separate bounds for each segment
 */
function extractFigureBounds(positions, col0StartPt = 72.27, col1StartPt = 303.75) {
    const figures = {};
    
    for (const pos of positions) {
        // Check if this is a figure marker (using type field)
        if (pos.type !== 'figure') continue;
        
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
                    
                    // Determine actual column from X position, not col field (figures have col=0)
                    const actualCol = (segStart || segEnd) ? 
                        getActualColumn((segStart || segEnd).xsp, col0StartPt, col1StartPt) : segment.col;
                    
                    figureBounds.push({
                        id: figId,
                        page: segment.page,
                        col: actualCol,
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
                
                // Determine actual column from X position
                const actualCol = getActualColumn(startPos.xsp, col0StartPt, col1StartPt);
                
                figureBounds.push({
                    id: figId,
                    page: startPos.page,
                    col: actualCol,
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
 * Analyze which pages are in single-column vs two-column mode
 */
function analyzePageColumnMode(positions) {
    const pageColumnInfo = new Map();
    
    for (const pos of positions) {
        if (!pageColumnInfo.has(pos.page)) {
            pageColumnInfo.set(pos.page, new Set());
        }
        pageColumnInfo.get(pos.page).add(pos.col);
    }
    
    const result = new Map();
    for (const [page, cols] of pageColumnInfo.entries()) {
        // Page is two-column if it has content in both col=0 AND col=1
        const isTwoColumn = cols.has(0) && cols.has(1);
        result.set(page, isTwoColumn);
    }
    
    return result;
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
    
    // Detect actual column start positions from the data (for non-float elements)
    const col0Positions = positionsToUse.filter(p => p.col === 0 && p.type === 'para' && p.role && p.role.endsWith('-start'));
    const col1Positions = positionsToUse.filter(p => p.col === 1 && p.type === 'para' && p.role && p.role.endsWith('-start'));
    
    // Find most common X position for each column (ignoring centered/abstract content)
    const getMostCommonPosition = (positions, defaultPt) => {
        if (positions.length === 0) return defaultPt;
        
        // Get all X positions and count occurrences
        const xPositions = positions.map(p => spToPt(parseInt(p.xsp)));
        const xCounts = {};
        xPositions.forEach(xpt => {
            const rounded = Math.round(xpt * 10) / 10; // Round to 0.1pt
            xCounts[rounded] = (xCounts[rounded] || 0) + 1;
        });
        
        // Find the most common position
        let maxCount = 0;
        let mostCommonX = defaultPt;
        for (const [xpt, count] of Object.entries(xCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonX = parseFloat(xpt);
            }
        }
        
        return mostCommonX;
    };
    
    const col0StartPt = getMostCommonPosition(col0Positions, 72.27);
    const col1StartPt = getMostCommonPosition(col1Positions, 303.75);
    
    console.log(`   📐 Detected column starts: col0=${col0StartPt.toFixed(2)}pt, col1=${col1StartPt.toFixed(2)}pt`);
    
    // Analyze page column modes (single-column vs two-column)
    const pageColumnMode = analyzePageColumnMode(positionsToUse);
    console.log(`   📄 Page analysis:`, Array.from(pageColumnMode.entries()).slice(0, 5).map(([page, isTwoCol]) => 
        `P${page}=${isTwoCol ? '2col' : '1col'}`).join(', '));
    
    // Extract figure bounds for overlap detection (pass column starts)
    const figureBounds = extractFigureBounds(positionsToUse, col0StartPt, col1StartPt);
    console.log(`   📐 Found ${figureBounds.length} figure bounds for overlap detection`);
    
    const groupedById = groupPositionsByIdOnly(positionsToUse);
    const markedBoxes = [];
    let splitElementCount = 0;
    let singleElementCount = 0;
    let figureAvoidanceCount = 0;

    for (const [id, elementPositions] of Object.entries(groupedById)) {
        // Check if this is a float (figure or table) using type field
        const isFloat = elementPositions.some(p => p.type === 'table' || p.type === 'figure');
        
        // For floats (tables and figures): only split if truly spanning multiple pages
        // Do NOT split floats across columns - they're single units in each column
        let segments;
        if (isFloat) {
            // Check if float spans multiple pages
            const pages = [...new Set(elementPositions.map(p => p.page))].sort((a, b) => a - b);
            if (pages.length > 1) {
                // Check if pages are consecutive
                let isConsecutive = true;
                for (let i = 1; i < pages.length; i++) {
                    if (pages[i] !== pages[i-1] + 1) {
                        isConsecutive = false;
                        break;
                    }
                }
                
                // Multi-page float: create one segment for EACH page
                // For TABLES (longtables): Always fill gaps - they truly span pages
                //   LaTeX only emits markers at start/end, not on intermediate pages
                // For FIGURES: Only fill gaps if consecutive - non-consecutive means separate placements
                const isTable = elementPositions.some(p => p.type === 'table');
                const shouldFillGaps = isTable || isConsecutive;
                
                const allPages = shouldFillGaps ? (() => {
                    // Fill in the range for tables or consecutive pages
                    const firstPage = pages[0];
                    const lastPage = pages[pages.length - 1];
                    const result = [];
                    for (let p = firstPage; p <= lastPage; p++) {
                        result.push(p);
                    }
                    return result;
                })() : pages; // Use only actual pages for non-consecutive figures
                
                if (!isConsecutive && !isTable) {
                    console.log(`ℹ️  ${id}: Non-consecutive pages [${pages.join(', ')}] detected - treating as separate figure placements (not filling gaps)`);
                }
                
                // Get page height and text area boundaries for synthetic markers
                const pageHeightPt = parseFloat(pageDimensions.height.replace('pt', ''));
                // Use standard LaTeX 1in margins (72pt)
                const topMarginPt = 72.27;  // Top margin
                const bottomMarginPt = 72.27;  // Bottom margin
                const textAreaTopSp = String(Math.round((pageHeightPt - topMarginPt) * 65536));  // Top of text area
                const textAreaBottomSp = String(Math.round(bottomMarginPt * 65536));  // Bottom of text area
                
                // Create segments for all pages in range
                const segmentArray = [];
                for (const page of allPages) {
                    // Find actual markers for this page
                    const pagePositions = elementPositions.filter(p => p.page === page);
                    const hasStart = pagePositions.some(p => p.role && p.role.endsWith('-start'));
                    const hasEnd = pagePositions.some(p => p.role && p.role.endsWith('-end'));
                    
                    // Get a reference position for creating synthetic markers
                    const refPos = pagePositions.length > 0 ? pagePositions[0] : {
                        ...elementPositions[0],
                        page: page
                    };
                    
                    const positions = [...pagePositions];
                    
                    // Add synthetic start marker at top of TEXT AREA if missing
                    if (!hasStart) {
                        positions.unshift({
                            ...refPos,
                            page: page,
                            ysp: textAreaTopSp,  // Top of text area (not page)
                            role: refPos.type === 'table' ? 'TABLE-start' : 'FIG-start',
                            synthetic: true
                        });
                    }
                    
                    // Add synthetic end marker at bottom of TEXT AREA if missing
                    if (!hasEnd) {
                        positions.push({
                            ...refPos,
                            page: page,
                            ysp: textAreaBottomSp,  // Bottom of text area (not page)
                            role: refPos.type === 'table' ? 'TABLE-end' : 'FIG-end',
                            synthetic: true
                        });
                    }
                    
                    segmentArray.push({
                        page: page,
                        column: refPos.col || 0,
                        positions: positions
                    });
                }
                
                segments = segmentArray.map((seg, idx, arr) => ({
                    positions: seg.positions,
                    page: seg.page,
                    column: seg.column,
                    segmentIndex: idx,
                    totalSegments: arr.length
                }));
                
                splitElementCount++;
                console.log(`   ✂️  Split float "${id}" into ${segments.length} page segments (pages: ${allPages.join(',')})`);
            } else {
                // Single-page float: treat as single unit regardless of columns
                segments = [{
                    positions: elementPositions,
                    page: elementPositions[0].page,
                    column: elementPositions[0].col || 0,
                    segmentIndex: 0,
                    totalSegments: 1
                }];
                singleElementCount++;
            }
        } else {
            // For non-floats (paragraphs): use normal splitting logic for columns and pages
            segments = splitIntoSegments(elementPositions, pageDimensions, columnSettings, col0StartPt, col1StartPt);
        
        if (segments.length > 1) {
            splitElementCount++;
            console.log(`   ✂️  Split "${id}" into ${segments.length} segments (pages: ${segments.map(s => s.page).join(',')}, cols: ${segments.map(s => s.column).join(',')})`);
        } else {
            singleElementCount++;
            }
        }
        
        // Process each segment and check for figure overlaps (only for non-floats)
        let finalSegments = [];
        if (!isFloat) {
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
            const bbox = calculateBoundingBoxForSegment(segment, pageDimensions, id, pageColumnMode);
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

    // Define output paths
    const ndjsonPath = path.join(outputDir, `${jobName}-texpos.ndjson`);
    const markedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes.json`);

    // Try to read LaTeX-generated NDJSON first (which has type field)
    let positions = readPositionsFromNdjson(ndjsonPath);
    
    if (!positions || positions.length === 0) {
        // Fallback: Parse aux file if NDJSON doesn't exist
        console.log('LaTeX-generated NDJSON not found, parsing aux file as fallback...');
        positions = parseAuxFile(auxFile);

    if (positions.length === 0) {
        console.error('Error: No position data found in aux file');
        console.error('Make sure the LaTeX document uses the geom-marks.tex package');
        process.exit(1);
    }

    // Get page dimensions (try from NDJSON first, then aux)
    const pageDimensions = getPageDimensions(auxFile, ndjsonPath);
    console.log(`Using page dimensions: ${pageDimensions.width} × ${pageDimensions.height}`);

    // Get column settings from existing NDJSON if available
    const columnSettings = getColumnSettings(ndjsonPath);

        // Generate NDJSON from aux file (without type field)
    console.log('\n=== Syncing from aux file with multi-column/page support ===');
    generateNdjson(positions, pageDimensions, columnSettings, ndjsonPath);
        
        // Re-read the generated NDJSON to get proper positions
        positions = readPositionsFromNdjson(ndjsonPath) || positions;
    } else {
        console.log(`\n=== Using LaTeX-generated NDJSON with type information ===`);
        console.log(`Found ${positions.length} position records in ${ndjsonPath}`);
    }

    // Get page dimensions from NDJSON (most accurate - after NDJSON is available)
    const pageDimensions = getPageDimensions(auxFile, ndjsonPath);
    console.log(`Using page dimensions: ${pageDimensions.width} × ${pageDimensions.height}`);

    // Get column settings from NDJSON
    const columnSettings = getColumnSettings(ndjsonPath);

    // Generate marked-boxes.json from positions (with type field)
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
    generateMarkedBoxes,
    readPositionsFromNdjson,
    getPageDimensions,
    getColumnSettings
};

