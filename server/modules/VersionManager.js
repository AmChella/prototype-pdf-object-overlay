const Datastore = require('nedb');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * VersionManager - Manages document versions and history
 * 
 * Tracks every instruction/change made to documents and allows
 * users to navigate through version history (revert/forward).
 */
class VersionManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.projectRoot = path.join(__dirname, '../..');
        
        // Initialize NeDB database for version tracking
        const dbPath = path.join(this.projectRoot, 'data/versions.db');
        fs.ensureDirSync(path.dirname(dbPath));
        
        this.db = new Datastore({
            filename: dbPath,
            autoload: true,
            timestampData: true
        });
        
        // Create indexes for faster queries
        this.db.ensureIndex({ fieldName: 'documentName' });
        this.db.ensureIndex({ fieldName: 'versionNumber' });
        this.db.ensureIndex({ fieldName: 'timestamp' });
        
        // Version storage directory
        this.versionsDir = path.join(this.projectRoot, 'data/versions');
        fs.ensureDirSync(this.versionsDir);
        
        console.log('📚 VersionManager initialized');
    }

    /**
     * Generate a unique hash for version identification
     */
    generateVersionHash() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get the current version number for a document
     */
    async getCurrentVersionNumber(documentName) {
        return new Promise((resolve, reject) => {
            this.db.find({ documentName })
                .sort({ versionNumber: -1 })
                .limit(1)
                .exec((err, docs) => {
                    if (err) return reject(err);
                    resolve(docs.length > 0 ? docs[0].versionNumber : 0);
                });
        });
    }

    /**
     * Save a new version after an instruction is processed
     * 
     * @param {Object} versionData - Version metadata and file paths
     * @returns {Promise<Object>} Created version object
     */
    async saveVersion(versionData) {
        const {
            documentName,
            instruction,
            instructionValue,
            elementId,
            overlayType,
            xmlPath,
            texPath,
            pdfPath,
            jsonPath,
            templatePath,
            userId = 'system',
            description = ''
        } = versionData;

        // Get next version number
        const currentVersion = await this.getCurrentVersionNumber(documentName);
        const versionNumber = currentVersion + 1;
        const versionHash = this.generateVersionHash();
        const timestamp = new Date().toISOString();

        // Create version-specific directory
        const versionDir = path.join(this.versionsDir, documentName, `v${versionNumber}_${versionHash}`);
        fs.ensureDirSync(versionDir);

        // Copy files to version directory
        const versionFiles = {
            xml: null,
            tex: null,
            pdf: null,
            json: null,
            template: null
        };

        try {
            // Copy XML
            if (xmlPath && await fs.pathExists(xmlPath)) {
                const xmlDest = path.join(versionDir, 'document.xml');
                await fs.copyFile(xmlPath, xmlDest);
                versionFiles.xml = xmlDest;
            }

            // Copy TeX
            if (texPath && await fs.pathExists(texPath)) {
                const texDest = path.join(versionDir, 'document.tex');
                await fs.copyFile(texPath, texDest);
                versionFiles.tex = texDest;
            }

            // Copy PDF
            if (pdfPath && await fs.pathExists(pdfPath)) {
                const pdfDest = path.join(versionDir, 'document.pdf');
                await fs.copyFile(pdfPath, pdfDest);
                versionFiles.pdf = pdfDest;
            }

            // Copy JSON coordinates
            if (jsonPath && await fs.pathExists(jsonPath)) {
                const jsonDest = path.join(versionDir, 'coordinates.json');
                await fs.copyFile(jsonPath, jsonDest);
                versionFiles.json = jsonDest;
            }

            // Copy Template
            if (templatePath && await fs.pathExists(templatePath)) {
                const templateDest = path.join(versionDir, 'template.tex.xml');
                await fs.copyFile(templatePath, templateDest);
                versionFiles.template = templateDest;
            }

            // Save version metadata to database
            const versionDoc = {
                documentName,
                versionNumber,
                versionHash,
                timestamp,
                userId,
                description,
                instruction: {
                    type: instruction,
                    value: instructionValue,
                    elementId,
                    overlayType
                },
                files: versionFiles,
                versionDir,
                isActive: true, // Mark as current active version
                parentVersion: currentVersion > 0 ? currentVersion : null
            };

            // Mark previous versions as inactive
            await this.markPreviousVersionsInactive(documentName);

            return new Promise((resolve, reject) => {
                this.db.insert(versionDoc, (err, newDoc) => {
                    if (err) return reject(err);
                    console.log(`✅ Version ${versionNumber} saved for ${documentName}`);
                    resolve(newDoc);
                });
            });

        } catch (error) {
            console.error('❌ Error saving version:', error);
            throw error;
        }
    }

    /**
     * Mark all previous versions of a document as inactive
     */
    async markPreviousVersionsInactive(documentName) {
        return new Promise((resolve, reject) => {
            this.db.update(
                { documentName, isActive: true },
                { $set: { isActive: false } },
                { multi: true },
                (err, numUpdated) => {
                    if (err) return reject(err);
                    resolve(numUpdated);
                }
            );
        });
    }

    /**
     * Get version history for a document
     */
    async getVersionHistory(documentName, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.find({ documentName })
                .sort({ versionNumber: -1 })
                .limit(limit)
                .exec((err, docs) => {
                    if (err) return reject(err);
                    resolve(docs);
                });
        });
    }

    /**
     * Get a specific version by version number
     */
    async getVersion(documentName, versionNumber) {
        return new Promise((resolve, reject) => {
            this.db.findOne({ documentName, versionNumber }, (err, doc) => {
                if (err) return reject(err);
                resolve(doc);
            });
        });
    }

    /**
     * Get the active (current) version
     */
    async getActiveVersion(documentName) {
        return new Promise((resolve, reject) => {
            this.db.findOne({ documentName, isActive: true }, (err, doc) => {
                if (err) return reject(err);
                resolve(doc);
            });
        });
    }

    /**
     * Restore a specific version (revert operation)
     * 
     * @param {string} documentName - Document identifier
     * @param {number} targetVersion - Version number to restore
     * @returns {Promise<Object>} Restored version data
     */
    async restoreVersion(documentName, targetVersion) {
        try {
            const version = await this.getVersion(documentName, targetVersion);
            
            if (!version) {
                throw new Error(`Version ${targetVersion} not found for ${documentName}`);
            }

            // Copy version files back to working directory
            const restoredFiles = {};

            if (version.files.xml && await fs.pathExists(version.files.xml)) {
                const xmlDest = path.join(this.projectRoot, 'xml', `${documentName}.xml`);
                await fs.copyFile(version.files.xml, xmlDest);
                restoredFiles.xml = xmlDest;
            }

            if (version.files.pdf && await fs.pathExists(version.files.pdf)) {
                const pdfDest = path.join(this.projectRoot, 'ui', `${documentName}-generated.pdf`);
                await fs.copyFile(version.files.pdf, pdfDest);
                restoredFiles.pdf = pdfDest;
            }

            if (version.files.json && await fs.pathExists(version.files.json)) {
                const jsonDest = path.join(this.projectRoot, 'ui', `${documentName}-generated-marked-boxes.json`);
                await fs.copyFile(version.files.json, jsonDest);
                restoredFiles.json = jsonDest;
            }

            // Mark this version as active
            await this.markPreviousVersionsInactive(documentName);
            await new Promise((resolve, reject) => {
                this.db.update(
                    { _id: version._id },
                    { $set: { isActive: true } },
                    {},
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });

            console.log(`⏮️  Restored to version ${targetVersion} for ${documentName}`);

            return {
                success: true,
                version: version.versionNumber,
                timestamp: version.timestamp,
                files: restoredFiles,
                instruction: version.instruction
            };

        } catch (error) {
            console.error('❌ Error restoring version:', error);
            throw error;
        }
    }

    /**
     * Get version diff information
     */
    async getVersionDiff(documentName, fromVersion, toVersion) {
        try {
            const from = await this.getVersion(documentName, fromVersion);
            const to = await this.getVersion(documentName, toVersion);

            if (!from || !to) {
                throw new Error('One or both versions not found');
            }

            return {
                fromVersion: from.versionNumber,
                toVersion: to.versionNumber,
                fromTimestamp: from.timestamp,
                toTimestamp: to.timestamp,
                instructionChanges: {
                    from: from.instruction,
                    to: to.instruction
                }
            };

        } catch (error) {
            console.error('❌ Error getting version diff:', error);
            throw error;
        }
    }

    /**
     * Delete old versions (cleanup)
     * Keep only the last N versions
     */
    async cleanupOldVersions(documentName, keepLast = 20) {
        try {
            const history = await this.getVersionHistory(documentName, 1000);
            
            if (history.length <= keepLast) {
                return { deleted: 0, kept: history.length };
            }

            const versionsToDelete = history.slice(keepLast);
            let deletedCount = 0;

            for (const version of versionsToDelete) {
                // Delete version directory
                if (await fs.pathExists(version.versionDir)) {
                    await fs.remove(version.versionDir);
                }

                // Delete from database
                await new Promise((resolve, reject) => {
                    this.db.remove({ _id: version._id }, {}, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                deletedCount++;
            }

            console.log(`🧹 Cleaned up ${deletedCount} old versions for ${documentName}`);

            return { deleted: deletedCount, kept: keepLast };

        } catch (error) {
            console.error('❌ Error cleaning up versions:', error);
            throw error;
        }
    }

    /**
     * Get version statistics
     */
    async getVersionStats(documentName) {
        return new Promise((resolve, reject) => {
            this.db.find({ documentName }, (err, docs) => {
                if (err) return reject(err);
                
                const stats = {
                    totalVersions: docs.length,
                    oldestVersion: docs.length > 0 ? Math.min(...docs.map(d => d.versionNumber)) : 0,
                    latestVersion: docs.length > 0 ? Math.max(...docs.map(d => d.versionNumber)) : 0,
                    totalSize: 0 // Could calculate disk usage if needed
                };
                
                resolve(stats);
            });
        });
    }
}

module.exports = VersionManager;

