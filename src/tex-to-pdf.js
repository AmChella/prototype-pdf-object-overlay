#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HELP_FLAGS = new Set(['--help', '-h']);

const { extractElementIdQueues } = require('./tex-parser');
const { generateGeometryFromMarks } = require('./tex-geometry');
const { convertNdjsonToMarkedBoxes } = require('./ndjson-utils');

function printUsage() {
    console.log(`Usage: node src/tex-to-pdf.js <input.tex> [output-directory|output.pdf] [options]\n` +
        `Options:\n` +
        `  --keep-aux        Preserve auxiliary files (.aux, .log, .toc, .out, .synctex.gz)\n` +
        `  --shell-escape    Enable LaTeX shell escape (passes --shell-escape to lualatex)\n` +
        `  --geometry-json <path>  Emit layout geometry JSON to the provided path\n` +
        `                         (defaults to <jobname>-geometry.json next to the PDF)\n` +
        `  --geometry-grouping <mode>  Set grouping mode: 'default' (current) or 'strict'\n` +
        `  --no-geometry     Skip geometry JSON generation\n` +
        `  --marked-boxes    Generate marked-boxes JSON from NDJSON coordinates\n` +
        `  --convert-ndjson  Convert NDJSON to marked-boxes format (alias for --marked-boxes)\n` +
        `  --sync-aux        Sync coordinates from aux file for perfect accuracy (recommended)\n` +
        `  --sync-from-aux   Alias for --sync-aux\n` +
        `  --lang <code>     Set the language code for geometry metadata (default: en)\n` +
        `  -h, --help        Show this help text\n` +
        `Examples:\n` +
        `  node src/tex-to-pdf.js output.tex\n` +
        `  node src/tex-to-pdf.js output.tex dist/\n` +
        `  node src/tex-to-pdf.js output.tex dist/final.pdf --keep-aux\n` +
        `  node src/tex-to-pdf.js output.tex --geometry-json build/layout.json\n` +
        `  node src/tex-to-pdf.js output.tex --marked-boxes --sync-aux`);
}

function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function runLatex(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn('lualatex', args, { cwd, stdio: 'inherit' });

        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('lualatex command not found. Please ensure LuaLaTeX is installed and available in PATH.'));
            } else {
                reject(error);
            }
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`LuaLaTeX exited with code ${code}.`));
            }
        });
    });
}

function sanitizeArgs(rawArgs) {
    const fileArgs = [];
    const flags = {
        keepAux: false,
        shellEscape: false,
        help: false,
        emitGeometry: true,
        geometryPath: null,
        language: 'en',
        geometryGrouping: null, // 'strict' or null
        markedBoxes: false,
        convertNdjson: false,
        syncAux: true,  // Enable by default for accurate coordinate extraction
        syncFromAux: true  // Enable by default for accurate coordinate extraction
    };

    for (let i = 0; i < rawArgs.length; i += 1) {
        const arg = rawArgs[i];

        if (HELP_FLAGS.has(arg)) {
            flags.help = true;
            continue;
        }
        if (arg === '--keep-aux') {
            flags.keepAux = true;
            continue;
        }
        if (arg === '--shell-escape') {
            flags.shellEscape = true;
            continue;
        }
        if (arg === '--no-geometry') {
            flags.emitGeometry = false;
            continue;
        }
        if (arg === '--marked-boxes') {
            flags.markedBoxes = true;
            continue;
        }
        if (arg === '--convert-ndjson') {
            flags.convertNdjson = true;
            continue;
        }
        if (arg === '--sync-aux') {
            flags.syncAux = true;
            continue;
        }
        if (arg === '--sync-from-aux') {
            flags.syncFromAux = true;
            continue;
        }
        if (arg === '--geometry-json') {
            const next = rawArgs[i + 1];
            if (!next || next.startsWith('--')) {
                console.error('Error: --geometry-json requires a file path.');
                process.exit(1);
            }
            flags.geometryPath = next;
            i += 1;
            continue;
        }
        if (arg === '--geometry-grouping') {
            const next = rawArgs[i + 1];
            if (!next || next.startsWith('--') || !['default', 'strict'].includes(next)) {
                console.error("Error: --geometry-grouping requires 'default' or 'strict'.");
                process.exit(1);
            }
            flags.geometryGrouping = next;
            i += 1;
            continue;
        }
        if (arg.startsWith('--geometry-json=')) {
            const value = arg.split('=').slice(1).join('=');
            if (!value) {
                console.error('Error: --geometry-json requires a file path.');
                process.exit(1);
            }
            flags.geometryPath = value;
            continue;
        }
        if (arg.startsWith('--geometry-grouping=')) {
            const value = arg.split('=').slice(1).join('=');
            if (!['default', 'strict'].includes(value)) {
                console.error("Error: --geometry-grouping must be 'default' or 'strict'.");
                process.exit(1);
            }
            flags.geometryGrouping = value;
            continue;
        }
        if (arg === '--lang') {
            const next = rawArgs[i + 1];
            if (!next || next.startsWith('--')) {
                console.error('Error: --lang requires a language code (e.g., en).');
                process.exit(1);
            }
            flags.language = next;
            i += 1;
            continue;
        }
        if (arg.startsWith('--lang=')) {
            const value = arg.split('=').slice(1).join('=');
            if (!value) {
                console.error('Error: --lang requires a language code (e.g., en).');
                process.exit(1);
            }
            flags.language = value;
            continue;
        }

        fileArgs.push(arg);
    }

    return { fileArgs, flags };
}

