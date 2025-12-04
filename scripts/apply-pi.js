#!/usr/bin/env node
/**
 * Apply Processing Instructions to XML
 * 
 * This script applies processing instructions to XML files based on PI type
 * configurations. PI types define templates, and documents are mapped to
 * use specific PI types.
 * 
 * Usage:
 *   node apply-pi.js <xml-file> [options]
 * 
 * Options:
 *   --config <file>            PI types config (default: config/pi-types.json)
 *   --document <id>            Document ID for mapping (auto-detected from filename if not specified)
 *   --type <figure|table|all>  Float type to process (default: all)
 *   --placement <t|b|h|p>      Placement option (required)
 *   --id <refid>               Process only specific float
 *   --dry-run                  Show changes without modifying
 *   --output <file>            Output to different file
 *   --list-pi-types            List available PI types
 *   --list-documents           List configured documents
 * 
 * Examples:
 *   # Apply 'bottom' placement to all figures
 *   node apply-pi.js xml/EGG_100411.xml --type figure --placement b
 * 
 *   # Apply 'top' placement to specific table
 *   node apply-pi.js xml/EGG_100411.xml --id tbl1 --placement t
 * 
 *   # Preview changes
 *   node apply-pi.js xml/EGG_100411.xml --type all --placement h --dry-run
 */

const fs = require('fs');
const path = require('path');

// Default config path
const DEFAULT_CONFIG = path.join(__dirname, '../config/pi-types.json');

/**
 * Load PI types configuration
 */
function loadConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        console.error(`Error: Config file not found: ${configPath}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Get document ID from filename
 */
function getDocumentIdFromFilename(xmlPath) {
    const basename = path.basename(xmlPath, '.xml');
    // Remove common suffixes like -generated, -processed, etc.
    return basename.replace(/-generated|-processed|-output/g, '');
}

/**
 * Get float type from refid
 */
function getFloatType(refid) {
    if (refid.startsWith('fig')) return 'figure';
    if (refid.startsWith('tbl')) return 'table';
    return 'unknown';
}

/**
 * Get PI type config for a float
 */
function getPITypeForFloat(config, documentId, floatType) {
    // Get document mapping (or default)
    const docMapping = config.documentMappings[documentId] || config.documentMappings.default;
    if (!docMapping) {
        return null;
    }
    
    // Get PI type name for this float type
    const piTypeName = docMapping[floatType];
    if (!piTypeName) {
        return null;
    }
    
    // Get PI type config
    return config.piTypes[piTypeName];
}

/**
 * Generate processing instruction from template
 */
function generatePI(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\$${key}`, 'g'), value);
    }
    return result;
}

/**
 * Find all float anchors in XML
 */
function findFloatAnchors(content, namespacePrefix = 'ce:') {
    // Match both ce:float-anchor and float-anchor
    const pattern = new RegExp(`<(?:${namespacePrefix})?float-anchor\\s+refid="([^"]+)"\\s*/>`, 'g');
    const anchors = [];
    let match;
    while ((match = pattern.exec(content)) !== null) {
        anchors.push({
            fullMatch: match[0],
            refid: match[1],
            index: match.index,
            floatType: getFloatType(match[1])
        });
    }
    return anchors;
}

/**
 * Extract existing PI info after a float anchor
 */
function extractExistingPI(content, anchorEndIndex) {
    const textAfter = content.substring(anchorEndIndex, anchorEndIndex + 400);
    
    // Match InsertFig{id}{image}{}{placement}
    const figMatch = textAfter.match(
        /^(\s*)<\?xmltex\s*\{\\bgroup\\InsertFig\{([^}]+)\}\{([^}]*)\}\{[^}]*\}\{([^}]*)\}\\egroup\}\s*\?>/
    );
    if (figMatch) {
        return {
            type: 'elsevier-insert-figure',
            whitespace: figMatch[1],
            fullMatch: figMatch[0],
            id: figMatch[2],
            image: figMatch[3],
            placement: figMatch[4]
        };
    }
    
    // Match InsertTable{id}{}{placement}
    const tableMatch = textAfter.match(
        /^(\s*)<\?xmltex\s*\{\\bgroup\\InsertTable\{([^}]+)\}\{[^}]*\}\{([^}]*)\}\\egroup\}\s*\?>/
    );
    if (tableMatch) {
        return {
            type: 'elsevier-insert-table',
            whitespace: tableMatch[1],
            fullMatch: tableMatch[0],
            id: tableMatch[2],
            placement: tableMatch[3]
        };
    }
    
    // Match standard figure/table
    const stdMatch = textAfter.match(
        /^(\s*)<\?xmltex\s*\\begin\{(figure|table)\}\[([^\]]*)\].*?\\end\{\2\}\s*\?>/
    );
    if (stdMatch) {
        return {
            type: `standard-${stdMatch[2]}`,
            whitespace: stdMatch[1],
            fullMatch: stdMatch[0],
            placement: stdMatch[3]
        };
    }
    
    return null;
}

