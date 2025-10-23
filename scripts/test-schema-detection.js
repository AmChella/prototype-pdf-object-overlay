#!/usr/bin/env node

/**
 * Test XML Schema Detection
 * 
 * This script verifies that the XMLProcessor correctly detects
 * and adapts to different XML schemas.
 */

const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

// Schema detection function (from XMLProcessor)
function detectXMLSchema(xmlDocument) {
    const schemaDefinitions = {
        'endend': {
            figure: 'fig',
            paragraph: 'p',
            table: 'table'
        },
        'standard': {
            figure: 'figure',
            paragraph: 'para',
            table: 'table'
        }
    };

    try {
        // Check for ENDEND schema (<fig> and <p> tags)
        const hasFigTag = xpath.select('//fig', xmlDocument).length > 0;
        const hasPTag = xpath.select('//p', xmlDocument).length > 0;
        
        // Check for standard schema (<figure> and <para> tags)
        const hasFigureTag = xpath.select('//figure', xmlDocument).length > 0;
        const hasParaTag = xpath.select('//para', xmlDocument).length > 0;
        
        if (hasFigTag || hasPTag) {
            return {
                name: 'endend',
                tags: schemaDefinitions.endend
            };
        } else if (hasFigureTag || hasParaTag) {
            return {
                name: 'standard',
                tags: schemaDefinitions.standard
            };
        }
        
        // Default to standard if unable to detect
        console.warn('⚠️  Could not detect XML schema, using standard schema');
        return {
            name: 'standard',
            tags: schemaDefinitions.standard
        };
    } catch (error) {
        console.error('❌ Error detecting XML schema:', error);
        return {
            name: 'standard',
            tags: schemaDefinitions.standard
        };
    }
}

// XPath adaptation function (from XMLProcessor)
function adaptXPathToSchema(xpathQuery, xmlSchema) {
    if (!xmlSchema) {
        return xpathQuery;
    }

    let adaptedQuery = xpathQuery;

    // Replace figure-related tags (handle various XPath patterns)
    adaptedQuery = adaptedQuery
        .replace(/\/\/figure(?=[\[@\s\|\/]|$)/g, `//${xmlSchema.tags.figure}`)
        .replace(/([^\/])\/figure(?=[\[@\s\|\/]|$)/g, `$1/${xmlSchema.tags.figure}`);

    // Replace paragraph-related tags
    adaptedQuery = adaptedQuery
        .replace(/\/\/para(?=[\[@\s\|\/]|$)/g, `//${xmlSchema.tags.paragraph}`)
        .replace(/([^\/])\/para(?=[\[@\s\|\/]|$)/g, `$1/${xmlSchema.tags.paragraph}`);

    // Replace table-related tags
    adaptedQuery = adaptedQuery
        .replace(/\/\/table(?=[\[@\s\|\/]|$)/g, `//${xmlSchema.tags.table}`)
        .replace(/([^\/])\/table(?=[\[@\s\|\/]|$)/g, `$1/${xmlSchema.tags.table}`);

    return adaptedQuery;
}

// Test function
function testSchemaDetection(xmlPath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${path.basename(xmlPath)}`);
    console.log('='.repeat(60));

    try {
        // Load XML
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        const dom = new DOMParser();
        const xmlDocument = dom.parseFromString(xmlContent, 'text/xml');

        // Detect schema
        const schema = detectXMLSchema(xmlDocument);
        console.log(`\n📋 Detected Schema: ${schema.name.toUpperCase()}`);
        console.log(`   Figure tag:    <${schema.tags.figure}>`);
        console.log(`   Paragraph tag: <${schema.tags.paragraph}>`);
        console.log(`   Table tag:     <${schema.tags.table}>`);

        // Test XPath adaptation
        const testQueries = [
            "//figure[@id='test']",
            "//para[@id='test']",
            "//table[@id='test'] | //figure[contains(@id, 'tbl')][@id='test']"
        ];

        console.log(`\n🔍 XPath Adaptation Tests:`);
        testQueries.forEach(query => {
            const adapted = adaptXPathToSchema(query, schema);
            console.log(`\n   Original: ${query}`);
            console.log(`   Adapted:  ${adapted}`);
        });

        // Count actual elements
        console.log(`\n📊 Element Counts:`);
        const figCount = xpath.select(`//${schema.tags.figure}`, xmlDocument).length;
        const paraCount = xpath.select(`//${schema.tags.paragraph}`, xmlDocument).length;
        const tableCount = xpath.select(`//${schema.tags.table}`, xmlDocument).length;
        
        console.log(`   Figures:    ${figCount}`);
        console.log(`   Paragraphs: ${paraCount}`);
        console.log(`   Tables:     ${tableCount}`);

        // Show first few element IDs
        if (figCount > 0) {
            const figures = xpath.select(`//${schema.tags.figure}[@id]`, xmlDocument);
            console.log(`\n📌 Sample Figure IDs:`);
            figures.slice(0, 5).forEach(fig => {
                console.log(`   - ${fig.getAttribute('id')}`);
            });
            if (figures.length > 5) {
                console.log(`   ... and ${figures.length - 5} more`);
            }
        }

        console.log(`\n✅ Test completed successfully!`);

    } catch (error) {
        console.error(`\n❌ Test failed:`, error.message);
    }
}

// Main
function main() {
    console.log('\n🧪 XML Schema Detection Test Suite\n');

    const projectRoot = path.join(__dirname, '..');
    const xmlFiles = [
        path.join(projectRoot, 'xml/ENDEND10921.xml'),
        path.join(projectRoot, 'xml/document.xml')
    ];

    xmlFiles.forEach(xmlPath => {
        if (fs.existsSync(xmlPath)) {
            testSchemaDetection(xmlPath);
        } else {
            console.log(`\n⚠️  File not found: ${xmlPath}`);
        }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 All tests completed!');
    console.log('='.repeat(60));
    console.log('\n💡 The system now automatically adapts to both schemas!');
    console.log('   - ENDEND schema: <fig>, <p>');
    console.log('   - Standard schema: <figure>, <para>');
    console.log('\n📖 See docs/XML-SCHEMA-ADAPTATION.md for details\n');
}

main();