function resolveOutputPaths(texPath, targetPath) {
    const texDir = path.dirname(texPath);
    const texBase = path.basename(texPath, path.extname(texPath));

    if (!targetPath) {
        return {
            workingDir: texDir,
            outputDir: texDir,
            jobName: texBase
        };
    }

    const resolvedTarget = path.resolve(targetPath);
    const targetExt = path.extname(resolvedTarget).toLowerCase();

    if (targetExt === '.pdf') {
        ensureDirectory(path.dirname(resolvedTarget));
        return {
            workingDir: texDir,
            outputDir: path.dirname(resolvedTarget),
            jobName: path.basename(resolvedTarget, targetExt)
        };
    }

    // Treat as directory target
    ensureDirectory(resolvedTarget);
    return {
        workingDir: texDir,
        outputDir: resolvedTarget,
        jobName: texBase
    };
}

function cleanAuxiliaryFiles(outputDir, jobName) {
    const extensions = ['.aux', '.log', '.out', '.toc'];
    const additionalFiles = [`${jobName}.synctex.gz`];

    for (const ext of extensions) {
        const filePath = path.join(outputDir, `${jobName}${ext}`);
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
        }
    }

    for (const file of additionalFiles) {
        const filePath = path.join(outputDir, file);
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (err) { /* ignore */ }
        }
    }
}

