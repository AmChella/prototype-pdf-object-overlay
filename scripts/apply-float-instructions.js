#!/usr/bin/env node
/**
 * Apply Float Processing Instructions to XML
 * 
 * This script adds or updates <?xmltex ?> processing instructions for figures and tables
 * after <ce:float-anchor> elements in XML files.
 * 
 * Usage:
 *   node apply-float-instructions.js <xml-file> [options]
 * 
 * Options:
 *   --type <figure|table|all>   Type of floats to process (default: all)
 *   --placement <t|b|h|p>       Placement option (default: t)
 *   --id <refid>                Process only specific float by refid
 *   --dry-run                   Show changes without modifying file
 *   --output <file>             Write to different file instead of modifying in place
 * 
 * Examples:
 *   node apply-float-instructions.js xml/EGG_100411.xml --placement b
 *   node apply-float-instructions.js xml/EGG_100411.xml --type figure --placement t
 *   node apply-float-instructions.js xml/EGG_100411.xml --id fig1 --placement h
 *   node apply-float-instructions.js xml/EGG_100411.xml --dry-run
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const options = {
        xmlFile: null,
        type: 'all',        // figure, table, or all
        placement: 't',     // t, b, h, p
        id: null,           // specific refid to process
        dryRun: false,
        output: null
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        
        if (arg === '--type' && args[i + 1]) {
            options.type = args[i + 1].toLowerCase();
            i += 2;
        } else if (arg === '--placement' && args[i + 1]) {
            options.placement = args[i + 1].toLowerCase();
            i += 2;
        } else if (arg === '--id' && args[i + 1]) {
            options.id = args[i + 1];
            i += 2;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
            i += 1;
        } else if (arg === '--output' && args[i + 1]) {
            options.output = args[i + 1];
            i += 2;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else if (!arg.startsWith('-') && !options.xmlFile) {
            options.xmlFile = arg;
            i += 1;
        } else {
            i += 1;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Apply Float Processing Instructions to XML

Usage:
  node apply-float-instructions.js <xml-file> [options]

Options:
  --type <figure|table|all>   Type of floats to process (default: all)
  --placement <t|b|h|p>       Placement option (default: t)
                              t = top, b = bottom, h = here, p = page of floats
  --id <refid>                Process only specific float by refid
  --dry-run                   Show changes without modifying file
  --output <file>             Write to different file instead of modifying in place

Examples:
  # Apply 'bottom' placement to all floats
  node apply-float-instructions.js xml/EGG_100411.xml --placement b

  # Apply 'top' placement to figures only
  node apply-float-instructions.js xml/EGG_100411.xml --type figure --placement t

  # Apply 'here' placement to specific figure
  node apply-float-instructions.js xml/EGG_100411.xml --id fig1 --placement h

  # Preview changes without modifying
  node apply-float-instructions.js xml/EGG_100411.xml --dry-run

Processing Instruction Format:
  Figures: <?xmltex {\\bgroup\\InsertFig{refid}{}{placement}\\egroup}?>
  Tables:  <?xmltex {\\bgroup\\InsertTable{refid}{}{placement}\\egroup}?>
`);
}

/**
 * Determine if a refid is a figure or table
 */
function getFloatType(refid) {
    if (refid.startsWith('fig')) {
        return 'figure';
    } else if (refid.startsWith('tbl')) {
        return 'table';
    }
    return 'unknown';
}

/**
 * Generate processing instruction for a float
 * For figures: InsertFig{id}{image}{}{placement}
 * For tables: InsertTable{id}{}{placement}
 */
function generatePI(refid, placement, existingImage = '') {
    const type = getFloatType(refid);
    if (type === 'figure') {
        // InsertFig has 4 arguments: {id}{image}{}{placement}
        return `<?xmltex {\\bgroup\\InsertFig{${refid}}{${existingImage}}{}{${placement}}\\egroup}?>`;
    } else if (type === 'table') {
        // InsertTable has 3 arguments: {id}{}{placement}
        return `<?xmltex {\\bgroup\\InsertTable{${refid}}{}{${placement}}\\egroup}?>`;
    }
    return null;
}

