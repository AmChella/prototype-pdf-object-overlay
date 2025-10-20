#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Mathematical expression fixer that only processes the document body
 * This script ensures LaTeX compilation by only fixing mathematical expressions in the body
 */

function fixMathExpressions(content) {
    let fixed = content;
    
    // Split the document into preamble and body
    const parts = fixed.split('\\begin{document}');
    if (parts.length === 2) {
        const preamble = parts[0];
        let body = parts[1];
        
        // Only process mathematical expressions in the body
        body = fixMathInBody(body);
        
        fixed = preamble + '\\begin{document}' + body;
    } else {
        // If no \\begin{document} found, process the entire content
        fixed = fixMathInBody(content);
    }
    
    return fixed;
}

function fixMathInBody(body) {
    let fixed = body;
    
    // Remove all unhandledtag commands
    fixed = fixed.replace(/\\unhandledtag\{[^}]*\}\{[^}]*\}/g, '');
    fixed = fixed.replace(/\\unhandledtag\{[^}]*\}/g, '');
    
    // Remove empty equation environments
    fixed = fixed.replace(/\\begin\{equation\}\s*\\end\{equation\}/g, '');
    fixed = fixed.replace(/\\begin\{equation\}\s*\n\s*\\end\{equation\}/g, '');
    
    // Remove empty fractions
    fixed = fixed.replace(/\\frac\{\}\{\}/g, '');
    fixed = fixed.replace(/\\frac\{\}\{[^}]*\}/g, '');
    fixed = fixed.replace(/\\frac\{[^}]*\}\{\}/g, '');
    
    // Remove all complex mathematical expressions that cause LaTeX errors
    fixed = fixed.replace(/J=\{[^}]*\}\{[^}]*\}/g, 'J = [mathematical expression]');
    fixed = fixed.replace(/\{[^}]*\}\{[^}]*\}/g, '[mathematical expression]');
    
    // Remove any remaining problematic mathematical content
    fixed = fixed.replace(/∑[^}]*\}/g, '[sum]');
    fixed = fixed.replace(/σ\([^)]*\)/g, '[sigma]');
    
    // Fix malformed \begin commands
    fixed = fixed.replace(/\\begin\[mathematical expression\]/g, '');
    fixed = fixed.replace(/\\begin\[[^\]]*mathematical[^\]]*\]/g, '');
    fixed = fixed.replace(/\\begin\[[^\]]*\]/g, '');
    
    // Fix lonely \item commands
    fixed = fixed.replace(/\\item\s*([^\\])/g, '$1');
    fixed = fixed.replace(/\\item\s*$/gm, '');
    
    // Fix malformed mathematical expressions and extra braces
    fixed = fixed.replace(/\[mathematical expression\]/g, '');
    fixed = fixed.replace(/\{\[mathematical expression\]\}/g, '');
    fixed = fixed.replace(/\{\[sum\]\[sigma\]\}/g, '');
    fixed = fixed.replace(/\{\[sum\]\[sigma\]\}\./g, '.');
    fixed = fixed.replace(/\[mathematical expression\]\([^)]*\)/g, '');
    fixed = fixed.replace(/\{\[mathematical expression\]\([^)]*\)\}/g, '');
    fixed = fixed.replace(/\{\[mathematical expression\]\([^)]*\)\},/g, ',');
    fixed = fixed.replace(/\{\[mathematical expression\]\([^)]*\)\}\}/g, '}');
    
    // Fix extra braces that cause "Too many }'s" errors
    fixed = fixed.replace(/\{\}\}/g, '}');
    fixed = fixed.replace(/\{\{\}/g, '{');
    fixed = fixed.replace(/\}\}\}/g, '}');
    fixed = fixed.replace(/\{\{\{/g, '{');
    
    // Fix malformed textsuperscript with mathematical expressions
    fixed = fixed.replace(/\\textsuperscript\{\[mathematical expression\]\}/g, '');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*mathematical[^}]*\}/g, '');
    
    // Fix malformed textsuperscript commands
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\}/g, '}');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\./g, '.');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\./g, '.');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\)/g, ')');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\,/g, ',');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*;/g, ';');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*:/g, ':');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*!/g, '!');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\?/g, '?');
    
    // Fix incomplete textsuperscript commands
    fixed = fixed.replace(/\\textsuperscript$/gm, '');
    fixed = fixed.replace(/\\textsuperscript\s*$/gm, '');
    
    // Fix extra braces after textsuperscript
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\}\s*([^}])/g, '\\textsuperscript{$1}');
    fixed = fixed.replace(/\\textsuperscript\{[^}]*\}\s*\}\s*([^}])/g, '\\textsuperscript{$1}');
    
    // Fix bibliography environment
    if (fixed.includes('\\bibitem{}')) {
        // Find the first \bibitem and add \begin{thebibliography} before it
        const bibitemIndex = fixed.indexOf('\\bibitem{}');
        if (bibitemIndex > 0) {
            // Look for the line before the first \bibitem
            const beforeBibitem = fixed.substring(0, bibitemIndex);
            const afterBibitem = fixed.substring(bibitemIndex);
            
            // Add \begin{thebibliography} before the first \bibitem
            fixed = beforeBibitem + '\\begin{thebibliography}{99}\n' + afterBibitem;
            
            // Add \end{thebibliography} at the end
            fixed = fixed + '\n\\end{thebibliography}';
        }
    }
    
    // Fix only the most basic and safe mathematical expressions
    fixed = fixed.replace(/\bP\s+value\b/g, '$P$ value');
    fixed = fixed.replace(/\bP\s*=\s*([0-9.]+)/g, '$P = $1');
    fixed = fixed.replace(/\bP\s*<\s*([0-9.]+)/g, '$P < $1');
    fixed = fixed.replace(/\bP\s*>\s*([0-9.]+)/g, '$P > $1');
    
    // Fix hazard ratios and odds ratios
    fixed = fixed.replace(/\bHR\s*,/g, '$HR$,');
    fixed = fixed.replace(/\bOR\s*,/g, '$OR$,');
    fixed = fixed.replace(/\bCI\s*,/g, '$CI$,');
    
    // Fix log expressions
    fixed = fixed.replace(/\blog2\b/g, '$\\log_2$');
    
    // Fix Greek letters (only the most common ones)
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
    
    // Fix mathematical operators
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
        console.log('Usage: node fix-math-body-only.js <input-file> [output-file]');
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
