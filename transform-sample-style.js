#!/usr/bin/env node

/**
 * Transform ENDEND10921.xml using the sample-style template
 */

const fs = require('fs');
const path = require('path');
const { transform } = require('./src/engine.js');

async function main() {
    try {
        const xmlPath = path.join(__dirname, 'xml', 'ENDEND10921.xml');
        const templatePath = path.join(__dirname, 'template', 'ENDEND10921-sample-style.tex.xml');
        const outputPath = path.join(__dirname, 'TeX', 'ENDEND10921-sample-style.tex');
        
        console.log('Reading XML file...');
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        console.log(`XML file size: ${xmlContent.length} characters`);
        
        console.log('Reading template file...');
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        console.log(`Template file size: ${templateContent.length} characters`);
        
        console.log('Starting transformation...');
        const result = await transform(xmlContent, templateContent);
        
        console.log('Writing output file...');
        fs.writeFileSync(outputPath, result.output);
        
        console.log(`✅ Success! Output written to: ${outputPath}`);
        console.log(`📊 Report:`, result.report);
        console.log(`⚡ Performance:`, result.performance);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();