/**
 * Pattern to match existing processing instructions for figures and tables
 */
function createPIPattern(refid) {
    // Match: <?xmltex {\bgroup\InsertFig{refid}{...}{...}{placement}\egroup}?>
    // or:    <?xmltex {\bgroup\InsertTable{refid}{...}{placement}\egroup}?>
    const escapedRefid = refid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
        `<\\?xmltex\\s*\\{\\\\bgroup\\\\Insert(?:Fig|Table)\\{${escapedRefid}\\}\\{[^}]*\\}\\{[^}]*\\}\\\\egroup\\}\\s*\\?>`,
        'g'
    );
}

/**
 * Pattern to match float-anchor elements
 */
function createFloatAnchorPattern(refid = null) {
    if (refid) {
        const escapedRefid = refid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`<ce:float-anchor\\s+refid="${escapedRefid}"\\s*/>`, 'g');
    }
    return /<ce:float-anchor\s+refid="([^"]+)"\s*\/>/g;
}

/**
 * Apply processing instructions to XML content
 */
function applyInstructions(content, options) {
    const { type, placement, id } = options;
    const changes = [];
    
    // Find all float-anchor elements
    const floatAnchorPattern = /<ce:float-anchor\s+refid="([^"]+)"\s*\/>/g;
    let match;
    const floatAnchors = [];
    
    while ((match = floatAnchorPattern.exec(content)) !== null) {
        floatAnchors.push({
            fullMatch: match[0],
            refid: match[1],
            index: match.index,
            floatType: getFloatType(match[1])
        });
    }

    // Process each float anchor (in reverse order to maintain indices)
    let modifiedContent = content;
    const processedAnchors = [...floatAnchors].reverse();

    for (const anchor of processedAnchors) {
        const { refid, floatType, fullMatch, index } = anchor;
        
        // Skip if filtering by id and doesn't match
        if (id && refid !== id) {
            continue;
        }
        
        // Skip if filtering by type and doesn't match
        if (type !== 'all' && floatType !== type) {
            continue;
        }
        
        // Skip unknown types
        if (floatType === 'unknown') {
            console.warn(`⚠️  Skipping unknown float type: ${refid}`);
            continue;
        }

        // Find the position right after the float-anchor
        const anchorEndIndex = index + fullMatch.length;
        
        // Check if there's already a processing instruction after this anchor
        const textAfterAnchor = modifiedContent.substring(anchorEndIndex, anchorEndIndex + 300);
        
        // Match InsertFig{id}{image}{}{placement} or InsertTable{id}{}{placement}
        // InsertFig has 4 args, InsertTable has 3 args
        const figPIMatch = textAfterAnchor.match(
            /^(\s*)<\?xmltex\s*\{\\bgroup\\InsertFig\{[^}]+\}\{([^}]*)\}\{[^}]*\}\{([^}]*)\}\\egroup\}\s*\?>/
        );
        const tablePIMatch = textAfterAnchor.match(
            /^(\s*)<\?xmltex\s*\{\\bgroup\\InsertTable\{[^}]+\}\{[^}]*\}\{([^}]*)\}\\egroup\}\s*\?>/
        );
        
        const existingPIMatch = figPIMatch || tablePIMatch;
        const existingImage = figPIMatch ? figPIMatch[2] : '';
        const existingPlacement = figPIMatch ? figPIMatch[3] : (tablePIMatch ? tablePIMatch[2] : null);
        const existingWhitespace = existingPIMatch ? existingPIMatch[1] : '';

        if (existingPIMatch) {
            // Update existing PI
            if (existingPlacement === placement) {
                console.log(`   ℹ️  ${refid}: Already has placement '${placement}' - no change needed`);
                continue;
            }

            // Generate new PI preserving image name for figures
            const newPI = generatePI(refid, placement, existingImage);
            if (!newPI) continue;

            // Replace the existing PI
            const existingPIStart = anchorEndIndex + textAfterAnchor.indexOf('<?xmltex');
            const existingPIEnd = existingPIStart + existingPIMatch[0].length - existingWhitespace.length;
            
            modifiedContent = 
                modifiedContent.substring(0, existingPIStart) +
                newPI +
                modifiedContent.substring(existingPIEnd);
            
            changes.push({
                refid,
                type: floatType,
                action: 'updated',
                from: existingPlacement,
                to: placement
            });
            console.log(`   ✏️  ${refid}: Updated placement '${existingPlacement}' → '${placement}'`);
        } else {
            // Generate new PI for adding
            const newPI = generatePI(refid, placement);
            if (!newPI) continue;
            
            // Add new PI after the float-anchor
            // Check if there's text immediately after (like a period or closing tag)
            const immediateTextAfter = modifiedContent.substring(anchorEndIndex, anchorEndIndex + 10);
            
            // Insert the PI with appropriate spacing
            let insertion = '\n' + newPI;
            
            // If the next character is not whitespace or newline, just add directly
            if (immediateTextAfter.match(/^[^\s\n]/)) {
                insertion = newPI;
            }
            
            modifiedContent = 
                modifiedContent.substring(0, anchorEndIndex) +
                insertion +
                modifiedContent.substring(anchorEndIndex);
            
            changes.push({
                refid,
                type: floatType,
                action: 'added',
                placement
            });
            console.log(`   ➕ ${refid}: Added processing instruction with placement '${placement}'`);
        }
    }

    return { content: modifiedContent, changes };
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    const options = parseArgs(args);

    if (!options.xmlFile) {
        console.error('Error: No XML file specified');
        showHelp();
        process.exit(1);
    }

    // Validate placement option
    if (!['t', 'b', 'h', 'p'].includes(options.placement)) {
        console.error(`Error: Invalid placement '${options.placement}'. Must be one of: t, b, h, p`);
        process.exit(1);
    }

    // Validate type option
    if (!['figure', 'table', 'all'].includes(options.type)) {
        console.error(`Error: Invalid type '${options.type}'. Must be one of: figure, table, all`);
        process.exit(1);
    }

    // Read XML file
    const xmlPath = path.resolve(options.xmlFile);
    if (!fs.existsSync(xmlPath)) {
        console.error(`Error: File not found: ${xmlPath}`);
        process.exit(1);
    }

    console.log(`\n📄 Processing: ${path.basename(xmlPath)}`);
    console.log(`   Type: ${options.type}`);
    console.log(`   Placement: ${options.placement}`);
    if (options.id) {
        console.log(`   Filter ID: ${options.id}`);
    }
    if (options.dryRun) {
        console.log(`   Mode: DRY RUN (no changes will be saved)`);
    }
    console.log('');

    const content = fs.readFileSync(xmlPath, 'utf8');
    
    // Apply instructions
    const result = applyInstructions(content, options);

    if (result.changes.length === 0) {
        console.log('\n✅ No changes needed');
        return;
    }

    // Summary
    console.log(`\n📊 Summary:`);
    const added = result.changes.filter(c => c.action === 'added').length;
    const updated = result.changes.filter(c => c.action === 'updated').length;
    if (added > 0) console.log(`   Added: ${added}`);
    if (updated > 0) console.log(`   Updated: ${updated}`);

    if (options.dryRun) {
        console.log('\n⚠️  DRY RUN - No files were modified');
        return;
    }

    // Write output
    const outputPath = options.output ? path.resolve(options.output) : xmlPath;
    fs.writeFileSync(outputPath, result.content, 'utf8');
    console.log(`\n✅ Saved to: ${outputPath}`);
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = {
    applyInstructions,
    generatePI,
    getFloatType,
    parseArgs
};

