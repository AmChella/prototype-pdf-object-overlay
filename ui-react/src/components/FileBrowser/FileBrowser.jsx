import React, { useState, useMemo } from 'react';
import './FileBrowser.css';

/**
 * FileTreeItem component - renders a single file or folder
 */
const FileTreeItem = ({ node, level = 0, selectedFiles, onSelectFile }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isDirectory = node.type === 'directory';
    const isJSON = node.name.endsWith('.json');
    const isSelected = selectedFiles.includes(node.path);

    const getFileIcon = (name) => {
        if (name.endsWith('.pdf')) return '📄';
        if (name.endsWith('.json')) return '📋';
        if (name.endsWith('.xml')) return '📝';
        if (name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return '🖼️';
        if (name.match(/\.(mp4|webm|mov)$/i)) return '🎬';
        return '📁';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleClick = () => {
        if (isDirectory) {
            setIsExpanded(!isExpanded);
        } else if (isJSON && onSelectFile) {
            onSelectFile(node.path);
        }
    };

    return (
        <div className="file-tree-item">
            <div
                className={`file-tree-row ${isDirectory ? 'directory' : 'file'} ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                {isDirectory ? (
                    <span className="folder-toggle">
                        {isExpanded ? '▼' : '▶'}
                    </span>
                ) : (
                    isJSON && (
                        <input
                            type="checkbox"
                            className="file-checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSelectFile(node.path);
                            }}
                        />
                    )
                )}
                <span className="file-icon">
                    {isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
                </span>
                <span className="file-name">{node.name}</span>
                {!isDirectory && node.size > 0 && (
                    <span className="file-size">{formatSize(node.size)}</span>
                )}
            </div>

            {isDirectory && isExpanded && node.children && (
                <div className="file-tree-children">
                    {node.children.map((child, index) => (
                        <FileTreeItem
                            key={child.path || `${node.name}-${index}`}
                            node={child}
                            level={level + 1}
                            selectedFiles={selectedFiles}
                            onSelectFile={onSelectFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * FileBrowserModal component - displays article files in a modal window
 */
const FileBrowserModal = ({ fileTree, journalId, articleId, onMergeComplete, onClose }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [keyNames, setKeyNames] = useState({}); // Map of filePath to key name
    const [isMerging, setIsMerging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mergedData, setMergedData] = useState(null);
    const [mergedFileName, setMergedFileName] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [windowState, setWindowState] = useState('normal'); // 'normal', 'minimized', 'maximized'

    // Get all JSON files from the tree
    const jsonFiles = useMemo(() => {
        const files = [];
        const collectJSONFiles = (node) => {
            if (node.type === 'file' && node.name.endsWith('.json')) {
                files.push(node);
            }
            if (node.children) {
                node.children.forEach(collectJSONFiles);
            }
        };
        if (fileTree) {
            collectJSONFiles(fileTree);
        }
        return files;
    }, [fileTree]);

    const handleSelectFile = (path) => {
        setSelectedFiles(prev => {
            if (prev.includes(path)) {
                // Remove the key name when deselecting
                const newKeyNames = { ...keyNames };
                delete newKeyNames[path];
                setKeyNames(newKeyNames);
                return prev.filter(p => p !== path);
            } else {
                return [...prev, path];
            }
        });
    };

    const handleKeyNameChange = (path, name) => {
        setKeyNames(prev => ({
            ...prev,
            [path]: name
        }));
    };

    const handleSelectAll = () => {
        if (selectedFiles.length === jsonFiles.length) {
            setSelectedFiles([]);
            setKeyNames({});
        } else {
            setSelectedFiles(jsonFiles.map(f => f.path));
        }
    };

    const handleMerge = async () => {
        if (selectedFiles.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one JSON file to merge' });
            return;
        }

        setIsMerging(true);
        setMessage({ type: '', text: '' });

        try {
            // Only include keyNames if at least one is set
            const hasKeyNames = Object.values(keyNames).some(k => k && k.trim());

            const response = await fetch('http://localhost:8081/api/articles/merge-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journalId,
                    articleId,
                    filePaths: selectedFiles,
                    keyNames: hasKeyNames ? keyNames : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Merge failed');
            }

            setMergedData(data.mergedData);
            setMergedFileName(data.mergedFileName);
            setMessage({ type: 'success', text: `Merged ${selectedFiles.length} files successfully!` });

            if (onMergeComplete) {
                onMergeComplete(data);
            }
        } catch (err) {
            console.error('Merge error:', err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsMerging(false);
        }
    };

    const handleUploadToS3 = async () => {
        if (!mergedData || !mergedFileName) {
            setMessage({ type: 'error', text: 'No merged data to upload' });
            return;
        }

        setIsUploading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('http://localhost:8081/api/articles/upload-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journalId,
                    articleId,
                    fileName: mergedFileName,
                    jsonData: mergedData,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            setMessage({ type: 'success', text: `Uploaded to S3: ${data.s3Path}` });
        } catch (err) {
            console.error('Upload error:', err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = () => {
        if (!mergedData || !mergedFileName) return;

        const blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mergedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleMinimize = () => {
        setWindowState(windowState === 'minimized' ? 'normal' : 'minimized');
    };

    const handleMaximize = () => {
        setWindowState(windowState === 'maximized' ? 'normal' : 'maximized');
    };

    if (!fileTree) return null;

    return (
        <div className={`file-browser-modal ${windowState}`}>
            {/* Title Bar */}
            <div className="modal-titlebar">
                <div className="modal-title">
                    <span className="modal-icon">📂</span>
                    <span>Article Files - {journalId}/{articleId}</span>
                    {jsonFiles.length > 0 && (
                        <span className="json-badge">{jsonFiles.length} JSON</span>
                    )}
                </div>
                <div className="modal-controls">
                    <button
                        className="modal-btn minimize"
                        onClick={handleMinimize}
                        title="Minimize"
                    >
                        <span>─</span>
                    </button>
                    <button
                        className="modal-btn maximize"
                        onClick={handleMaximize}
                        title={windowState === 'maximized' ? 'Restore' : 'Maximize'}
                    >
                        <span>{windowState === 'maximized' ? '❐' : '□'}</span>
                    </button>
                    <button
                        className="modal-btn close"
                        onClick={onClose}
                        title="Close"
                    >
                        <span>✕</span>
                    </button>
                </div>
            </div>

            {/* Modal Body - Hidden when minimized */}
            {windowState !== 'minimized' && (
                <div className="modal-body">
                    {/* File Tree */}
                    <div className="file-tree-container">
                        <FileTreeItem
                            node={fileTree}
                            selectedFiles={selectedFiles}
                            onSelectFile={handleSelectFile}
                        />
                    </div>

                    {/* Key Names Section - Show when files are selected */}
                    {selectedFiles.length > 0 && (
                        <div className="key-names-section">
                            <div className="key-names-header">
                                <span className="key-names-title">🔑 Key Names (optional)</span>
                                <span className="key-names-hint">Wrap each file under a key</span>
                            </div>
                            <div className="key-names-list">
                                {selectedFiles.map(filePath => {
                                    const fileName = filePath.split('/').pop().replace('.json', '');
                                    return (
                                        <div key={filePath} className="key-name-row">
                                            <span className="key-file-name" title={filePath}>{fileName}</span>
                                            <input
                                                type="text"
                                                className="key-name-input"
                                                placeholder={fileName}
                                                value={keyNames[filePath] || ''}
                                                onChange={(e) => handleKeyNameChange(filePath, e.target.value)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {jsonFiles.length > 0 && (
                        <div className="file-browser-actions">
                            <div className="selection-controls">
                                <button
                                    className="btn-secondary"
                                    onClick={handleSelectAll}
                                >
                                    {selectedFiles.length === jsonFiles.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="selection-count">
                                    {selectedFiles.length} selected
                                </span>
                            </div>

                            <div className="merge-controls">
                                <button
                                    className={`btn-primary ${isMerging ? 'loading' : ''}`}
                                    onClick={handleMerge}
                                    disabled={isMerging || selectedFiles.length === 0}
                                >
                                    {isMerging ? '🔄 Merging...' : '🔀 Merge'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.type === 'error' ? '❌' : '✅'} {message.text}
                        </div>
                    )}

                    {/* Merged Result */}
                    {mergedData && (
                        <div className="merged-result">
                            <h4>📋 {mergedFileName}</h4>
                            <div className="merged-preview">
                                <pre>{JSON.stringify(mergedData, null, 2).slice(0, 300)}...</pre>
                            </div>
                            <div className="merged-actions">
                                <button className="btn-secondary" onClick={handleDownload}>
                                    💾 Download
                                </button>
                                <button
                                    className={`btn-primary ${isUploading ? 'loading' : ''}`}
                                    onClick={handleUploadToS3}
                                    disabled={isUploading}
                                >
                                    {isUploading ? '🔄...' : '☁️ Upload'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileBrowserModal;
