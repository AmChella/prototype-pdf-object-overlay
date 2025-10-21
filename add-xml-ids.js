#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function addUniqueIdsToXml(xmlFilePath) {
    console.log(`Adding unique IDs to XML file: ${xmlFilePath}`);

    // Read the XML file
    let xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');

    // Counter for generating unique IDs
    let paragraphCounter = 1;
    let figureCounter = 1;
    let tableCounter = 1;

    // Add IDs to paragraphs that don't already have them
    xmlContent = xmlContent.replace(/<p(?!\s+=id)>/g, (match, attributes) => {
      const id = `p-${paragraphCounter.toString().padStart(3, "0")}`;
      paragraphCounter++;
      return `<p id="${id}">`;
    });

    // Add IDs to figures that don't already have them
    xmlContent = xmlContent.replace(/<fig(?!\s+id=)([^>]*)>/g, (match, attributes) => {
        const id = `fig-${figureCounter.toString().padStart(3, '0')}`;
        figureCounter++;
        return `<fig id="${id}" ${attributes}>`;
    });

    // Add IDs to table-wrap elements that don't already have them
    xmlContent = xmlContent.replace(/<table-wrap(?!\s+id=)([^>]*)>/g, (match, attributes) => {
        const id = `table-${tableCounter.toString().padStart(3, '0')}`;
        tableCounter++;
        return `<table-wrap id="${id}" ${attributes}>`;
    });

    // Add IDs to disp-formula elements that don't already have them
    let formulaCounter = 1;
    xmlContent = xmlContent.replace(/<disp-formula(?!\s+id=)([^>]*)>/g, (match, attributes) => {
        const id = `eq-${formulaCounter.toString().padStart(3, '0')}`;
        formulaCounter++;
        return `<disp-formula id="${id}" ${attributes}>`;
    });

    // Add IDs to inline-formula elements that don't already have them
    let inlineFormulaCounter = 1;
    xmlContent = xmlContent.replace(/<inline-formula(?!\s+id=)([^>]*)>/g, (match, attributes) => {
        const id = `inline-eq-${inlineFormulaCounter.toString().padStart(3, '0')}`;
        inlineFormulaCounter++;
        return `<inline-formula id="${id}"${attributes}>`;
    });

    // Add IDs to sections that don't already have them
    let sectionCounter = 1;
    xmlContent = xmlContent.replace(/<sec(?!\s+id=)([^>]*)>/g, (match, attributes) => {
        const id = `sec-${sectionCounter.toString().padStart(3, '0')}`;
        sectionCounter++;
        return `<sec id="${id}"${attributes}>`;
    });

    // Write the modified XML back to file
    fs.writeFileSync(xmlFilePath, xmlContent, 'utf-8');

    console.log(`✅ Added unique IDs to XML file:`);
    console.log(`   - Paragraphs: ${paragraphCounter - 1}`);
    console.log(`   - Figures: ${figureCounter - 1}`);
    console.log(`   - Tables: ${tableCounter - 1}`);
    console.log(`   - Display formulas: ${formulaCounter - 1}`);
    console.log(`   - Inline formulas: ${inlineFormulaCounter - 1}`);
    console.log(`   - Sections: ${sectionCounter - 1}`);
}

// Main execution
if (require.main === module) {
    const xmlFilePath = process.argv[2];

    if (!xmlFilePath) {
        console.error('Usage: node add-xml-ids.js <xml-file-path>');
        process.exit(1);
    }

    if (!fs.existsSync(xmlFilePath)) {
        console.error(`Error: XML file not found: ${xmlFilePath}`);
        process.exit(1);
    }

    addUniqueIdsToXml(xmlFilePath);
}

module.exports = { addUniqueIdsToXml };
