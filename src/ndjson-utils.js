
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
 * Convert points to pixels (default 72 DPI, 1 pt = 1 px at 72 DPI)
 */
function ptToPx(ptValue, dpi = 72) {
    return ptValue * (dpi / 72.0);
}

/**
 * Parse NDJSON file and return list of position records
 */
function parseNdjson(filePath) {
    const records = [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
            try {
                records.push(JSON.parse(trimmed));
            } catch (e) {
                console.warn(`Warning: Failed to parse NDJSON line: ${trimmed}`);
            }
        }
    }

    return records;
}

/**
 * Group start/end records by ID only (to pair markers that might span pages)
 */
function groupRecordsById(records) {
    const grouped = {};
    const seenRecords = new Set(); // Track unique (id, page, role) to avoid duplicates

    for (const record of records) {
        // Create a unique key for deduplication (id, page, role)
        const dedupKey = `${record.id}-${record.page}-${record.role}`;

        // Skip if we've already seen this exact record
        if (seenRecords.has(dedupKey)) {
            console.log(`Info: Skipping duplicate record for ${record.id} on page ${record.page} (role: ${record.role})`);
            continue;
        }

        seenRecords.add(dedupKey);

        // Group by ID ONLY (not by page) to pair start/end markers
        // Multi-page spanning will be handled later
        const key = record.id;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(record);
    }
    return grouped;
}

/**
 * Split multi-page elements into segments (one per page)
 * Returns array of { startRecord, endRecord, page } objects
 */
function splitMultiPageElement(records) {
    if (records.length !== 2) {
        return null;
    }

    // Find start and end records
    let startRecord = null;
    let endRecord = null;

    for (const record of records) {
        if (record.role && record.role.endsWith('-start')) {
            startRecord = record;
        } else if (record.role && record.role.endsWith('-end')) {
            endRecord = record;
        }
    }

    if (!startRecord || !endRecord) {
        return null;
    }

    const startPage = startRecord.page;
    const endPage = endRecord.page;

    // If on same page, no splitting needed
    if (startPage === endPage) {
        return [{ startRecord, endRecord, page: startPage }];
    }

    // Multi-page element - split into segments
    console.log(`📄 Splitting multi-page element ${startRecord.id} (pages ${startPage}-${endPage})`);

    const segments = [];
    const pageHeightPt = parseFloat(startRecord.ph.replace('pt', ''));

    for (let page = startPage; page <= endPage; page++) {
        let segmentStart, segmentEnd;

        if (page === startPage) {
            // First page: from start marker to bottom of page
            segmentStart = { ...startRecord };
            segmentEnd = {
                ...startRecord,
                ysp: '0',  // Bottom of page in TeX coordinates (top-left origin)
                role: 'P-end'  // Synthetic end marker
            };
        } else if (page === endPage) {
            // Last page: from top of page to end marker
            segmentStart = {
                ...endRecord,
                ysp: String(Math.round(pageHeightPt * 65536)),  // Top of page in TeX coordinates
                role: 'P-start'  // Synthetic start marker
            };
            segmentEnd = { ...endRecord };
        } else {
            // Middle page: full height
            segmentStart = {
                ...startRecord,
                page: page,
                ysp: String(Math.round(pageHeightPt * 65536)),  // Top of page
                role: 'P-start'
            };
            segmentEnd = {
                ...startRecord,
                page: page,
                ysp: '0',  // Bottom of page
                role: 'P-end'
            };
        }

        segmentStart.page = page;
        segmentEnd.page = page;

        segments.push({ startRecord: segmentStart, endRecord: segmentEnd, page });
    }

    return segments;
}

/**
 * Calculate bounding box from start/end records
 */
function calculateBoundingBox(records) {
    if (records.length !== 2) {
        console.warn(`Warning: Expected 2 records (start/end), got ${records.length} for ID`);
        return null;
    }

    // Find start and end records
    let startRecord = null;
    let endRecord = null;

    for (const record of records) {
        if (record.role && record.role.endsWith('-start')) {
            startRecord = record;
        } else if (record.role && record.role.endsWith('-end')) {
            endRecord = record;
        }
    }

    if (!startRecord || !endRecord) {
        console.warn('Warning: Missing start or end record');
        return null;
    }

    // Convert coordinates from sp to pt
    const x1Pt = spToPt(startRecord.xsp);
    const y1Pt = spToPt(startRecord.ysp);
    const x2Pt = spToPt(endRecord.xsp);
    const y2Pt = spToPt(endRecord.ysp);

    // Get page height for coordinate system conversion
    const pageHeightPt = parseFloat(startRecord.ph.replace('pt', ''));

    // Convert Y coordinates from TeX (top-left origin) to PDF (bottom-left origin)
    const y1PtPdf = pageHeightPt - y1Pt;
    const y2PtPdf = pageHeightPt - y2Pt;

    // Calculate bounding box using PURE COORDINATES (no column assumptions)
    // This approach works for any layout: 2-col, 3-col, asymmetric (30/70), etc.
    const xPt = Math.min(x1Pt, x2Pt);
    const yPt = Math.min(y1PtPdf, y2PtPdf);
    let wPt = Math.abs(x2Pt - x1Pt);
    const hPt = Math.abs(y2PtPdf - y1PtPdf);

    // Only use default width if coordinates are identical (shouldn't happen with proper markers)
    if (wPt === 0) {
        console.warn(`Warning: Zero width detected for element, using default column width`);
        wPt = spToPt(startRecord.cwsp || 15456563);
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
 * Convert NDJSON file to marked-boxes.json format
 */
async function convertNdjsonToMarkedBoxes(inputFile, outputFile) {
    console.log(`Converting NDJSON: ${inputFile}`);

    // Parse the NDJSON file
    const records = parseNdjson(inputFile);
    console.log(`Parsed ${records.length} records from ${path.basename(inputFile)}`);

    // Group records by ID (not by page, to pair start/end markers)
    const groupedRecords = groupRecordsById(records);
    console.log(`Found ${Object.keys(groupedRecords).length} unique elements`);

    // Convert to marked boxes format
    const markedBoxes = [];
    let multiPageCount = 0;
    let singlePageCount = 0;

    for (const [itemId, itemRecords] of Object.entries(groupedRecords)) {
        // Split multi-page elements into segments
        const segments = splitMultiPageElement(itemRecords);
        
        if (!segments) {
            console.warn(`Skipping ${itemId} due to splitting error`);
            continue;
        }

        if (segments.length > 1) {
            multiPageCount++;
            console.log(`  📄 ${itemId}: ${segments.length} page segments`);
        } else {
            singlePageCount++;
        }

        // Calculate bounding box for each segment
        for (const segment of segments) {
            const bbox = calculateBoundingBox([segment.startRecord, segment.endRecord]);
            if (bbox) {
                markedBoxes.push(bbox);
            } else {
                console.warn(`  ⚠️  Failed to calculate bbox for ${itemId} on page ${segment.page}`);
            }
        }
    }

    // Sort by page and then by ID for consistent output
    markedBoxes.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.id.localeCompare(b.id);
    });

    // Write the result
    fs.writeFileSync(outputFile, JSON.stringify(markedBoxes, null, 2));

    console.log(`Converted to ${path.basename(outputFile)}`);
    console.log(`Generated ${markedBoxes.length} marked boxes (${singlePageCount} single-page, ${multiPageCount} multi-page)`);

    return outputFile;
}

module.exports = {
    spToPt,
    ptToMm,
    ptToPx,
    parseNdjson,
    groupRecordsById,
    splitMultiPageElement,
    calculateBoundingBox,
    convertNdjsonToMarkedBoxes
};
