#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple mathematical expression fixer for LaTeX files
 * This script converts only the most common and safe mathematical expressions
 */

function fixMathExpressions(content) {
    let fixed = content;
    
    // Remove empty equation environments first
    fixed = fixed.replace(/\\begin\{equation\}\s*\\end\{equation\}/g, '');
    fixed = fixed.replace(/\\begin\{equation\}\s*\n\s*\\end\{equation\}/g, '');
    
    // Fix only the most common and safe mathematical expressions
    // P values
    fixed = fixed.replace(/\bP\s+value\b/g, '$P$ value');
    fixed = fixed.replace(/\bP\s*=\s*([0-9.]+)/g, '$P = $1');
    fixed = fixed.replace(/\bP\s*<\s*([0-9.]+)/g, '$P < $1');
    fixed = fixed.replace(/\bP\s*>\s*([0-9.]+)/g, '$P > $1');
    
    // Hazard ratios and odds ratios
    fixed = fixed.replace(/\bHR\s*,/g, '$HR$,');
    fixed = fixed.replace(/\bOR\s*,/g, '$OR$,');
    fixed = fixed.replace(/\bCI\s*,/g, '$CI$,');
    
    // Log expressions
    fixed = fixed.replace(/\blog2\b/g, '$\\log_2$');
    
    // Greek letters (only the most common ones)
    fixed = fixed.replace(/\bα\b/g, '$\\alpha$');
    fixed = fixed.replace(/\bβ\b/g, '$\\beta$');
    fixed = fixed.replace(/\bγ\b/g, '$\\gamma$');
    fixed = fixed.replace(/\bδ\b/g, '$\\delta$');
    fixed = fixed.replace(/\bκ\b/g, '$\\kappa$');
    fixed = fixed.replace(/\bλ\b/g, '$\\lambda$');
    fixed = fixed.replace(/\bμ\b/g, '$\\mu$');
    fixed = fixed.replace(/\bπ\b/g, '$\\pi$');
    fixed = fixed.replace(/\bσ\b/g, '$\\sigma$');
    fixed = fixed.replace(/\bχ\b/g, '$\\chi$');
    
    // Mathematical operators
    fixed = fixed.replace(/\b±\b/g, '$\\pm$');
    fixed = fixed.replace(/\b≤\b/g, '$\\leq$');
    fixed = fixed.replace(/\b≥\b/g, '$\\geq$');
    fixed = fixed.replace(/\b≠\b/g, '$\\neq$');
    
    // Clean up any double dollar signs
    fixed = fixed.replace(/\$\$/g, '$');
    
    // Remove any stray dollar signs that might cause issues
    fixed = fixed.replace(/\$\s*$/g, '');
    fixed = fixed.replace(/^\s*\$\s*/gm, '');
    fixed = fixed.replace(/\$\s*\./g, '.');
    
    return fixed;
}

// Main function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node fix-math-simple.js <input-file> [output-file]');
        console.log('If output-file is not specified, input-file will be overwritten.');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputFile = args[1] || inputFile;
    
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file '${inputFile}' not found.`);
        process.exit(1);
    }
    
    try {
        console.log(`Reading ${inputFile}...`);
        const content = fs.readFileSync(inputFile, 'utf8');
        
        console.log('Fixing mathematical expressions...');
        const fixedContent = fixMathExpressions(content);
        
        console.log(`Writing to ${outputFile}...`);
        fs.writeFileSync(outputFile, fixedContent, 'utf8');
        
        console.log('Mathematical expressions fixed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixMathExpressions };
