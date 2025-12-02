#!/usr/bin/env node

/**
 * Convert line-level position data to paragraph-level overlay bounding boxes
 * with column-level segmentation for two-column layouts.
 * 
 * Groups lines by: paragraph ID → page → column
 * Creates separate overlay segments for each column.
 * 
 * Usage:
 *   node lines_to_overlays.js <input-lines.ndjson> <output-marked-boxes.json>
 */

const fs = require('fs');

// Constants for coordinate conversion
const SP_TO_PT = 65536;  // 1pt = 65536 scaled points

function spToPt(sp) {
    return sp / SP_TO_PT;
}

function ptToMm(pt) {
    return pt * 0.352778;
}

function readLinesNdjson(ndjsonPath) {
    if (!fs.existsSync(ndjsonPath)) {
        console.error(`Error: NDJSON file not found: ${ndjsonPath}`);
        return [];
    }

    const content = fs.readFileSync(ndjsonPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const records = [];
    for (const line of lines) {
        try {
            records.push(JSON.parse(line));
        } catch (e) {
            console.warn(`Warning: Failed to parse line: ${line}`);
        }
    }
    
    return records;
}

/**
 * Detect which column a line belongs to based on X position
 * @param {number} x_sp - X position in scaled points
 * @param {number} columnThreshold_pt - Threshold in points to distinguish columns (default: 170pt)
 * @returns {number} - Column number (0 = left, 1 = right)
 */
function detectColumn(x_sp, columnThreshold_pt = 170) {
    const x_pt = spToPt(x_sp);
    return x_pt > columnThreshold_pt ? 1 : 0;
}

/**
 * Analyze X positions to detect column layout
 */
function analyzeColumnLayout(lineRecords) {
    const xPositions = lineRecords.map(r => spToPt(r.xsp));
    
    // Group X positions into clusters (within 10pt tolerance)
    const clusters = [];
    const tolerance = 10;
    
    for (const x of xPositions) {
        let found = false;
        for (const cluster of clusters) {
            if (Math.abs(cluster.center - x) < tolerance) {
                cluster.positions.push(x);
                cluster.center = cluster.positions.reduce((a, b) => a + b, 0) / cluster.positions.length;
                found = true;
                break;
            }
        }
        if (!found) {
            clusters.push({ center: x, positions: [x] });
        }
    }
    
    // Sort clusters by count (most common first)
    clusters.sort((a, b) => b.positions.length - a.positions.length);
    
    console.log(`\n📐 Column Layout Analysis:`);
    clusters.slice(0, 5).forEach((c, i) => {
        console.log(`   Cluster ${i + 1}: x ≈ ${c.center.toFixed(1)}pt (${c.positions.length} lines)`);
    });
    
    // Determine column threshold (midpoint between two main clusters)
    if (clusters.length >= 2) {
        const leftCol = Math.min(clusters[0].center, clusters[1].center);
        const rightCol = Math.max(clusters[0].center, clusters[1].center);
        const threshold = (leftCol + rightCol) / 2;
        console.log(`   → Left column: ~${leftCol.toFixed(1)}pt`);
        console.log(`   → Right column: ~${rightCol.toFixed(1)}pt`);
        console.log(`   → Column threshold: ${threshold.toFixed(1)}pt`);
        return { leftCol, rightCol, threshold };
    }
    
    return { leftCol: 36, rightCol: 307, threshold: 170 };
}

/**
 * Group lines by paragraph ID, page, and column
 */
function groupLinesByColumn(lineRecords, columnThreshold) {
    const groups = {};
    
    for (const record of lineRecords) {
        const { id, line, xsp, ysp, w, h, d, page } = record;
        const column = detectColumn(xsp, columnThreshold);
        const key = `${id}_p${page}_c${column}`;
        
        if (!groups[key]) {
            groups[key] = {
                id,
                page,
                column,
                lines: []
            };
        }
        
        groups[key].lines.push({
            lineNum: line,
            x_sp: xsp,
            y_sp: ysp,
            width_sp: w,
            height_sp: h,
            depth_sp: d
        });
    }
    
    return Object.values(groups);
}

/**
 * Calculate bounding box from a group of lines
 */
function calculateBoundingBox(group, pageHeightPt = 796.68) {
    const { id, page, column, lines } = group;
    
    if (lines.length === 0) return null;
    
    // Sort lines by Y position (descending - top lines have higher Y in TeX coordinates)
    lines.sort((a, b) => b.y_sp - a.y_sp);
    
    // Get the topmost line (highest Y in TeX = top of paragraph)
    const topLine = lines[0];
    // Get the bottommost line (lowest Y in TeX = bottom of paragraph)
    const bottomLine = lines[lines.length - 1];
    
    // Calculate bounding box
    // X is the leftmost X position
    const x_sp = Math.min(...lines.map(l => l.x_sp));
    // Width is the maximum line width
    const width_sp = Math.max(...lines.map(l => l.width_sp));
    
    // Y positions: TeX Y is baseline position from bottom of page
    const y_top_sp = topLine.y_sp + topLine.height_sp;  // Top of first line
    const y_bottom_sp = bottomLine.y_sp - bottomLine.depth_sp;  // Bottom of last line
    
    // Total height
    const totalHeight_sp = y_top_sp - y_bottom_sp;
    
    // Convert to points
    const x_pt = spToPt(x_sp);
    const width_pt = spToPt(width_sp);
    const height_pt = spToPt(totalHeight_sp);
    
    // Y coordinate conversion: TeX Y is from bottom, PDF/screen Y is from top
    const y_pt = pageHeightPt - spToPt(y_top_sp);
    
    return {
        id,
        type: 'para',
        page,
        column,
        x_pt: parseFloat(x_pt.toFixed(2)),
        y_pt: parseFloat(y_pt.toFixed(2)),
        w_pt: parseFloat(width_pt.toFixed(2)),
        h_pt: parseFloat(height_pt.toFixed(2)),
        x_mm: parseFloat(ptToMm(x_pt).toFixed(2)),
        y_mm: parseFloat(ptToMm(y_pt).toFixed(2)),
        w_mm: parseFloat(ptToMm(width_pt).toFixed(2)),
        h_mm: parseFloat(ptToMm(height_pt).toFixed(2)),
        x_px: parseFloat(x_pt.toFixed(2)),
        y_px: parseFloat(y_pt.toFixed(2)),
        w_px: parseFloat(width_pt.toFixed(2)),
        h_px: parseFloat(height_pt.toFixed(2)),
        lineCount: lines.length
    };
}

/**
 * Process groups into final overlay segments with proper IDs
 */
function createOverlaySegments(groups) {
    // First, calculate bounding boxes
    const boxes = groups.map(g => calculateBoundingBox(g)).filter(Boolean);
    
    // Group by original paragraph ID to detect multi-column/page paragraphs
    const byParaId = {};
    for (const box of boxes) {
        const paraId = box.id;
        if (!byParaId[paraId]) {
            byParaId[paraId] = [];
        }
        byParaId[paraId].push(box);
    }
    
    // Process each paragraph - add segment info if spans multiple columns/pages
    const result = [];
    for (const [paraId, segments] of Object.entries(byParaId)) {
        // Sort by page, then by column
        segments.sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            return a.column - b.column;
        });
        
        if (segments.length === 1) {
            // Single segment - remove column field from output, add label
            const { column, ...rest } = segments[0];
            result.push({
                ...rest,
                label: `para ${paraId}`
            });
        } else {
            // Multi-segment - unique IDs with human-readable labels
            for (let i = 0; i < segments.length; i++) {
                const { column, ...rest } = segments[i];
                // Unique ID for data: seg1of3, seg2of3, etc.
                const segmentId = `${paraId}_seg${i + 1}of${segments.length}`;
                // Human-readable label: "para p0035" or "para p0035 continue"
                const label = i === 0 ? `para ${paraId}` : `para ${paraId} continue`;
                result.push({
                    ...rest,
                    id: segmentId,
                    label: label,
                    originalId: paraId,
                    segmentIndex: i,
                    totalSegments: segments.length,
                    columnInfo: column === 0 ? 'left' : 'right'
                });
            }
        }
    }
    
    // Sort by page then Y position
    result.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.y_pt - b.y_pt;
    });
    
    return result;
}

