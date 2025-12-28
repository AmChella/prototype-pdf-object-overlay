
const fs = require('fs');
const crypto = require('crypto');

// Helper functions (internal to this module or imported if needed)
const spToPt = (sp) => Number(sp) / 65536;

const safeSpToPt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? spToPt(num) : null;
};

const parsePt = (s) => {
    if (s === undefined || s === null || s === '') return null;
    const parsed = parseFloat(String(s).replace(/pt$/, ''));
    return Number.isFinite(parsed) ? parsed : null;
};

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const DEFAULT_LINE_HEIGHT = 14;

function clusterColumnLefts(values) {
    const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    const clusters = [];
    const tolerance = 5; // pts
    for (const value of sorted) {
        let cluster = null;
        for (const existing of clusters) {
            if (Math.abs(existing.value - value) <= tolerance) {
                cluster = existing;
                break;
            }
        }
        if (!cluster) {
            clusters.push({ value, count: 1 });
        } else {
            cluster.value = (cluster.value * cluster.count + value) / (cluster.count + 1);
            cluster.count += 1;
        }
    }
    return clusters.map((c) => c.value).sort((a, b) => a - b);
}

function assignColumnIndex(xPt, columnLefts) {
    if (!Number.isFinite(xPt) || !columnLefts.length) return null;
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < columnLefts.length; i += 1) {
        const distance = Math.abs(columnLefts[i] - xPt);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
        }
    }
    return bestIndex;
}

function mergeQuads(quads) {
    if (!quads.length) return null;
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const quad of quads) {
        if (!Array.isArray(quad) || quad.length !== 8) continue;
        left = Math.min(left, quad[0], quad[6]);
        right = Math.max(right, quad[2], quad[4]);
        top = Math.min(top, quad[1], quad[3]);
        bottom = Math.max(bottom, quad[5], quad[7]);
    }
    if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
        return null;
    }
    return [left, top, right, top, right, bottom, left, bottom];
}

