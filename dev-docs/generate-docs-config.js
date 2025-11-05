#!/usr/bin/env node

/**
 * Automatic Documentation Config Generator
 * 
 * Scans dev-docs directory and automatically generates/updates docs-config.json
 * - Discovers all markdown files
 * - Extracts titles and descriptions from file content
 * - Categorizes by directory structure
 * - Maintains changelog and metadata
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = __dirname;
const CONFIG_FILE = path.join(DOCS_DIR, 'docs-config.json');
const BACKUP_FILE = path.join(DOCS_DIR, 'docs-config.backup.json');

// Directory to category mapping
const CATEGORY_MAP = {
  'api': {
    id: 'api-reference',
    name: '🌐 API Reference',
    description: 'Complete API documentation for integration'
  },
  'features': {
    id: 'features',
    name: '✨ Features',
    description: 'In-depth documentation for key application features'
  },
  'guides': {
    id: 'how-to-guides',
    name: '📝 How-To Guides',
    description: 'Practical step-by-step guides for common tasks'
  },
  'implementation': {
    id: 'implementation-summaries',
    name: '📋 Implementation Summaries',
    description: 'Complete implementation summaries for major features'
  },
  'modules': {
    id: 'modules',
    name: '🔧 Core Modules',
    description: 'Deep dives into the application\'s core modules (100% JavaScript)'
  },
  'ui': {
    id: 'ui-documentation',
    name: '🎨 React UI Documentation',
    description: 'Documentation for the React UI components and features'
  },
  'workflows': {
    id: 'workflows',
    name: '🔄 Application Workflows',
    description: 'Understanding the application\'s key workflows'
  }
};

// Core docs (in root directory)
const CORE_DOCS_INFO = {
  'README.md': {
    id: 'dev-guide',
    title: '📘 Application Developer Guide',
    description: 'Main developer guide for PDF Object Overlay application - Pure JavaScript/Node.js system'
  },
  'GETTING-STARTED.md': {
    id: 'getting-started',
    title: '🚀 Development Environment Setup',
    description: 'Setup Node.js and LuaLaTeX (Python not required)'
  },
  'ARCHITECTURE.md': {
    id: 'architecture',
    title: '🏗️ Application Architecture',
    description: 'XML→PDF pipeline, coordinate system, version control, and module architecture'
  },
  'CONTRIBUTING.md': {
    id: 'contributing',
    title: '🤝 Contributing to the Application',
    description: 'How to contribute features, bug fixes, and improvements'
  }
};

/**
 * Extract title from markdown file (first # heading)
 */
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract description from markdown file (first paragraph after title)
 */