async function main() {
    const rawArgs = process.argv.slice(2);
    const { fileArgs, flags } = sanitizeArgs(rawArgs);

    if (flags.help || fileArgs.length === 0) {
        printUsage();
        process.exit(flags.help ? 0 : 1);
    }

    const [texFile, outputTarget] = fileArgs;

    // Handle special case for NDJSON conversion
    if (flags.convertNdjson) {
        if (!texFile.endsWith('.ndjson')) {
            console.error('Error: When using --convert-ndjson, input file must be a .ndjson file.');
            process.exit(1);
        }

        const ndjsonPath = path.resolve(texFile);
        if (!fs.existsSync(ndjsonPath) || !fs.statSync(ndjsonPath).isFile()) {
            console.error(`Error: NDJSON file not found at ${ndjsonPath}`);
            process.exit(1);
        }

        const markedBoxesPath = outputTarget
            ? path.resolve(outputTarget)
            : ndjsonPath.replace('.ndjson', '-marked-boxes.json');

        await convertNdjsonToMarkedBoxes(ndjsonPath, markedBoxesPath);
        console.log(`Successfully converted ${path.basename(ndjsonPath)} to ${path.basename(markedBoxesPath)}`);
        process.exit(0);
    }

    if (!texFile.endsWith('.tex')) {
        console.error('Error: Input file must be a .tex file.');
        process.exit(1);
    }

    const resolvedTexFile = path.resolve(texFile);
    if (!fs.existsSync(resolvedTexFile) || !fs.statSync(resolvedTexFile).isFile()) {
        console.error(`Error: TeX file not found at ${resolvedTexFile}`);
        process.exit(1);
    }

    const { workingDir, outputDir, jobName } = resolveOutputPaths(resolvedTexFile, outputTarget);

    const pdfPath = path.join(outputDir, `${jobName}.pdf`);

    const latexArgs = [
        '-interaction=nonstopmode',
        '-halt-on-error',
        `-output-directory=${outputDir}`,
        `-jobname=${jobName}`,
        path.basename(resolvedTexFile)
    ];

    if (flags.shellEscape) {
        latexArgs.splice(2, 0, '--shell-escape');
    }

    let texSource = null;
    try {
        texSource = fs.readFileSync(resolvedTexFile, 'utf8');
    } catch (readErr) {
        console.error(`Error: Unable to read TeX source at ${resolvedTexFile}`);
        console.error(readErr.message);
        process.exit(1);
    }

    const idQueues = extractElementIdQueues(texSource);

    try {
        const start = Date.now();

        // First pass: Initial compilation
        console.log('Pass 1/3: Initial compilation...');
        await runLatex(latexArgs, workingDir);

        // If TeX positions NDJSON is produced, run 2 more passes for accurate page numbers
        const texPosCandidate = path.join(outputDir, `${jobName}-texpos.ndjson`);
        const texPosCandidateOut = path.join(outputDir, `${jobName}-texpos.ndjson`);
        const texPosCandidateCwd = path.join(workingDir, `${jobName}-texpos.ndjson`);
        if (fs.existsSync(texPosCandidate) || fs.existsSync(texPosCandidateOut) || fs.existsSync(texPosCandidateCwd)) {
            console.log('Pass 2/3: Updating cross-references...');
            try { await runLatex(latexArgs, workingDir); } catch (_) { }

            console.log('Pass 3/3: Finalizing positions for accurate page numbers...');
            try { await runLatex(latexArgs, workingDir); } catch (_) { }
        }
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);

        if (!fs.existsSync(pdfPath)) {
            throw new Error(`Expected PDF not found at ${pdfPath}`);
        }

        if (flags.emitGeometry) {
            const geometryTarget = flags.geometryPath
                ? path.resolve(flags.geometryPath)
                : path.join(outputDir, `${jobName}-geometry.json`);
            const geometryDir = path.dirname(geometryTarget);
            ensureDirectory(geometryDir);

            // Prefer TeX-produced positions if available; fall back to PDF parsing
            const texPosPathOut = path.join(outputDir, `${jobName}-texpos.ndjson`);
            const texPosPathCwd = path.join(workingDir, `${jobName}-texpos.ndjson`);
            let usedTexPos = false;
            let marks = null;
            if (fs.existsSync(texPosPathOut) || fs.existsSync(texPosPathCwd)) {
                try {
                    const candidate = fs.existsSync(texPosPathOut) ? texPosPathOut : texPosPathCwd;
                    const lines = fs.readFileSync(candidate, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    if (lines.length > 0) {
                        marks = lines.map(l => JSON.parse(l));
                    } else {
                        marks = null;
                    }
                } catch (e) {
                    marks = null;
                }
            }
            // Fallback to parsing .log for GEOM lines
            if (!marks) {
                const logPath = path.join(outputDir, `${jobName}.log`);
                if (fs.existsSync(logPath)) {
                    const logText = fs.readFileSync(logPath, 'utf8');
                    const geomLines = logText.split(/\r?\n/).filter(l => l.startsWith('GEOM: '));
                    if (geomLines.length) {
                        try {
                            marks = geomLines.map(l => JSON.parse(l.substring(6)));
                        } catch (e) {
                            marks = null;
                        }
                    }
                }
            }
            if (marks) {
                try {
                    const geometryData = generateGeometryFromMarks(marks, pdfPath, flags.language);
                    fs.writeFileSync(geometryTarget, JSON.stringify(geometryData, null, 2));
                    console.log(`Geometry JSON written: ${geometryTarget}`);
                    usedTexPos = true;
                } catch (e) {
                    console.error('Failed to generate geometry from TeX positions; falling back to PDF parsing.');
                    console.error(e.message);
                }
            }

            if (!usedTexPos) {
                try {
                    const { extractPdfGeometry } = require('./pdf-geometry');
                    const geometryOptions = { language: flags.language };
                    if (flags.geometryGrouping) geometryOptions.groupingMode = flags.geometryGrouping;
                    if (idQueues) {
                        geometryOptions.idQueues = idQueues;
                    }
                    const geometryData = await extractPdfGeometry(pdfPath, geometryOptions);
                    fs.writeFileSync(geometryTarget, JSON.stringify(geometryData, null, 2));
                    console.log(`Geometry JSON written: ${geometryTarget}`);
                } catch (geometryError) {
                    console.error('Failed to generate geometry JSON.');
                    console.error(geometryError.message);
                    process.exit(1);
                }
            }
        }

        // Convert NDJSON to marked-boxes format if requested
        if (flags.markedBoxes || flags.convertNdjson) {
            const ndjsonPath = path.join(outputDir, `${jobName}-texpos.ndjson`);
            if (fs.existsSync(ndjsonPath)) {
                try {
                    const markedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes.json`);
                    await convertNdjsonToMarkedBoxes(ndjsonPath, markedBoxesPath);
                    console.log(`Marked boxes JSON generated: ${markedBoxesPath}`);
                } catch (convertError) {
                    console.error('Failed to convert NDJSON to marked-boxes format:');
                    console.error(convertError.message);
                }
            }
        }

        // Sync coordinates from aux file for perfect accuracy (if requested)
        if (flags.syncFromAux || flags.syncAux) {
            const auxPath = path.join(outputDir, `${jobName}.aux`);
            if (fs.existsSync(auxPath)) {
                try {
                    console.log('\n📍 Syncing coordinates from aux file for perfect accuracy...');
                    const { parseAuxFile, generateNdjson, generateMarkedBoxes, readPositionsFromNdjson, getPageDimensions, getColumnSettings } = require(path.join(__dirname, '../scripts/external/sync_from_aux.js'));

                    const ndjsonPath = path.join(outputDir, `${jobName}-texpos.ndjson`);
                    const markedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes.json`);

                    // Try to read LaTeX-generated NDJSON first (which has type field)
                    let positions = readPositionsFromNdjson(ndjsonPath);

                    if (!positions || positions.length === 0) {
                        // Fallback: Parse aux file if NDJSON doesn't exist or is empty
                        console.log('LaTeX-generated NDJSON not found, parsing aux file as fallback...');
                        const pageDimensions = getPageDimensions(auxPath, ndjsonPath);
                        const columnSettings = getColumnSettings(ndjsonPath);
                        positions = parseAuxFile(auxPath);

                        if (positions.length > 0) {
                            // Generate NDJSON from aux file (without type field)
                            generateNdjson(positions, pageDimensions, columnSettings, ndjsonPath);
                            // Re-read to get proper positions
                            positions = readPositionsFromNdjson(ndjsonPath) || positions;
                        }
                    } else {
                        console.log(`=== Using LaTeX-generated NDJSON with type information ===`);
                        console.log(`Found ${positions.length} position records`);
                    }

                    if (positions.length > 0) {
                        const pageDimensions = getPageDimensions(auxPath, ndjsonPath);
                        const columnSettings = getColumnSettings(ndjsonPath);
                        generateMarkedBoxes(positions, pageDimensions, markedBoxesPath, columnSettings);
                        console.log('✅ Coordinates synchronized from aux file with multi-column/page splitting');
                    } else {
                        console.warn('⚠️  No position data found - skipping sync');
                    }
                } catch (syncError) {
                    console.error('⚠️  Failed to sync coordinates from aux file:');
                    console.error(syncError.message);
                    console.log('📝 You can manually sync later with: node scripts/external/sync_from_aux.js ' + auxPath);
                }
            } else {
                console.warn('⚠️  Aux file not found - skipping coordinate sync');
            }
        }

        // Convert line-level NDJSON to paragraph overlays (if line-level data exists)
        const linesNdjsonPath = path.join(outputDir, `${jobName}-texpos-lines.ndjson`);
        const markedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes.json`);
        if (fs.existsSync(linesNdjsonPath)) {
            try {
                console.log('\n📏 Converting line-level coordinates to paragraph overlays...');
                const { convertLinesToOverlays } = require(path.join(__dirname, '../scripts/external/lines_to_overlays.js'));

                // Generate line-based overlays
                const linesMarkedBoxesPath = path.join(outputDir, `${jobName}-marked-boxes-lines.json`);
                convertLinesToOverlays(linesNdjsonPath, linesMarkedBoxesPath);

                // Merge with existing marked-boxes.json (floats from sync_from_aux)
                let existingBoxes = [];
                if (fs.existsSync(markedBoxesPath)) {
                    try {
                        existingBoxes = JSON.parse(fs.readFileSync(markedBoxesPath, 'utf8'));
                        // Keep only non-paragraph items (figures, tables)
                        existingBoxes = existingBoxes.filter(box =>
                            box.type === 'figure' || box.type === 'table' ||
                            box.id?.startsWith('fig') || box.id?.startsWith('tbl')
                        );
                        console.log(`   📦 Keeping ${existingBoxes.length} float overlays from existing file`);
                    } catch (e) {
                        existingBoxes = [];
                    }
                }

                // Read line-based paragraph overlays
                const lineBoxes = JSON.parse(fs.readFileSync(linesMarkedBoxesPath, 'utf8'));
                console.log(`   📝 Generated ${lineBoxes.length} paragraph overlays from line data`);

                // Merge: floats + paragraphs
                const mergedBoxes = [...existingBoxes, ...lineBoxes];

                // Sort by page then y position
                mergedBoxes.sort((a, b) => {
                    if (a.page !== b.page) return a.page - b.page;
                    return (a.y_pt || 0) - (b.y_pt || 0);
                });

                // Write merged result
                fs.writeFileSync(markedBoxesPath, JSON.stringify(mergedBoxes, null, 2));
                console.log(`✅ Merged ${mergedBoxes.length} total overlays to ${path.basename(markedBoxesPath)}`);

            } catch (lineConvertError) {
                console.error('⚠️  Failed to convert line-level data:');
                console.error(lineConvertError.message);
            }
        }

        if (!flags.keepAux) {
            cleanAuxiliaryFiles(outputDir, jobName);
        }

        console.log(`\nPDF generated: ${pdfPath}`);
        console.log(`Compilation time: ${elapsed}s`);
    } catch (error) {
        console.error(`\nFailed to compile ${resolvedTexFile}`);
        console.error(error.message);
        process.exit(1);
    }
}


if (require.main === module) {
    main();
}