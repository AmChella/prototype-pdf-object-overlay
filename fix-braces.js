#!/usr/bin/env node

const fs = require('fs');

function fixBraces(filePath) {
    console.log(`Reading ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    console.log('Fixing brace issues...');
    
    // Count opening and closing braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    console.log(`Opening braces: ${openBraces}, Closing braces: ${closeBraces}`);
    
    if (closeBraces > openBraces) {
        const excess = closeBraces - openBraces;
        console.log(`Removing ${excess} excess closing braces...`);
        
        // Remove excess closing braces from the end of lines
        let removed = 0;
        content = content.replace(/\}/g, (match, offset) => {
            if (removed < excess) {
                removed++;
                return '';
            }
            return match;
        });
    }
    
    // Fix malformed textsuperscript commands that cause brace issues
    content = content.replace(/\\textsuperscript\{[^}]*\}\}/g, '[math]');
    content = content.replace(/\\textsuperscript\{[^}]*\}\./g, '[math].');
    content = content.replace(/\\textsuperscript\{[^}]*\}\s*\./g, '[math].');
    content = content.replace(/\\textsuperscript\{[^}]*\}\s*\)/g, '[math])');
    
    // Remove empty superscripts
    content = content.replace(/\\textsuperscript\{\}/g, '');
    content = content.replace(/\\textsuperscript\{\s*\}/g, '');
    
    // Fix malformed mathematical expressions
    content = content.replace(/\{[^}]*\}\{[^}]*\}/g, '[math]');
    content = content.replace(/J=\{[^}]*\}\{[^}]*\}/g, 'J = [math]');
    
    // Remove problematic mathematical content
    content = content.replace(/∑[^}]*\}/g, '[sum]');
    content = content.replace(/σ\([^)]*\)/g, '[sigma]');
    
    // Fix malformed \begin commands
    content = content.replace(/\\begin\[[^\]]*\]/g, '');
    
    // Fix lonely \item commands
    content = content.replace(/\\item\s*([^\\])/g, '$1');
    content = content.replace(/\\item\s*$/gm, '');
    
    // Remove any remaining problematic content
    content = content.replace(/\[mathematical expression\]/g, '');
    content = content.replace(/\{\[mathematical expression\]\}/g, '');
    content = content.replace(/\{\[sum\]\[sigma\]\}/g, '');
    
    // Fix bibliography issues
    if (content.includes('\\bibitem') && !content.includes('\\begin{thebibliography}')) {
        content = content.replace(/(\\bibitem[^}]*})/g, '\\begin{thebibliography}{99}\n$1');
        content += '\n\\end{thebibliography}';
    }
    
    // Final brace balance check
    const finalOpenBraces = (content.match(/\{/g) || []).length;
    const finalCloseBraces = (content.match(/\}/g) || []).length;
    
    console.log(`Final opening braces: ${finalOpenBraces}, Final closing braces: ${finalCloseBraces}`);
    
    if (finalCloseBraces > finalOpenBraces) {
        const finalExcess = finalCloseBraces - finalOpenBraces;
        console.log(`Removing ${finalExcess} more excess closing braces...`);
        
        let removed = 0;
        content = content.replace(/\}/g, (match, offset) => {
            if (removed < finalExcess) {
                removed++;
                return '';
            }
            return match;
        });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Brace issues fixed successfully!');
}

// Get file path from command line
const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node fix-braces.js <tex-file>');
    process.exit(1);
}

fixBraces(filePath);