function extractDescription(content) {
  const lines = content.split('\n');
  let afterTitle = false;
  
  for (const line of lines) {
    if (line.match(/^#\s+/)) {
      afterTitle = true;
      continue;
    }
    
    if (afterTitle && line.trim() && !line.match(/^[#*-]/)) {
      return line.trim().substring(0, 150);
    }
  }
  
  return 'Documentation file';
}

/**
 * Generate ID from filename
 */
function generateId(filename) {
  return filename
    .replace('.md', '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate tags from filename and directory
 */
function generateTags(filename, directory) {
  const tags = [];
  
  // Add directory-based tags
  if (directory === 'guides') tags.push('guide');
  if (directory === 'ui') tags.push('react', 'ui');
  if (directory === 'features') tags.push('feature');
  if (directory === 'implementation') tags.push('implementation', 'summary');
  
  // Add filename-based tags
  const lower = filename.toLowerCase();
  if (lower.includes('quickstart') || lower.includes('quick-start')) tags.push('quickstart');
  if (lower.includes('fix')) tags.push('fix');
  if (lower.includes('debug')) tags.push('debugging');
  if (lower.includes('troubleshoot')) tags.push('troubleshooting');
  if (lower.includes('migration')) tags.push('migration');
  if (lower.includes('version')) tags.push('version-control');
  if (lower.includes('react')) tags.push('react');
  if (lower.includes('component')) tags.push('component');
  if (lower.includes('ui')) tags.push('ui');
  
  return tags.length > 0 ? tags : undefined;
}

/**
 * Scan directory for markdown files
 */
function scanDirectory(dirPath, relativePath = '') {
  const files = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile() && item.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const title = extractTitle(content);
      const description = extractDescription(content);
      const filename = item;
      const relativeFile = relativePath ? path.join(relativePath, item) : item;
      
      files.push({
        filename,
        title,
        description,
        path: fullPath,
        relativePath: relativeFile,
        content
      });
    }
  }
  
  return files;
}

/**
 * Generate documentation config
 */
function generateConfig() {
  console.log('🔍 Scanning dev-docs directory...\n');
  
  const categories = [];
  const stats = {
    totalFiles: 0,
    byCategory: {}
  };
  
  // Add core docs category
  const coreDocsFiles = [];
  for (const [filename, info] of Object.entries(CORE_DOCS_INFO)) {
    const filePath = path.join(DOCS_DIR, filename);
    if (fs.existsSync(filePath)) {
      coreDocsFiles.push({
        id: info.id,
        title: info.title,
        description: info.description,
        file: `./${filename}`
      });
      stats.totalFiles++;
    }
  }
  
  if (coreDocsFiles.length > 0) {
    categories.push({
      id: 'core-guides',
      name: '📘 Core Developer Guides',
      description: 'Essential guides to get started with application development',
      docs: coreDocsFiles
    });
    stats.byCategory['core-guides'] = coreDocsFiles.length;
  }
  
  // Scan subdirectories
  const subdirs = fs.readdirSync(DOCS_DIR).filter(item => {
    const fullPath = path.join(DOCS_DIR, item);
    return fs.statSync(fullPath).isDirectory() && CATEGORY_MAP[item];
  });
  
  for (const subdir of subdirs) {
    const categoryInfo = CATEGORY_MAP[subdir];
    const dirPath = path.join(DOCS_DIR, subdir);
    const files = scanDirectory(dirPath, subdir);
    
    if (files.length > 0) {
      const docs = files.map(file => {
        const doc = {
          id: generateId(file.filename),
          title: file.title || file.filename.replace('.md', ''),
          description: file.description,
          file: `./${file.relativePath}`
        };
        
        const tags = generateTags(file.filename, subdir);
        if (tags) {
          doc.tags = tags;
        }
        
        return doc;
      }).sort((a, b) => a.title.localeCompare(b.title));
      
      categories.push({
        id: categoryInfo.id,
        name: categoryInfo.name,
        description: categoryInfo.description,
        docs
      });
      
      stats.totalFiles += docs.length;
      stats.byCategory[categoryInfo.id] = docs.length;
      
      console.log(`✅ ${categoryInfo.name}: ${docs.length} files`);
    }
  }
  
  // Load existing config to preserve changelog
  let existingConfig = null;
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (err) {
      console.warn('⚠️  Could not parse existing config:', err.message);
    }
  }
  
  // Generate new config
  const config = {
    title: 'PDF Object Overlay - Developer Documentation',
    version: existingConfig?.version || '3.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    totalFiles: stats.totalFiles,
    generatedAt: new Date().toISOString(),
    autoGenerated: true,
    technologies: [
      'Node.js',
      'Express',
      'WebSocket',
      'LuaLaTeX',
      'NeDB',
      'React'
    ],
    categories,
    changelog: existingConfig?.changelog || [],
    quickLinks: [
      {
        title: '🚀 Quick Start',
        url: './GETTING-STARTED.md',
        description: 'Get up and running in minutes'
      },
      {
        title: '📚 Version Control',
        url: './features/VERSION-CONTROL.md',
        description: 'Document version management system'
      },
      {
        title: '🌐 WebSocket API',
        url: './modules/SERVER.md#websocket-protocol',
        description: 'Real-time API for document operations'
      },
      {
        title: '🏗️ Architecture',
        url: './ARCHITECTURE.md',
        description: 'System design and data flow'
      }
    ]
  };
  
  return { config, stats };
}

/**
 * Main execution
 */
function main() {
  console.log('');
  console.log('📚 Documentation Config Generator');
  console.log('==================================\n');
  
  try {
    // Backup existing config
    if (fs.existsSync(CONFIG_FILE)) {
      fs.copyFileSync(CONFIG_FILE, BACKUP_FILE);
      console.log(`💾 Backed up existing config to: ${path.basename(BACKUP_FILE)}\n`);
    }
    
    // Generate new config
    const { config, stats } = generateConfig();
    
    // Write config file
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
    
    console.log('');
    console.log('📊 Generation Summary:');
    console.log('======================');
    console.log(`📁 Total Files: ${stats.totalFiles}`);
    console.log(`📂 Categories: ${config.categories.length}`);
    console.log('');
    
    for (const [category, count] of Object.entries(stats.byCategory)) {
      console.log(`   ${category}: ${count} files`);
    }
    
    console.log('');
    console.log(`✅ Successfully generated: ${path.basename(CONFIG_FILE)}`);
    console.log(`📝 Version: ${config.version}`);
    console.log(`📅 Generated: ${config.generatedAt}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error generating config:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { generateConfig, main };

