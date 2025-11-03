#!/usr/bin/env node

/**
 * Test script for Figure Column Placement feature
 * Tests XML element repositioning for left/right column control
 */

const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');
const xpath = require('xpath');

const XML_PATH = path.join(__dirname, '../xml/document.xml');

console.log('🧪 Testing Figure Column Placement\n');

// 1. Load XML
console.log('📄 Loading XML document...');
const xmlContent = fs.readFileSync(XML_PATH, 'utf8');
const parser = new DOMParser();
const doc = parser.parseFromString(xmlContent, 'text/xml');
console.log('✅ XML loaded\n');

// 2. Find figure element
console.log('🔍 Finding figure element...');
const figureNodes = xpath.select("//figure[@id='fig-sec1']", doc);
if (figureNodes.length === 0) {
    console.log('❌ Figure not found');
    process.exit(1);
}
const figure = figureNodes[0];
console.log(`✅ Found: <${figure.tagName} id="${figure.getAttribute('id')}">`);

// 3. Get current parent and position
const parent = figure.parentNode;
console.log(`   Parent: <${parent.tagName} id="${parent.getAttribute('id') || 'none'}">`);

const siblings = Array.from(parent.childNodes).filter(n => n.nodeType === 1);
const currentIndex = siblings.indexOf(figure);
console.log(`   Position: ${currentIndex + 1} of ${siblings.length} children\n`);

// 4. Test: Move to section start
console.log('🔄 TEST 1: Move figure to section start');
const figureClone = figure.cloneNode(true);
figure.parentNode.removeChild(figure);

// Find insertion point (after title, note)
let insertionPoint = null;
const afterTags = ['title', 'note'];
for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1 && !afterTags.includes(child.tagName)) {
        insertionPoint = child;
        break;
    }
}

if (insertionPoint) {
    parent.insertBefore(figureClone, insertionPoint);
    console.log(`✅ Moved before <${insertionPoint.tagName}>`);
} else {
    parent.appendChild(figureClone);
    console.log('✅ Appended to parent');
}

const newSiblings = Array.from(parent.childNodes).filter(n => n.nodeType === 1);
const newIndex = newSiblings.indexOf(figureClone);
console.log(`   New position: ${newIndex + 1} of ${newSiblings.length} children`);

// Show position relative to content elements
const beforeFigure = newSiblings.slice(0, newIndex).filter(n => n.tagName === 'para').length;
const afterFigure = newSiblings.slice(newIndex + 1).filter(n => n.tagName === 'para').length;
console.log(`   Before figure: ${beforeFigure} paragraphs`);
console.log(`   After figure: ${afterFigure} paragraphs\n`);

// 5. Expected behavior
console.log('📊 Expected Behavior:');
console.log('   - Figure near start → LEFT column (early in text flow)');
console.log('   - Figure near end → RIGHT column (late in text flow)');
console.log('   - Current: ' + (beforeFigure < afterFigure / 2 ? 'LEFT column likely ✅' : 'RIGHT column likely'));
console.log('\n');

// 6. Serialize result (don't save, just show)
const serializer = new XMLSerializer();
const figureXml = serializer.serializeToString(figureClone);
console.log('📋 Modified Figure XML:');
console.log(figureXml.substring(0, 150) + '...\n');

console.log('✅ Test completed successfully!');
console.log('\n💡 To actually move figures in the UI:');
console.log('   1. Start server: cd server && node server.js');
console.log('   2. Start UI: cd ui-react && npm run dev');
console.log('   3. Select figure → Choose "Move to Section Start (Left Column)"');
console.log('   4. Or choose "Move to Section End (Right Column)"');

