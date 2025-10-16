const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = null;
        this.configPath = path.join(__dirname, '../config/server-config.json');
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            console.log('✅ Configuration loaded successfully');
            return this.config;
        } catch (error) {
            console.error('❌ Failed to load configuration:', error);
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    getConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }

    getDropdownOptions(overlayType) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        return this.config.dropdownOptions[overlayType] || null;
    }

    getAllDropdownOptions() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        return this.config.dropdownOptions;
    }

    getXMLInstructionTemplate(overlayType, action) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        const templates = this.config.xmlInstructionTemplates[overlayType];
        return templates ? templates[action] : null;
    }

    getXMLProcessingRule(overlayType, action) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        const rules = this.config.xmlProcessingRules[overlayType];
        return rules ? rules[action] : null;
    }

    getTexConversionRule(overlayType, ruleKey) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        const rules = this.config.texConversionRules[overlayType];
        return rules ? (rules[ruleKey] || rules.default) : null;
    }

    getFileSettings() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        return this.config.fileSettings;
    }

    getFilePath(fileKey) {
        const settings = this.getFileSettings();
        return settings[fileKey] ? path.join(process.cwd(), settings[fileKey]) : null;
    }

    // Update configuration (useful for dynamic configuration)
    async updateDropdownOptions(overlayType, options) {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        
        this.config.dropdownOptions[overlayType] = options;
        await this.saveConfig();
    }

    async saveConfig() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('✅ Configuration saved successfully');
        } catch (error) {
            console.error('❌ Failed to save configuration:', error);
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }

    // Validate configuration
    validateConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }

        const requiredSections = [
            'dropdownOptions',
            'xmlInstructionTemplates',
            'xmlProcessingRules',
            'texConversionRules',
            'fileSettings'
        ];

        for (const section of requiredSections) {
            if (!this.config[section]) {
                throw new Error(`Missing configuration section: ${section}`);
            }
        }

        console.log('✅ Configuration validation passed');
        return true;
    }

    // Get template with variable substitution
    getProcessedTemplate(overlayType, action, variables = {}) {
        const template = this.getXMLInstructionTemplate(overlayType, action);
        if (!template) {
            return null;
        }

        let processed = template;
        for (const [key, value] of Object.entries(variables)) {
            processed = processed.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        return processed;
    }
}

module.exports = ConfigManager;