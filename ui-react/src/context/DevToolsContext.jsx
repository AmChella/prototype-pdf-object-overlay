import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const DevToolsContext = createContext();

export const useDevTools = () => {
    const context = useContext(DevToolsContext);
    if (!context) {
        throw new Error('useDevTools must be used within DevToolsProvider');
    }
    return context;
};

export const DevToolsProvider = ({ children }) => {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [panelHeight, setPanelHeight] = useState(300);
    const logIdRef = useRef(0);

    const toggleDevTools = useCallback(() => {
        setIsDevToolsOpen(prev => !prev);
    }, []);

    const openDevTools = useCallback(() => {
        setIsDevToolsOpen(true);
    }, []);

    const closeDevTools = useCallback(() => {
        setIsDevToolsOpen(false);
    }, []);

    /**
     * Add a log entry to the DevTools console
     * @param {string} type - Log type: 'frontend', 'backend', 'websocket', 'error', 'info', 'success'
     * @param {string} message - Log message
     * @param {any} data - Optional data to attach to log
     */
    const addLog = useCallback((type, message, data = null) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const newLog = {
            id: ++logIdRef.current,
            type,
            message,
            data,
            timestamp,
            fullTimestamp: new Date().toISOString()
        };

        setLogs(prev => [...prev, newLog]);

        // Also log to browser console
        const prefix = `[DevTools ${type.toUpperCase()}]`;
        if (type === 'error') {
            console.error(prefix, message, data || '');
        } else {
            console.log(prefix, message, data || '');
        }
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const clearLogsByType = useCallback((type) => {
        setLogs(prev => prev.filter(log => log.type !== type));
    }, []);

    const value = {
        // State
        isDevToolsOpen,
        logs,
        panelHeight,

        // Setters
        setPanelHeight,

        // Actions
        toggleDevTools,
        openDevTools,
        closeDevTools,
        addLog,
        clearLogs,
        clearLogsByType
    };

    return (
        <DevToolsContext.Provider value={value}>
            {children}
        </DevToolsContext.Provider>
    );
};

export default DevToolsContext;
