#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix mathematical expressions in LaTeX files
 * This script converts common mathematical expressions to proper LaTeX math mode
 */

function fixMathExpressions(content) {
    let fixed = content;
    
    // Fix P values and statistical expressions
    fixed = fixed.replace(/\bP\s+value\b/g, '$P$ value');
    fixed = fixed.replace(/\bP\s*=\s*([0-9.]+)/g, '$P = $1');
    fixed = fixed.replace(/\bP\s*<\s*([0-9.]+)/g, '$P < $1');
    fixed = fixed.replace(/\bP\s*>\s*([0-9.]+)/g, '$P > $1');
    fixed = fixed.replace(/\bP\s*≤\s*([0-9.]+)/g, '$P \\leq $1');
    fixed = fixed.replace(/\bP\s*≥\s*([0-9.]+)/g, '$P \\geq $1');
    fixed = fixed.replace(/\bP\s*≠\s*([0-9.]+)/g, '$P \\neq $1');
    
    // Fix hazard ratios and odds ratios
    fixed = fixed.replace(/\bHR\s*,/g, '$HR$,');
    fixed = fixed.replace(/\bOR\s*,/g, '$OR$,');
    fixed = fixed.replace(/\bCI\s*,/g, '$CI$,');
    fixed = fixed.replace(/\b95%\s+confidence\s+interval/g, '95\\% confidence interval');
    
    // Fix log expressions
    fixed = fixed.replace(/\blog2\b/g, '$\\log_2$');
    fixed = fixed.replace(/\blog\s*\(/g, '$\\log($');
    
    // Fix mathematical symbols
    fixed = fixed.replace(/\bα\b/g, '$\\alpha$');
    fixed = fixed.replace(/\bβ\b/g, '$\\beta$');
    fixed = fixed.replace(/\bγ\b/g, '$\\gamma$');
    fixed = fixed.replace(/\bδ\b/g, '$\\delta$');
    fixed = fixed.replace(/\bε\b/g, '$\\epsilon$');
    fixed = fixed.replace(/\bκ\b/g, '$\\kappa$');
    fixed = fixed.replace(/\bλ\b/g, '$\\lambda$');
    fixed = fixed.replace(/\bμ\b/g, '$\\mu$');
    fixed = fixed.replace(/\bπ\b/g, '$\\pi$');
    fixed = fixed.replace(/\bρ\b/g, '$\\rho$');
    fixed = fixed.replace(/\bσ\b/g, '$\\sigma$');
    fixed = fixed.replace(/\bτ\b/g, '$\\tau$');
    fixed = fixed.replace(/\bχ\b/g, '$\\chi$');
    fixed = fixed.replace(/\bψ\b/g, '$\\psi$');
    fixed = fixed.replace(/\bω\b/g, '$\\omega$');
    
    // Fix mathematical operators
    fixed = fixed.replace(/\b±\b/g, '$\\pm$');
    fixed = fixed.replace(/\b×\b/g, '$\\times$');
    fixed = fixed.replace(/\b÷\b/g, '$\\div$');
    fixed = fixed.replace(/\b≤\b/g, '$\\leq$');
    fixed = fixed.replace(/\b≥\b/g, '$\\geq$');
    fixed = fixed.replace(/\b≠\b/g, '$\\neq$');
    fixed = fixed.replace(/\b∞\b/g, '$\\infty$');
    fixed = fixed.replace(/\b∑\b/g, '$\\sum$');
    fixed = fixed.replace(/\b∫\b/g, '$\\int$');
    
    // Fix fractions and ratios
    fixed = fixed.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '$\\frac{$1}{$2}$');
    
    // Fix percentages in mathematical context
    fixed = fixed.replace(/(\d+)\s*%\s*vs\s*(\d+)\s*%/g, '$1\\%$ vs $2\\%$');
    fixed = fixed.replace(/(\d+)\s*%\s*to\s*(\d+)\s*%/g, '$1\\%$ to $2\\%$');
    
    // Fix confidence intervals
    fixed = fixed.replace(/\b(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*\(/g, '$1$-$2$ (');
    fixed = fixed.replace(/\b(\d+\.?\d*)\s*to\s*(\d+\.?\d*)\s*\(/g, '$1$ to $2$ (');
    
    // Fix hazard ratio expressions
    fixed = fixed.replace(/\bHR\s*,\s*(\d+\.?\d*)\s*;\s*95%\s*CI\s*,\s*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*;\s*P\s*=\s*([0-9.]+)/g, 
        '$HR$, $1$; 95\\% $CI$, $2$-$3$; $P = $4');
    
    // Fix odds ratio expressions
    fixed = fixed.replace(/\bOR\s*,\s*(\d+\.?\d*)\s*and\s*(\d+\.?\d*)\s*,\s*respectively/g, 
        '$OR$, $1$ and $2$, respectively');
    
    // Fix fold-change expressions
    fixed = fixed.replace(/\bfold-change\b/g, 'fold-change');
    fixed = fixed.replace(/\babsolute\s*\(\s*log2\s*\(\s*fold-change\s*\)\s*\)/g, 
        'absolute($\\log_2$(fold-change))');
    
    // Clean up any double dollar signs
    fixed = fixed.replace(/\$\$/g, '$');
    
    // Clean up any incomplete math expressions
    fixed = fixed.replace(/\$\s*$/g, '');
    fixed = fixed.replace(/\$\s*([^$]*)\s*$/g, '$$1$');
    
    // Remove empty equation environments
    fixed = fixed.replace(/\\begin\{equation\}\s*\\end\{equation\}/g, '');
    fixed = fixed.replace(/\\begin\{equation\}\s*\n\s*\\end\{equation\}/g, '');
    
    // Remove stray dollar signs
    fixed = fixed.replace(/\$\s*\./g, '.');
    fixed = fixed.replace(/\$\s*$/g, '');
    fixed = fixed.replace(/^\s*\$\s*/gm, '');
    
    // Fix malformed math expressions
    fixed = fixed.replace(/\$\s*([^$]*)\s*<\s*(\d+)\s*\$/g, '$1 < $2$');
    fixed = fixed.replace(/\$\s*([^$]*)\s*>\s*(\d+)\s*\$/g, '$1 > $2$');
    fixed = fixed.replace(/\$\s*([^$]*)\s*=\s*(\d+)\s*\$/g, '$1 = $2$');
    
    return fixed;
}

// Main function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node fix-math-expressions.js <input-file> [output-file]');
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
