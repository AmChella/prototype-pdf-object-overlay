#!/usr/bin/env node

/**
 * split_multi_column_page.js - Enhanced coordinate splitting for multi-column and multi-page scenarios
 * 
 * Handles:
 * - Scenario 1: Paragraph spans columns (left to right) on same page → 2 items
 * - Scenario 2: Paragraph spans pages → 2 items (one per page)
 * - Scenario 3: Paragraph spans columns AND pages → 3+ items (properly split)
 */

const fs = require('fs');
const path = require('path');

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
 * Convert points to pixels (default 72 DPI)
 */
function ptToPx(ptValue, dpi = 72) {
    return ptValue * (dpi / 72.0);
}

/**
 * Detect if element spans columns or pages
 * Returns: { type: 'single'|'multi-column'|'multi-page'|'multi-column-page', segments: [...] }
 */
function detectSpanning(positions, columnSettings) {
    // Find all records for this element
    const records = positions.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.ysp - b.ysp; // Sort by y position within page
    });
    
    // Check for multi-page spanning
    const pages = [...new Set(records.map(r => r.page))];
    const isMultiPage = pages.length > 1;
    
    // Check for multi-column spanning (x position changes significantly)
    const leftColumnThreshold = columnSettings.cwsp; // Column width in sp
    const hasColumnSpan = records.some((rec, idx) => {
        if (idx === 0) return false;
        const prevRec = records[idx - 1];
        if (rec.page !== prevRec.page) return false; // Different pages don't count
        const xDiff = Math.abs(parseInt(rec.xsp) - parseInt(prevRec.xsp));
        return xDiff > leftColumnThreshold * 0.5; // Significant x shift indicates column change
    });
    
    // Determine column for each record based on actual column settings
    const cwPt = spToPt(columnSettings.cwsp);
    const twPt = spToPt(columnSettings.twsp);
    const colsepPt = spToPt(columnSettings.colsep);
    
    // Auto-detect multi-column: textwidth > columnwidth * 1.5
    const isMultiColumn = twPt > (cwPt * 1.5);
    const columnBoundary = cwPt + (colsepPt / 2);
    
    const recordsWithCol = records.map(rec => {
        const xPt = spToPt(rec.xsp);
        const isFloat = /TABLE|FIG/i.test(rec.role);
        
        // For floats (TABLE, FIG): always col=0 (atomic units)
        // For non-floats: calculate from X position
        let col = 0;
        if (!isFloat && isMultiColumn && xPt > columnBoundary) {
            col = 1;
        }
        
        return { ...rec, col };
    });
    
    // Determine type
    let type = 'single';
    if (isMultiPage && hasColumnSpan) {
        type = 'multi-column-page';
    } else if (isMultiPage) {
        type = 'multi-page';
    } else if (hasColumnSpan) {
        type = 'multi-column';
    }
    
    return {
        type,
        records: recordsWithCol,
        pages
    };
}

/**
 * Split positions into segments for multi-column/page elements
 */
function splitIntoSegments(positions, pageDimensions, columnSettings) {
    const spanInfo = detectSpanning(positions, columnSettings);
    
    if (spanInfo.type === 'single') {
        // No splitting needed
        return [positions];
    }
    
    const segments = [];
    const records = spanInfo.records;
    
    // Group by page and column
    const grouped = {};
    for (const rec of records) {
        const key = `p${rec.page}-c${rec.col}`;
        if (!grouped[key]) {
            grouped[key] = { page: rec.page, col: rec.col, records: [] };
        }
        grouped[key].records.push(rec);
    }
    
    // Sort by page and column
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const aMatch = a.match(/p(\d+)-c(\d+)/);
        const bMatch = b.match(/p(\d+)-c(\d+)/);
        if (aMatch[1] !== bMatch[1]) {
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
        return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    });
    
    // Create segments with start/end pairs
    for (let i = 0; i < sortedKeys.length; i++) {
        const key = sortedKeys[i];
        const group = grouped[key];
        
        // Find start and end for this segment
        let startRecord = null;
        let endRecord = null;
        
        if (i === 0) {
            // First segment: use original start, create end at column/page boundary
            startRecord = group.records.find(r => r.role && r.role.endsWith('-start'));
            endRecord = group.records.find(r => r.role && r.role.endsWith('-end'));
            
            if (!endRecord && sortedKeys.length > 1) {
                // Create synthetic end at column/page boundary
                endRecord = {
                    ...startRecord,
                    role: startRecord.role.replace('-start', '-end'),
                    xsp: (parseInt(startRecord.xsp) + columnSettings.cwsp).toString(),
                    ysp: startRecord.ysp, // Same line
                    synthetic: true
                };
            }
        } else if (i === sortedKeys.length - 1) {
            // Last segment: create start at column/page boundary, use original end
            endRecord = group.records.find(r => r.role && r.role.endsWith('-end'));
            startRecord = group.records.find(r => r.role && r.role.endsWith('-start'));
            
            if (!startRecord) {
                // Create synthetic start at column/page beginning
                startRecord = {
                    ...endRecord,
                    role: endRecord.role.replace('-end', '-start'),
                    xsp: group.col === 0 ? columnSettings.colsep.toString() : (columnSettings.cwsp + columnSettings.colsep).toString(),
                    ysp: endRecord.ysp, // Approximate
                    synthetic: true
                };
            }
        } else {
            // Middle segments: create both synthetic start and end at boundaries
            const referenceRec = group.records[0];
            startRecord = {
                ...referenceRec,
                role: referenceRec.role.replace('-start', '-start').replace('-end', '-start'),
                xsp: group.col === 0 ? columnSettings.colsep.toString() : (columnSettings.cwsp + columnSettings.colsep).toString(),
                synthetic: true
            };
            endRecord = {
                ...referenceRec,
                role: referenceRec.role.replace('-start', '-end').replace('-end', '-end'),
                xsp: (parseInt(startRecord.xsp) + columnSettings.cwsp).toString(),
                ysp: startRecord.ysp,
                synthetic: true
            };
        }
        
        if (startRecord && endRecord) {
            segments.push([startRecord, endRecord]);
        }
    }
    
    return segments.length > 0 ? segments : [positions];
}

/**
 * Calculate bounding box from start/end positions
 */
function calculateBoundingBox(positions, pageDimensions, segmentIndex = 0, totalSegments = 1) {
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
        return null;
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
    
    // If width is 0, use column width
    if (wPt === 0) {
        wPt = spToPt(15456563); // Default column width
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
    
    // Create ID with segment suffix if multi-segment
    const baseId = startRecord.id;
    const segmentedId = totalSegments > 1 ? `${baseId}_seg${segmentIndex + 1}` : baseId;
    
    return {
        id: segmentedId,
        originalId: baseId,
        segmentIndex: segmentIndex,
        totalSegments: totalSegments,
        page: startRecord.page,
        x_pt: Math.round(xPt * 100) / 100,
        y_pt: Math.round(yPt * 100) / 100,
        width_pt: Math.round(wPt * 100) / 100,
        height_pt: Math.round(hPt * 100) / 100,
        x_mm: Math.round(xMm * 100) / 100,
        y_mm: Math.round(yMm * 100) / 100,
        width_mm: Math.round(wMm * 100) / 100,
        height_mm: Math.round(hMm * 100) / 100,
        x_px: Math.round(xPx * 100) / 100,
        y_px: Math.round(yPx * 100) / 100,
        width_px: Math.round(wPx * 100) / 100,
        height_px: Math.round(hPx * 100) / 100
    };
}

/**
 * Generate marked-boxes JSON with multi-column/page splitting
 */
function generateMarkedBoxesWithSplitting(positions, pageDimensions, columnSettings, outputPath) {
    console.log('\n🔄 Generating marked-boxes with multi-column/page splitting...');
    
    const grouped = {};
    for (const pos of positions) {
        const key = `${pos.id}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(pos);
    }
    
    const markedBoxes = [];
    let splitCount = 0;
    let singleCount = 0;
    
    for (const [id, positions] of Object.entries(grouped)) {
        // Check if this is a float (figure or table)
        const isFloat = positions.some(p => p.role && (p.role.startsWith('FIG') || p.role.startsWith('TABLE')));
        
        // For floats: only split if truly spanning multiple pages, NOT across columns
        let segments;
        if (isFloat) {
            // Check if float spans multiple pages
            const pages = [...new Set(positions.map(p => p.page))].sort((a, b) => a - b);
            if (pages.length > 1) {
                // Multi-page float: split by page only
                console.log(`   ✂️  Float "${id}" spans ${pages.length} pages - splitting by page`);
                // Group by page only (ignore columns)
                const pageGroups = {};
                for (const pos of positions) {
                    if (!pageGroups[pos.page]) {
                        pageGroups[pos.page] = [];
                    }
                    pageGroups[pos.page].push(pos);
                }
                segments = Object.values(pageGroups);
                splitCount++;
            } else {
                // Single-page float: treat as single unit
                segments = [positions];
                singleCount++;
            }
        } else {
            // For non-floats: use normal column/page splitting
            segments = splitIntoSegments(positions, pageDimensions, columnSettings);
            
            if (segments.length > 1) {
                splitCount++;
                console.log(`   ✂️  Split ${id} into ${segments.length} segments`);
            } else {
                singleCount++;
            }
        }
        
        // Calculate bounding box for each segment
        for (let i = 0; i < segments.length; i++) {
            const box = calculateBoundingBox(segments[i], pageDimensions, i, segments.length);
            if (box) {
                markedBoxes.push(box);
            }
        }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(markedBoxes, null, 2));
    console.log(`\n✅ Generated ${markedBoxes.length} marked boxes (${splitCount} split, ${singleCount} single)`);
    console.log(`   📄 Written to: ${outputPath}`);
}

module.exports = {
    detectSpanning,
    splitIntoSegments,
    calculateBoundingBox,
    generateMarkedBoxesWithSplitting
};

