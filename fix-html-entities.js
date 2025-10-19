#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix HTML entities in LaTeX files
 * This script replaces common HTML entities with their LaTeX equivalents
 */

function fixHtmlEntities(content) {
    // Replace HTML entities with LaTeX equivalents
    let fixed = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&ndash;/g, '--')
        .replace(/&mdash;/g, '---')
        .replace(/&hellip;/g, '...')
        .replace(/&copy;/g, '\\copyright')
        .replace(/&reg;/g, '\\textregistered')
        .replace(/&trade;/g, '\\texttrademark')
        .replace(/&sect;/g, '\\S')
        .replace(/&para;/g, '\\P')
        .replace(/&middot;/g, '\\textperiodcentered')
        .replace(/&bull;/g, '\\textbullet')
        .replace(/&dagger;/g, '\\dag')
        .replace(/&Dagger;/g, '\\ddag')
        .replace(/&permil;/g, '\\textperthousand')
        .replace(/&lsaquo;/g, '\\guilsinglleft')
        .replace(/&rsaquo;/g, '\\guilsinglright')
        .replace(/&lsquo;/g, '`')
        .replace(/&rsquo;/g, "'")
        .replace(/&ldquo;/g, '``')
        .replace(/&rdquo;/g, "''")
        .replace(/&sbquo;/g, ',')
        .replace(/&bdquo;/g, ',,')
        .replace(/&hellip;/g, '...')
        .replace(/&prime;/g, "'")
        .replace(/&Prime;/g, '"')
        .replace(/&oline;/g, '\\overline{ }')
        .replace(/&frasl;/g, '/')
        .replace(/&image;/g, '\\Im')
        .replace(/&weierp;/g, '\\wp')
        .replace(/&real;/g, '\\Re')
        .replace(/&alefsym;/g, '\\aleph')
        .replace(/&larr;/g, '\\leftarrow')
        .replace(/&uarr;/g, '\\uparrow')
        .replace(/&rarr;/g, '\\rightarrow')
        .replace(/&darr;/g, '\\downarrow')
        .replace(/&harr;/g, '\\leftrightarrow')
        .replace(/&crarr;/g, '\\hookleftarrow')
        .replace(/&lArr;/g, '\\Leftarrow')
        .replace(/&uArr;/g, '\\Uparrow')
        .replace(/&rArr;/g, '\\Rightarrow')
        .replace(/&dArr;/g, '\\Downarrow')
        .replace(/&hArr;/g, '\\Leftrightarrow')
        .replace(/&forall;/g, '\\forall')
        .replace(/&part;/g, '\\partial')
        .replace(/&exist;/g, '\\exists')
        .replace(/&empty;/g, '\\emptyset')
        .replace(/&nabla;/g, '\\nabla')
        .replace(/&isin;/g, '\\in')
        .replace(/&notin;/g, '\\notin')
        .replace(/&ni;/g, '\\ni')
        .replace(/&prod;/g, '\\prod')
        .replace(/&sum;/g, '\\sum')
        .replace(/&minus;/g, '-')
        .replace(/&lowast;/g, '\\ast')
        .replace(/&radic;/g, '\\surd')
        .replace(/&prop;/g, '\\propto')
        .replace(/&infin;/g, '\\infty')
        .replace(/&ang;/g, '\\angle')
        .replace(/&and;/g, '\\wedge')
        .replace(/&or;/g, '\\vee')
        .replace(/&cap;/g, '\\cap')
        .replace(/&cup;/g, '\\cup')
        .replace(/&int;/g, '\\int')
        .replace(/&there4;/g, '\\therefore')
        .replace(/&sim;/g, '\\sim')
        .replace(/&cong;/g, '\\cong')
        .replace(/&asymp;/g, '\\approx')
        .replace(/&ne;/g, '\\neq')
        .replace(/&equiv;/g, '\\equiv')
        .replace(/&le;/g, '\\leq')
        .replace(/&ge;/g, '\\geq')
        .replace(/&sub;/g, '\\subset')
        .replace(/&sup;/g, '\\supset')
        .replace(/&nsub;/g, '\\not\\subset')
        .replace(/&sube;/g, '\\subseteq')
        .replace(/&supe;/g, '\\supseteq')
        .replace(/&oplus;/g, '\\oplus')
        .replace(/&otimes;/g, '\\otimes')
        .replace(/&perp;/g, '\\perp')
        .replace(/&sdot;/g, '\\cdot')
        .replace(/&Alpha;/g, 'A')
        .replace(/&Beta;/g, 'B')
        .replace(/&Gamma;/g, '\\Gamma')
        .replace(/&Delta;/g, '\\Delta')
        .replace(/&Epsilon;/g, 'E')
        .replace(/&Zeta;/g, 'Z')
        .replace(/&Eta;/g, 'H')
        .replace(/&Theta;/g, '\\Theta')
        .replace(/&Iota;/g, 'I')
        .replace(/&Kappa;/g, 'K')
        .replace(/&Lambda;/g, '\\Lambda')
        .replace(/&Mu;/g, 'M')
        .replace(/&Nu;/g, 'N')
        .replace(/&Xi;/g, '\\Xi')
        .replace(/&Omicron;/g, 'O')
        .replace(/&Pi;/g, '\\Pi')
        .replace(/&Rho;/g, 'P')
        .replace(/&Sigma;/g, '\\Sigma')
        .replace(/&Tau;/g, 'T')
        .replace(/&Upsilon;/g, '\\Upsilon')
        .replace(/&Phi;/g, '\\Phi')
        .replace(/&Chi;/g, 'X')
        .replace(/&Psi;/g, '\\Psi')
        .replace(/&Omega;/g, '\\Omega')
        .replace(/&alpha;/g, '\\alpha')
        .replace(/&beta;/g, '\\beta')
        .replace(/&gamma;/g, '\\gamma')
        .replace(/&delta;/g, '\\delta')
        .replace(/&epsilon;/g, '\\epsilon')
        .replace(/&zeta;/g, '\\zeta')
        .replace(/&eta;/g, '\\eta')
        .replace(/&theta;/g, '\\theta')
        .replace(/&iota;/g, '\\iota')
        .replace(/&kappa;/g, '\\kappa')
        .replace(/&lambda;/g, '\\lambda')
        .replace(/&mu;/g, '\\mu')
        .replace(/&nu;/g, '\\nu')
        .replace(/&xi;/g, '\\xi')
        .replace(/&omicron;/g, 'o')
        .replace(/&pi;/g, '\\pi')
        .replace(/&rho;/g, '\\rho')
        .replace(/&sigmaf;/g, '\\varsigma')
        .replace(/&sigma;/g, '\\sigma')
        .replace(/&tau;/g, '\\tau')
        .replace(/&upsilon;/g, '\\upsilon')
        .replace(/&phi;/g, '\\phi')
        .replace(/&chi;/g, '\\chi')
        .replace(/&psi;/g, '\\psi')
        .replace(/&omega;/g, '\\omega')
        .replace(/&thetasym;/g, '\\vartheta')
        .replace(/&upsih;/g, '\\Upsilon')
        .replace(/&piv;/g, '\\varpi')
        .replace(/&OElig;/g, 'OE')
        .replace(/&oelig;/g, 'oe')
        .replace(/&Scaron;/g, 'S')
        .replace(/&scaron;/g, 's')
        .replace(/&Yuml;/g, 'Y')
        .replace(/&fnof;/g, 'f')
        .replace(/&circ;/g, '\\circ')
        .replace(/&tilde;/g, '\\tilde{}')
        .replace(/&ensp;/g, '\\enspace')
        .replace(/&emsp;/g, '\\quad')
        .replace(/&thinsp;/g, '\\thinspace')
        .replace(/&zwnj;/g, '')
        .replace(/&zwj;/g, '')
        .replace(/&lrm;/g, '')
        .replace(/&rlm;/g, '')
        .replace(/&ndash;/g, '--')
        .replace(/&mdash;/g, '---')
        .replace(/&lsquo;/g, '`')
        .replace(/&rsquo;/g, "'")
        .replace(/&sbquo;/g, ',')
        .replace(/&ldquo;/g, '``')
        .replace(/&rdquo;/g, "''")
        .replace(/&bdquo;/g, ',,')
        .replace(/&dagger;/g, '\\dag')
        .replace(/&Dagger;/g, '\\ddag')
        .replace(/&hellip;/g, '...')
        .replace(/&permil;/g, '\\textperthousand')
        .replace(/&lsaquo;/g, '\\guilsinglleft')
        .replace(/&rsaquo;/g, '\\guilsinglright')
        .replace(/&euro;/g, '\\euro')
        .replace(/&trade;/g, '\\texttrademark')
        .replace(/&larr;/g, '\\leftarrow')
        .replace(/&uarr;/g, '\\uparrow')
        .replace(/&rarr;/g, '\\rightarrow')
        .replace(/&darr;/g, '\\downarrow')
        .replace(/&harr;/g, '\\leftrightarrow')
        .replace(/&crarr;/g, '\\hookleftarrow')
        .replace(/&lArr;/g, '\\Leftarrow')
        .replace(/&uArr;/g, '\\Uparrow')
        .replace(/&rArr;/g, '\\Rightarrow')
        .replace(/&dArr;/g, '\\Downarrow')
        .replace(/&hArr;/g, '\\Leftrightarrow')
        .replace(/&forall;/g, '\\forall')
        .replace(/&part;/g, '\\partial')
        .replace(/&exist;/g, '\\exists')
        .replace(/&empty;/g, '\\emptyset')
        .replace(/&nabla;/g, '\\nabla')
        .replace(/&isin;/g, '\\in')
        .replace(/&notin;/g, '\\notin')
        .replace(/&ni;/g, '\\ni')
        .replace(/&prod;/g, '\\prod')
        .replace(/&sum;/g, '\\sum')
        .replace(/&minus;/g, '-')
        .replace(/&lowast;/g, '\\ast')
        .replace(/&radic;/g, '\\surd')
        .replace(/&prop;/g, '\\propto')
        .replace(/&infin;/g, '\\infty')
        .replace(/&ang;/g, '\\angle')
        .replace(/&and;/g, '\\wedge')
        .replace(/&or;/g, '\\vee')
        .replace(/&cap;/g, '\\cap')
        .replace(/&cup;/g, '\\cup')
        .replace(/&int;/g, '\\int')
        .replace(/&there4;/g, '\\therefore')
        .replace(/&sim;/g, '\\sim')
        .replace(/&cong;/g, '\\cong')
        .replace(/&asymp;/g, '\\approx')
        .replace(/&ne;/g, '\\neq')
        .replace(/&equiv;/g, '\\equiv')
        .replace(/&le;/g, '\\leq')
        .replace(/&ge;/g, '\\geq')
        .replace(/&sub;/g, '\\subset')
        .replace(/&sup;/g, '\\supset')
        .replace(/&nsub;/g, '\\not\\subset')
        .replace(/&sube;/g, '\\subseteq')
        .replace(/&supe;/g, '\\supseteq')
        .replace(/&oplus;/g, '\\oplus')
        .replace(/&otimes;/g, '\\otimes')
        .replace(/&perp;/g, '\\perp')
        .replace(/&sdot;/g, '\\cdot')
        .replace(/&lceil;/g, '\\lceil')
        .replace(/&rceil;/g, '\\rceil')
        .replace(/&lfloor;/g, '\\lfloor')
        .replace(/&rfloor;/g, '\\rfloor')
        .replace(/&lang;/g, '\\langle')
        .replace(/&rang;/g, '\\rangle')
        .replace(/&loz;/g, '\\lozenge')
        .replace(/&spades;/g, '\\spadesuit')
        .replace(/&clubs;/g, '\\clubsuit')
        .replace(/&hearts;/g, '\\heartsuit')
        .replace(/&diams;/g, '\\diamondsuit');

    return fixed;
}

// Main function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node fix-html-entities.js <input-file> [output-file]');
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
        
        console.log('Fixing HTML entities...');
        const fixedContent = fixHtmlEntities(content);
        
        console.log(`Writing to ${outputFile}...`);
        fs.writeFileSync(outputFile, fixedContent, 'utf8');
        
        console.log('HTML entities fixed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixHtmlEntities };
