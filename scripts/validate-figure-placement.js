#!/usr/bin/env node

/**
 * Validation script for Figure Placement Feature
 * Verifies that configuration is correctly set up
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../server/config/server-config.json');
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${COLORS.reset} ${message}`);
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function error(message) {
  log(COLORS.red, '✗', message);
}

function warning(message) {
  log(COLORS.yellow, '⚠', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

// Main validation
console.log('\n' + COLORS.blue + '═══════════════════════════════════════════════' + COLORS.reset);
console.log(COLORS.blue + '   Figure Placement Feature Validation' + COLORS.reset);
console.log(COLORS.blue + '═══════════════════════════════════════════════' + COLORS.reset + '\n');

let passCount = 0;
let failCount = 0;

try {
  // 1. Check config file exists
  info('Checking configuration file...');
  if (!fs.existsSync(CONFIG_PATH)) {
    error(`Config file not found: ${CONFIG_PATH}`);
    failCount++;
    process.exit(1);
  }
  success('Config file found');
  passCount++;

  // 2. Load and parse JSON
  info('\nValidating JSON syntax...');
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  let config;
  try {
    config = JSON.parse(configContent);
    success('JSON is valid');
    passCount++;
  } catch (e) {
    error(`JSON parse error: ${e.message}`);
    failCount++;
    process.exit(1);
  }

  // 3. Check dropdown options
  info('\nValidating dropdown options...');
  const requiredOptions = ['move_bottom', 'move_top', 'move_left_column'];
  const figureOptions = config.dropdownOptions?.figure || [];
  const foundOptions = figureOptions.map(opt => opt.value);

  requiredOptions.forEach(opt => {
    if (foundOptions.includes(opt)) {
      success(`Found option: ${opt}`);
      passCount++;
    } else {
      error(`Missing option: ${opt}`);
      failCount++;
    }
  });

  // 4. Check XML instruction templates
  info('\nValidating XML instruction templates...');
  const templates = config.xmlInstructionTemplates?.figure || {};
  requiredOptions.forEach(opt => {
    if (templates[opt]) {
      success(`Template for ${opt}: ${templates[opt]}`);
      passCount++;
    } else {
      error(`Missing template for: ${opt}`);
      failCount++;
    }
  });

  // 5. Check XML processing rules
  info('\nValidating XML processing rules...');
  const rules = config.xmlProcessingRules?.figure || {};
  const expectedPlacements = {
    move_bottom: '[b]',
    move_top: '[t]',
    move_left_column: '[!h]'
  };

  requiredOptions.forEach(opt => {
    const rule = rules[opt];
    if (rule) {
      if (rule.attribute === 'placement') {
        if (rule.value === expectedPlacements[opt]) {
          success(`Rule for ${opt}: placement="${rule.value}"`);
          passCount++;
        } else {
          warning(`Unexpected placement value for ${opt}: "${rule.value}" (expected "${expectedPlacements[opt]}")`);
          passCount++;
        }
      } else {
        error(`Invalid rule for ${opt}: attribute should be "placement", got "${rule.attribute}"`);
        failCount++;
      }
    } else {
      error(`Missing processing rule for: ${opt}`);
      failCount++;
    }
  });

  // 6. Check TeX conversion rules
  info('\nValidating TeX conversion rules...');
  const texRules = config.texConversionRules?.figure || {};
  const expectedTexRules = ['placement_t', 'placement_b', 'placement_h', 'default'];
  
  expectedTexRules.forEach(rule => {
    if (texRules[rule]) {
      success(`TeX rule: ${rule} → ${texRules[rule]}`);
      passCount++;
    } else {
      warning(`Missing TeX rule: ${rule}`);
    }
  });

  // 7. Check template files
  info('\nChecking template files...');
  const templates_to_check = [
    '../template/document.tex.xml',
    '../template/ENDEND10921-sample-style.tex.xml'
  ];

  templates_to_check.forEach(template => {
    const templatePath = path.join(__dirname, template);
    if (fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf8');
      if (content.includes('[[@placement]]')) {
        success(`Template ${path.basename(template)} has placement attribute`);
        passCount++;
      } else {
        warning(`Template ${path.basename(template)} missing [[@placement]] attribute`);
      }
    } else {
      warning(`Template not found: ${template}`);
    }
  });

  // 8. Check server modules
  info('\nChecking server modules...');
  const modules = [
    '../server/modules/XMLProcessor.js',
    '../server/modules/DocumentConverter.js',
    '../server/modules/ConfigManager.js'
  ];

  modules.forEach(mod => {
    const modPath = path.join(__dirname, mod);
    if (fs.existsSync(modPath)) {
      success(`Module found: ${path.basename(mod)}`);
      passCount++;
    } else {
      error(`Module missing: ${mod}`);
      failCount++;
    }
  });

  // Summary
  console.log('\n' + COLORS.blue + '═══════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.blue + '   Validation Summary' + COLORS.reset);
  console.log(COLORS.blue + '═══════════════════════════════════════════════' + COLORS.reset);
  console.log(`${COLORS.green}Passed: ${passCount}${COLORS.reset}`);
  if (failCount > 0) {
    console.log(`${COLORS.red}Failed: ${failCount}${COLORS.reset}`);
  }
  console.log('');

  if (failCount === 0) {
    success('All validations passed! Figure placement feature is correctly configured.\n');
    info('Next steps:');
    console.log('  1. Start server: cd server && node server.js');
    console.log('  2. Start UI: cd ui-react && npm run dev');
    console.log('  3. Test figure placement in the UI\n');
    process.exit(0);
  } else {
    error(`Validation failed with ${failCount} error(s)\n`);
    process.exit(1);
  }

} catch (error) {
  error(`Validation error: ${error.message}`);
  console.error(error);
  process.exit(1);
}