/**
 * Apply processing instructions to XML
 */
function applyPIs(content, config, options) {
    const { documentId, floatType, placement, targetId } = options;
    const changes = [];
    
    // Find all float anchors
    const anchors = findFloatAnchors(content);
    
    // Process in reverse order to maintain indices
    let modifiedContent = content;
    const processOrder = [...anchors].reverse();
    
    for (const anchor of processOrder) {
        const { refid, fullMatch, index, floatType: anchorFloatType } = anchor;
        
        // Skip if filtering by id
        if (targetId && refid !== targetId) continue;
        
        // Skip if filtering by type
        if (floatType !== 'all' && anchorFloatType !== floatType) continue;
        
        // Skip unknown types
        if (anchorFloatType === 'unknown') {
            console.warn(`   ⚠️  Skipping unknown float type: ${refid}`);
            continue;
        }
        
        // Get PI type config for this float
        const piType = getPITypeForFloat(config, documentId, anchorFloatType);
        if (!piType) {
            console.warn(`   ⚠️  No PI type configured for ${anchorFloatType} in document ${documentId}`);
            continue;
        }
        
        const anchorEndIndex = index + fullMatch.length;
        const existingPI = extractExistingPI(modifiedContent, anchorEndIndex);
        
        if (existingPI) {
            // Check if placement already matches
            if (existingPI.placement === placement) {
                console.log(`   ℹ️  ${refid}: Already has placement '${placement}' - no change`);
                continue;
            }
            
            // Generate new PI with updated placement, preserving existing values
            const variables = {
                id: refid,
                placement: placement,
                image: existingPI.image || ''
            };
            const newPI = generatePI(piType.template, variables);
            
            // Replace existing PI
            const piStart = anchorEndIndex + modifiedContent.substring(anchorEndIndex).indexOf('<?xmltex');
            const piEnd = piStart + existingPI.fullMatch.length - existingPI.whitespace.length;
            
            modifiedContent = 
                modifiedContent.substring(0, piStart) +
                newPI +
                modifiedContent.substring(piEnd);
            
            changes.push({
                refid,
                type: anchorFloatType,
                action: 'updated',
                from: existingPI.placement,
                to: placement
            });
            console.log(`   ✏️  ${refid}: Updated placement '${existingPI.placement}' → '${placement}'`);
        } else {
            // Add new PI
            const variables = {
                id: refid,
                placement: placement,
                image: ''
            };
            const newPI = generatePI(piType.template, variables);
            
            // Insert after float-anchor
            modifiedContent = 
                modifiedContent.substring(0, anchorEndIndex) +
                '\n' + newPI +
                modifiedContent.substring(anchorEndIndex);
            
            changes.push({
                refid,
                type: anchorFloatType,
                action: 'added',
                placement
            });
            console.log(`   ➕ ${refid}: Added PI with placement '${placement}'`);
        }
    }
    
    return { content: modifiedContent, changes };
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const options = {
        xmlFile: null,
        configFile: DEFAULT_CONFIG,
        documentId: null,
        floatType: 'all',
        placement: null,
        targetId: null,
        dryRun: false,
        output: null,
        listPITypes: false,
        listDocuments: false
    };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        
        if (arg === '--config' && args[i + 1]) {
            options.configFile = args[i + 1];
            i += 2;
        } else if (arg === '--document' && args[i + 1]) {
            options.documentId = args[i + 1];
            i += 2;
        } else if (arg === '--type' && args[i + 1]) {
            options.floatType = args[i + 1].toLowerCase();
            i += 2;
        } else if (arg === '--placement' && args[i + 1]) {
            options.placement = args[i + 1].toLowerCase();
            i += 2;
        } else if (arg === '--id' && args[i + 1]) {
            options.targetId = args[i + 1];
            i += 2;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
            i += 1;
        } else if (arg === '--output' && args[i + 1]) {
            options.output = args[i + 1];
            i += 2;
        } else if (arg === '--list-pi-types') {
            options.listPITypes = true;
            i += 1;
        } else if (arg === '--list-documents') {
            options.listDocuments = true;
            i += 1;
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
Apply Processing Instructions to XML

Uses PI type templates from configuration. Documents are mapped to specific
PI types, and placement is specified at runtime.

Usage:
  node apply-pi.js <xml-file> --placement <t|b|h|p> [options]

Options:
  --config <file>            PI types config (default: config/pi-types.json)
  --document <id>            Document ID for mapping (auto-detected from filename)
  --type <figure|table|all>  Float type to process (default: all)
  --placement <t|b|h|p>      Placement option (required)
  --id <refid>               Process only specific float
  --dry-run                  Show changes without modifying
  --output <file>            Output to different file
  --list-pi-types            List available PI types
  --list-documents           List configured documents

Placement Options:
  t = top         Place at top of page
  b = bottom      Place at bottom of page
  h = here        Place at current position if possible
  p = page        Place on a dedicated float page

Examples:
  # Apply 'bottom' placement to all figures
  node apply-pi.js xml/EGG_100411.xml --type figure --placement b

  # Apply 'top' placement to specific table
  node apply-pi.js xml/EGG_100411.xml --id tbl1 --placement t

  # Apply to all floats with preview
  node apply-pi.js xml/EGG_100411.xml --placement h --dry-run

  # List available PI types
  node apply-pi.js --list-pi-types
`);
}

/**
 * List PI types
 */
function listPITypes(config) {
    console.log('\n📋 Available PI Types:\n');
    for (const [name, piType] of Object.entries(config.piTypes)) {
        console.log(`  ${name}`);
        console.log(`    Description: ${piType.description}`);
        console.log(`    Float type:  ${piType.floatType}`);
        console.log(`    Template:    ${piType.template}`);
        console.log('');
    }
}

/**
 * List documents
 */
function listDocuments(config) {
    console.log('\n📄 Configured Documents:\n');
    for (const [docId, mapping] of Object.entries(config.documentMappings)) {
        console.log(`  ${docId}`);
        if (mapping.description) {
            console.log(`    Description: ${mapping.description}`);
        }
        console.log(`    Figure PI:   ${mapping.figure}`);
        console.log(`    Table PI:    ${mapping.table}`);
        console.log('');
    }
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
    const config = loadConfig(options.configFile);

    // Handle list commands
    if (options.listPITypes) {
        listPITypes(config);
        process.exit(0);
    }
    
    if (options.listDocuments) {
        listDocuments(config);
        process.exit(0);
    }

    // Validate required options
    if (!options.xmlFile) {
        console.error('Error: No XML file specified');
        showHelp();
        process.exit(1);
    }

    if (!options.placement) {
        console.error('Error: --placement is required');
        showHelp();
        process.exit(1);
    }

    if (!['t', 'b', 'h', 'p'].includes(options.placement)) {
        console.error(`Error: Invalid placement '${options.placement}'. Must be: t, b, h, or p`);
        process.exit(1);
    }

    // Read XML file
    const xmlPath = path.resolve(options.xmlFile);
    if (!fs.existsSync(xmlPath)) {
        console.error(`Error: File not found: ${xmlPath}`);
        process.exit(1);
    }

    // Auto-detect document ID if not specified
    if (!options.documentId) {
        options.documentId = getDocumentIdFromFilename(xmlPath);
    }

    const content = fs.readFileSync(xmlPath, 'utf8');
    const anchors = findFloatAnchors(content);

    console.log(`\n📄 Processing: ${path.basename(xmlPath)}`);
    console.log(`   Document ID: ${options.documentId}`);
    console.log(`   Float type:  ${options.floatType}`);
    console.log(`   Placement:   ${options.placement}`);
    if (options.targetId) {
        console.log(`   Target ID:   ${options.targetId}`);
    }
    console.log(`   Found ${anchors.length} float anchors: ${anchors.map(a => a.refid).join(', ')}`);
    if (options.dryRun) {
        console.log(`   Mode: DRY RUN`);
    }
    console.log('');

    // Apply PIs
    const result = applyPIs(content, config, {
        documentId: options.documentId,
        floatType: options.floatType,
        placement: options.placement,
        targetId: options.targetId
    });

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

// Export for use as module/API
module.exports = {
    loadConfig,
    applyPIs,
    findFloatAnchors,
    getPITypeForFloat,
    generatePI,
    getFloatType
};

