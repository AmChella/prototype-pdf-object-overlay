const fs = require('fs-extra');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');
const xpath = require('xpath');

class XMLProcessor {
    constructor(configManager) {
        this.configManager = configManager;
        this.dom = null;
        this.xmlDocument = null;
    }

    async loadXMLDocument() {
        try {
            const xmlPath = this.configManager.getFilePath('xmlInput');
            if (!xmlPath || !await fs.pathExists(xmlPath)) {
                throw new Error(`XML file not found: ${xmlPath}`);
            }

            const xmlContent = await fs.readFile(xmlPath, 'utf8');
            this.dom = new DOMParser();
            this.xmlDocument = this.dom.parseFromString(xmlContent, 'text/xml');

            console.log(`✅ XML document loaded: ${xmlPath}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load XML document:', error);
            throw error;
        }
    }

    async saveXMLDocument() {
        try {
            if (!this.xmlDocument) {
                throw new Error('No XML document loaded');
            }

            const serializer = new XMLSerializer();
            const xmlString = serializer.serializeToString(this.xmlDocument);

            // Format the XML nicely
            const formattedXml = this.formatXML(xmlString);

            const xmlPath = this.configManager.getFilePath('xmlInput');
            await fs.writeFile(xmlPath, formattedXml, 'utf8');

            console.log(`✅ XML document saved: ${xmlPath}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save XML document:', error);
            throw error;
        }
    }

    async applyInstruction(elementId, overlayType, action, instructionValue = null) {
        try {
            console.log(`🎯 Applying instruction: ${overlayType}.${action} to element ${elementId}`);

            // Load XML document if not already loaded
            if (!this.xmlDocument) {
                await this.loadXMLDocument();
            }

            // Get processing rule for this instruction
            const rule = this.configManager.getXMLProcessingRule(overlayType, action);
            if (!rule) {
                throw new Error(`No processing rule found for ${overlayType}.${action}`);
            }

            // Apply the instruction using the rule
            const result = await this.applyProcessingRule(elementId, rule, instructionValue);

            if (result.success) {
                // Save the modified XML
                await this.saveXMLDocument();

                // Log the change for audit trail
                this.logInstruction(elementId, overlayType, action, instructionValue);
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to apply instruction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async applyProcessingRule(elementId, rule, instructionValue) {
        try {
            // Replace placeholders in xpath
            const xpathQuery = rule.xpath.replace('{elementId}', elementId);

            console.log(`🔍 XPath query: ${xpathQuery}`);

            // Find elements matching the xpath
            const nodes = xpath.select(xpathQuery, this.xmlDocument);

            if (!nodes || nodes.length === 0) {
                throw new Error(`No elements found matching xpath: ${xpathQuery}`);
            }

            console.log(`📍 Found ${nodes.length} matching element(s)`);

            // Apply the operation to each matching node
            let modifiedCount = 0;
            for (const node of nodes) {
                const success = this.applyOperation(node, rule, instructionValue);
                if (success) {
                    modifiedCount++;
                }
            }

            return {
                success: true,
                message: `Successfully modified ${modifiedCount} element(s)`,
                modifiedCount
            };
        } catch (error) {
            console.error('❌ Failed to apply processing rule:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    applyOperation(node, rule, instructionValue) {
        try {
            switch (rule.operation) {
                case 'setAttribute':
                    const value = instructionValue || rule.value;
                    node.setAttribute(rule.attribute, value);
                    console.log(`✅ Set attribute ${rule.attribute}="${value}" on element ${node.tagName}`);
                    return true;

                case 'setTextContent':
                    const content = instructionValue || rule.content;
                    node.textContent = content;
                    console.log(`✅ Set text content "${content}" on element ${node.tagName}`);
                    return true;

                case 'addChild':
                    const childElement = this.xmlDocument.createElement(rule.childTag);
                    if (rule.childAttributes) {
                        for (const [attr, val] of Object.entries(rule.childAttributes)) {
                            childElement.setAttribute(attr, val);
                        }
                    }
                    if (rule.childContent) {
                        childElement.textContent = rule.childContent;
                    }
                    node.appendChild(childElement);
                    console.log(`✅ Added child element ${rule.childTag} to ${node.tagName}`);
                    return true;

                case 'wrapElement':
                    const wrapper = this.xmlDocument.createElement(rule.wrapperTag);
                    if (rule.wrapperAttributes) {
                        for (const [attr, val] of Object.entries(rule.wrapperAttributes)) {
                            wrapper.setAttribute(attr, val);
                        }
                    }
                    const parent = node.parentNode;
                    parent.insertBefore(wrapper, node);
                    wrapper.appendChild(node);
                    console.log(`✅ Wrapped element ${node.tagName} with ${rule.wrapperTag}`);
                    return true;

                default:
                    console.warn(`⚠️ Unknown operation: ${rule.operation}`);
                    return false;
            }
        } catch (error) {
            console.error(`❌ Failed to apply operation ${rule.operation}:`, error);
            return false;
        }
    }

    // Detect overlay type from element ID
    detectOverlayType(elementId) {
        if (elementId.startsWith('fig-') || elementId.includes('figure')) {
            return 'figure';
        } else if (elementId.startsWith('tbl-') || elementId.includes('table')) {
            return 'table';
        } else if (elementId.includes('-p') || elementId.startsWith('sec') || elementId.includes('para')) {
            return 'paragraph';
        }
        return 'unknown';
    }

    // Get element information
    getElementInfo(elementId) {
        try {
            if (!this.xmlDocument) {
                throw new Error('No XML document loaded');
            }

            const xpathQuery = `//*[@id='${elementId}']`;
            const nodes = xpath.select(xpathQuery, this.xmlDocument);

            if (!nodes || nodes.length === 0) {
                return null;
            }

            const node = nodes[0];
            return {
                id: elementId,
                tagName: node.tagName,
                attributes: this.getNodeAttributes(node),
                overlayType: this.detectOverlayType(elementId),
                hasChildren: node.childNodes && node.childNodes.length > 0
            };
        } catch (error) {
            console.error('❌ Failed to get element info:', error);
            return null;
        }
    }

    getNodeAttributes(node) {
        const attributes = {};
        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes.item(i);
                attributes[attr.name] = attr.value;
            }
        }
        return attributes;
    }

    // Format XML for better readability
    formatXML(xmlString) {
        const PADDING = '  '; // 2 spaces for indentation
        const reg = /(>)(<)(\/*)/g;
        let formatted = xmlString.replace(reg, '$1\r\n$2$3');
        let pad = 0;

        return formatted.split('\r\n').map(line => {
            let indent = 0;
            if (line.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (line.match(/^<\/\w/) && pad !== 0) {
                pad -= 1;
            } else if (line.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }

            const padding = PADDING.repeat(pad);
            pad += indent;

            return padding + line;
        }).join('\r\n');
    }

    // Log instruction for audit trail
    logInstruction(elementId, overlayType, action, instructionValue) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            elementId,
            overlayType,
            action,
            instructionValue,
            user: process.env.USER || 'system'
        };

        console.log('📝 Instruction applied:', logEntry);

        // Optionally save to audit log file
        this.saveToAuditLog(logEntry);
    }

    async saveToAuditLog(logEntry) {
        try {
            const logFile = path.join(process.cwd(), 'server', 'logs', 'audit.log');
            await fs.ensureDir(path.dirname(logFile));

            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.warn('⚠️ Failed to save audit log:', error.message);
        }
    }

    // Get all elements that can be modified
    async getAllModifiableElements() {
        try {
            if (!this.xmlDocument) {
                await this.loadXMLDocument();
            }

            // Find all elements with IDs that match our patterns
            const xpathQuery = '//*[@id]';
            const nodes = xpath.select(xpathQuery, this.xmlDocument);

            return nodes.map(node => this.getElementInfo(node.getAttribute('id')))
                       .filter(info => info && info.overlayType !== 'unknown');
        } catch (error) {
            console.error('❌ Failed to get modifiable elements:', error);
            return [];
        }
    }
}

module.exports = XMLProcessor;