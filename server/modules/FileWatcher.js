const chokidar = require('chokidar');
const path = require('path');

class FileWatcher {
    constructor(configManager) {
        this.configManager = configManager;
        this.watchers = [];
        this.callbacks = [];
    }

    onFileChange(callback) {
        this.callbacks.push(callback);
    }

    start() {
        try {
            const settings = this.configManager.getFileSettings();
            const watchPaths = [
                settings.pdfOutput,
                settings.jsonOutput,
                path.join(settings.uiOutputDir, '*.pdf'),
                path.join(settings.uiOutputDir, '*.json')
            ];

            console.log('👀 Starting file watchers for:', watchPaths);

            const watcher = chokidar.watch(watchPaths, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                persistent: true,
                ignoreInitial: true
            });

            watcher
                .on('add', path => this.notifyChange('add', path))
                .on('change', path => this.notifyChange('change', path))
                .on('unlink', path => this.notifyChange('unlink', path))
                .on('error', error => console.error('File watcher error:', error));

            this.watchers.push(watcher);
            console.log('✅ File watchers started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start file watchers:', error);
        }
    }

    notifyChange(eventType, filePath) {
        console.log(`📁 File ${eventType}: ${filePath}`);
        
        // Notify all registered callbacks
        this.callbacks.forEach(callback => {
            try {
                callback(eventType, filePath);
            } catch (error) {
                console.error('❌ Error in file change callback:', error);
            }
        });
    }

    stop() {
        console.log('🛑 Stopping file watchers...');
        
        this.watchers.forEach(watcher => {
            watcher.close();
        });
        
        this.watchers = [];
        console.log('✅ File watchers stopped');
    }
}

module.exports = FileWatcher;