function generateGeometryFromMarks(marks, pdfPath, language = 'en') {
    const marksByPage = new Map();
    const elementMap = new Map();

    const getBaseRole = (role) => {
        if (role.startsWith('FIG')) return 'FIG';
        if (role.startsWith('TABLE')) return 'TABLE';
        if (role.startsWith('P')) return 'P';
        return role;
    };

    const getRecord = (id, baseRole) => {
        let rec = elementMap.get(id);
        if (!rec) {
            rec = { id, role: baseRole, starts: [], ends: [], lines: [] };
            elementMap.set(id, rec);
        }
        return rec;
    };

    for (const rawMark of marks) {
        if (!rawMark || typeof rawMark !== 'object') continue;
        const role = String(rawMark.role || '');
        const type = String(rawMark.type || '');
        
        let baseRole = role;
        let markType = type;
        
        if (role === 'P' && type === 'line') {
            baseRole = 'P';
            markType = 'line';
        } else if (/^(FIG|TABLE|P)-(start|end)$/.test(role)) {
            baseRole = getBaseRole(role);
            markType = role.endsWith('start') ? 'start' : 'end';
        } else {
            continue;
        }

        const pageIndex = (rawMark.page || 1) - 1;
        const pwPt = parsePt(rawMark.pw);
        const phPt = parsePt(rawMark.ph);
        const xPt = safeSpToPt(rawMark.xsp);
        const yPt = safeSpToPt(rawMark.ysp);
        const columnWidthPt = safeSpToPt(rawMark.cwsp);
        const textWidthPt = safeSpToPt(rawMark.twsp);
        const columnSepPt = safeSpToPt(rawMark.colsep);
        
        const wPt = safeSpToPt(rawMark.w);
        const hPt = safeSpToPt(rawMark.h);
        const dPt = safeSpToPt(rawMark.d);

        const mark = {
            id: rawMark.id,
            role: baseRole,
            type: markType,
            pageIndex,
            pageWidthPt: pwPt,
            pageHeightPt: phPt,
            xPt,
            yPt,
            rawYSp: Number(rawMark.ysp),
            columnWidthPt,
            textWidthPt,
            columnSepPt,
            wPt, hPt, dPt
        };

        if (!marksByPage.has(pageIndex)) marksByPage.set(pageIndex, []);
        marksByPage.get(pageIndex).push(mark);

        const record = getRecord(mark.id, baseRole);
        if (markType === 'start') {
            record.starts.push(mark);
        } else if (markType === 'end') {
            record.ends.push(mark);
        } else if (markType === 'line') {
            record.lines.push(mark);
        }
    }

    if (!marksByPage.size) {
        throw new Error('No usable TeX position marks were found.');
    }

    const pageMetaMap = new Map();

    for (const [pageIndex, markList] of marksByPage.entries()) {
        if (!markList.length) continue;
        const pageHeight = markList.find((m) => isFiniteNumber(m.pageHeightPt))?.pageHeightPt || null;
        const pageWidth = markList.find((m) => isFiniteNumber(m.pageWidthPt))?.pageWidthPt || null;
        for (const mark of markList) {
            if (isFiniteNumber(mark.yPt) && isFiniteNumber(pageHeight)) {
                mark.topCoord = pageHeight - mark.yPt;
            } else {
                mark.topCoord = null;
            }
        }

        let xValues = markList
            .filter((m) => m.type === 'start' && Number.isFinite(m.xPt))
            .map((m) => m.xPt);
        if (!xValues.length) {
            xValues = markList.map((m) => m.xPt).filter((v) => Number.isFinite(v));
        }
        let columnLefts = clusterColumnLefts(xValues);
        if (!columnLefts.length && Number.isFinite(pageWidth)) {
            columnLefts = [72];
        }

        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const columnWidthAvg = avg(markList.map((m) => m.columnWidthPt).filter(isFiniteNumber));
        const textWidthAvg = avg(markList.map((m) => m.textWidthPt).filter(isFiniteNumber));
        const columnSepAvg = avg(markList.map((m) => m.columnSepPt).filter(isFiniteNumber));

        markList.forEach((mark) => {
            mark.columnIndex = assignColumnIndex(mark.xPt, columnLefts);
        });

        const columns = columnLefts.map((left, idx) => ({
            index: idx,
            left,
            width: columnWidthAvg,
            events: []
        }));

        for (const mark of markList) {
            if (mark.columnIndex !== null && columns[mark.columnIndex]) {
                columns[mark.columnIndex].events.push(mark);
            }
        }

        for (let c = 0; c < columns.length; c += 1) {
            const column = columns[c];
            column.events.sort((a, b) => {
                const ay = Number.isFinite(a.rawYSp) ? a.rawYSp : -Infinity;
                const by = Number.isFinite(b.rawYSp) ? b.rawYSp : -Infinity;
                return by - ay;
            });
            const topValues = column.events.map((ev) => ev.topCoord).filter(isFiniteNumber);
            column.columnTop = topValues.length ? Math.min(...topValues) : 0;
            const topMax = topValues.length ? Math.max(...topValues) : (isFiniteNumber(pageHeight) ? pageHeight - 72 : DEFAULT_LINE_HEIGHT * 4);
            const bottomBase = isFiniteNumber(pageHeight) ? Math.min(pageHeight, topMax + DEFAULT_LINE_HEIGHT) : topMax + DEFAULT_LINE_HEIGHT;
            column.columnBottom = bottomBase;

            if (!isFiniteNumber(column.width)) {
                if (columns.length > 1 && c < columns.length - 1) {
                    const gap = columns[c + 1].left - column.left;
                    column.width = columnSepAvg ? Math.max(10, gap - columnSepAvg) : gap - 10;
                } else if (isFiniteNumber(textWidthAvg) && columns.length) {
                    const totalSep = columnSepAvg ? columnSepAvg * (columns.length - 1) : 0;
                    column.width = (textWidthAvg - totalSep) / Math.max(1, columns.length);
                } else if (isFiniteNumber(columnWidthAvg)) {
                    column.width = columnWidthAvg;
                } else if (isFiniteNumber(pageWidth)) {
                    column.width = pageWidth - 144; // assume 1in margins
                } else {
                    column.width = 200;
                }
            }

            for (let i = 0; i < column.events.length; i += 1) {
                const event = column.events[i];
                const nextEvent = column.events[i + 1];
                let nextTop = column.columnBottom;
                if (nextEvent && isFiniteNumber(nextEvent.topCoord)) {
                    nextTop = nextEvent.topCoord;
                }
                if (!isFiniteNumber(nextTop)) {
                    nextTop = isFiniteNumber(event.topCoord) ? event.topCoord + DEFAULT_LINE_HEIGHT : DEFAULT_LINE_HEIGHT;
                }
                if (isFiniteNumber(event.topCoord) && nextTop <= event.topCoord) {
                    nextTop = event.topCoord + DEFAULT_LINE_HEIGHT;
                }
                event.nextTop = nextTop;
            }
        }

        pageMetaMap.set(pageIndex, {
            pageHeight,
            pageWidth,
            columns,
            columnSep: columnSepAvg,
            columnWidth: columnWidthAvg,
            textWidth: textWidthAvg
        });
    }

    const segmentFromEvent = (event) => {
        if (!event) return null;
        const pageMeta = pageMetaMap.get(event.pageIndex);
        if (!pageMeta) return null;
        const column = (event.columnIndex !== null) ? pageMeta.columns[event.columnIndex] : null;
        if (!column) return null;
        const left = column.left;
        const width = column.width;
        if (!isFiniteNumber(left) || !isFiniteNumber(width)) return null;
        const right = left + width;
        const top = isFiniteNumber(event.topCoord) ? event.topCoord : column.columnTop;
        let bottom = isFiniteNumber(event.nextTop) ? event.nextTop : column.columnBottom;
        if (!isFiniteNumber(bottom)) {
            bottom = top + DEFAULT_LINE_HEIGHT;
        }
        if (bottom <= top) bottom = top + DEFAULT_LINE_HEIGHT;
        const quad = [left, top, right, top, right, bottom, left, bottom];
        return {
            pageIndex: event.pageIndex,
            columnIndex: event.columnIndex,
            left,
            right,
            width,
            top,
            bottom,
            quad
        };
    };

    const pagesMap = new Map();

    for (const record of elementMap.values()) {
        const segmentsByPage = new Map();

        if (record.lines && record.lines.length > 0) {
            for (const line of record.lines) {
                if (!isFiniteNumber(line.xPt) || !isFiniteNumber(line.yPt)) continue;
                const pageMeta = pageMetaMap.get(line.pageIndex);
                const pageHeight = (pageMeta && isFiniteNumber(pageMeta.pageHeight)) ? pageMeta.pageHeight : (line.pageHeightPt || 842);
                
                const left = line.xPt;
                const width = line.wPt || 0;
                const right = left + width;
                
                const h = line.hPt || 10;
                const d = line.dPt || 0;
                
                const top = pageHeight - (line.yPt + h);
                const bottom = pageHeight - (line.yPt - d);
                
                const quad = [left, top, right, top, right, bottom, left, bottom];
                
                const seg = {
                    pageIndex: line.pageIndex,
                    columnIndex: 0,
                    left, right, width, top, bottom, quad
                };
                
                if (!segmentsByPage.has(line.pageIndex)) segmentsByPage.set(line.pageIndex, []);
                segmentsByPage.get(line.pageIndex).push(seg);
            }
        } else {
            const coveredColumns = new Map();

            for (const startEvent of record.starts) {
                const seg = segmentFromEvent(startEvent);
                if (!seg) continue;
                if (!segmentsByPage.has(seg.pageIndex)) segmentsByPage.set(seg.pageIndex, []);
                segmentsByPage.get(seg.pageIndex).push(seg);
                if (!coveredColumns.has(seg.pageIndex)) coveredColumns.set(seg.pageIndex, new Set());
                coveredColumns.get(seg.pageIndex).add(seg.columnIndex);
            }

            for (const endEvent of record.ends) {
                const covered = coveredColumns.get(endEvent.pageIndex);
                if (covered && covered.has(endEvent.columnIndex)) continue;
                const seg = segmentFromEvent(endEvent);
                if (!seg) continue;
                if (!segmentsByPage.has(seg.pageIndex)) segmentsByPage.set(seg.pageIndex, []);
                segmentsByPage.get(seg.pageIndex).push(seg);
            }
        }

        for (const [pageIndex, segments] of segmentsByPage.entries()) {
            if (!segments.length) continue;
            const quads = segments.map((seg) => seg.quad).filter(Boolean);
            if (!quads.length) continue;
            const paragraphQuad = mergeQuads(quads);
            const element = {
                id: record.id,
                role: record.role,
                lang: language,
                quads,
                columnSegments: segments.map((seg) => ({
                    columnIndex: seg.columnIndex,
                    columnLeftPt: Number(seg.left.toFixed(4)),
                    columnRightPt: Number(seg.right.toFixed(4)),
                    columnWidthPt: Number(seg.width.toFixed(4)),
                    topPt: Number(seg.top.toFixed(4)),
                    bottomPt: Number(seg.bottom.toFixed(4))
                }))
            };
            if (paragraphQuad) {
                element.paragraphQuad = paragraphQuad;
            }
            const primarySegment = segments[0];
            if (primarySegment) {
                element.columnIndex = primarySegment.columnIndex;
                element.columnLeftPt = Number(primarySegment.left.toFixed(4));
                element.columnRightPt = Number(primarySegment.right.toFixed(4));
                element.columnWidthPt = Number(primarySegment.width.toFixed(4));
            }
            const pageMeta = pageMetaMap.get(pageIndex);
            if (pageMeta && pageMeta.columns && pageMeta.columns.length > 1) {
                element.twoColumnLayout = true;
                if (isFiniteNumber(pageMeta.columnSep)) {
                    element.columnSepPt = Number(pageMeta.columnSep.toFixed(4));
                }
                if (isFiniteNumber(pageMeta.textWidth)) {
                    element.textWidthPt = Number(pageMeta.textWidth.toFixed(4));
                }
            }
            if (!pagesMap.has(pageIndex)) pagesMap.set(pageIndex, []);
            pagesMap.get(pageIndex).push(element);
        }
    }

    if (!pagesMap.size) {
        throw new Error('Unable to derive geometry segments from TeX marks.');
    }

    const pageIndices = Array.from(pagesMap.keys()).sort((a, b) => a - b);
    const pages = pageIndices.map((idx) => ({ index: idx, elements: pagesMap.get(idx) }));
    
    // Hash the PDF
    const pdfBuf = fs.readFileSync(pdfPath);
    const docId = crypto.createHash('sha256').update(pdfBuf).digest('hex');
    
    return { pdfGeometryV1: { docId, pages } };
}

module.exports = {
    generateGeometryFromMarks
};