function convertLinesToOverlays(linesNdjsonPath, markedBoxesPath) {
    console.log(`\n📖 Reading line-level data from: ${linesNdjsonPath}`);
    const lineRecords = readLinesNdjson(linesNdjsonPath);
    
    if (lineRecords.length === 0) {
        console.warn('⚠️  No line records found');
        return;
    }
    
    console.log(`✅ Found ${lineRecords.length} line records`);
    
    // Analyze column layout
    const { threshold } = analyzeColumnLayout(lineRecords);
    
    console.log(`\n🔨 Grouping lines by paragraph, page, and column...`);
    const groups = groupLinesByColumn(lineRecords, threshold);
    console.log(`✅ Found ${groups.length} paragraph/page/column groups`);
    
    // Show grouping details
    const multiColParas = {};
    for (const g of groups) {
        if (!multiColParas[g.id]) multiColParas[g.id] = [];
        multiColParas[g.id].push({ page: g.page, column: g.column, lines: g.lines.length });
    }
    
    const multiColCount = Object.values(multiColParas).filter(segs => segs.length > 1).length;
    console.log(`   📊 Paragraphs spanning multiple columns/pages: ${multiColCount}`);
    
    console.log(`\n📐 Creating overlay segments...`);
    const overlays = createOverlaySegments(groups);
    console.log(`✅ Generated ${overlays.length} overlay segments`);
    
    // Write output
    fs.writeFileSync(markedBoxesPath, JSON.stringify(overlays, null, 2), 'utf8');
    console.log(`\n💾 Written to: ${markedBoxesPath}`);
    
    // Summary
    const multiSegCount = overlays.filter(o => o.totalSegments > 1).length;
    const singleSegCount = overlays.length - multiSegCount;
    const uniqueParas = new Set(overlays.map(o => o.originalId || o.id)).size;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total lines: ${lineRecords.length}`);
    console.log(`   Unique paragraphs: ${uniqueParas}`);
    console.log(`   Overlay segments: ${overlays.length}`);
    console.log(`   - Single-segment: ${singleSegCount}`);
    console.log(`   - Multi-segment: ${multiSegCount}`);
    
    // Show multi-segment details
    if (multiSegCount > 0) {
        console.log(`\n📋 Multi-segment paragraphs:`);
        for (const overlay of overlays) {
            if (overlay.totalSegments > 1 && overlay.segmentIndex === 0) {
                const segs = overlays.filter(o => o.originalId === overlay.originalId);
                const details = segs.map(s => `p${s.page}/${s.columnInfo}`).join(' → ');
                console.log(`   ${overlay.originalId}: ${overlay.totalSegments} segments (${details})`);
            }
        }
    }
}

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.error('Usage: node lines_to_overlays.js <input-lines.ndjson> <output-marked-boxes.json>');
        process.exit(1);
    }
    
    const [inputPath, outputPath] = args;
    
    try {
        convertLinesToOverlays(inputPath, outputPath);
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

module.exports = { convertLinesToOverlays };
