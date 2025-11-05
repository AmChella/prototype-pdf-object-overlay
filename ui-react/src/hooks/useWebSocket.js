import { useState, useEffect, useCallback, useRef } from 'react';

export const useWebSocket = (url, handlers = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const handlersRef = useRef(handlers);
  
  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        if (handlersRef.current.onConnect) {
          handlersRef.current.onConnect();
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'config':
              setConfig(data);
              if (handlersRef.current.onConfig) {
                handlersRef.current.onConfig(data);
              }
              break;
              
            case 'file_change':
              if (handlersRef.current.onFileChange) {
                handlersRef.current.onFileChange(data);
              }
              break;
              
            case 'generation_progress':
            case 'processing_progress':
            case 'progress':
              if (handlersRef.current.onProgress) {
                handlersRef.current.onProgress(data);
              }
              break;
              
            case 'generation_complete':
            case 'complete':
              if (handlersRef.current.onComplete) {
                handlersRef.current.onComplete(data);
              }
              break;
              
            case 'generation_error':
            case 'error':
              if (handlersRef.current.onError) {
                handlersRef.current.onError(data);
              }
              break;
              
            case 'processing_started':
              if (handlersRef.current.onProcessingStarted) {
                handlersRef.current.onProcessingStarted(data);
              }
              break;
              
            case 'processing_complete':
              if (handlersRef.current.onProcessingComplete) {
                handlersRef.current.onProcessingComplete(data);
              }
              break;
              
            case 'processing_error':
              if (handlersRef.current.onProcessingError) {
                handlersRef.current.onProcessingError(data);
              }
              break;
              
            case 'version_history':
            case 'versionHistory':
              if (handlersRef.current.onVersionHistory) {
                handlersRef.current.onVersionHistory(data);
              }
              break;
              
            case 'version_stats':
            case 'versionStats':
              if (handlersRef.current.onVersionStats) {
                handlersRef.current.onVersionStats(data);
              }
              break;
              
            case 'version_restored':
            case 'versionRestored':
              if (handlersRef.current.onVersionRestored) {
                handlersRef.current.onVersionRestored(data);
              }
              break;
              
            case 'restore_error':
            case 'versionError':
              if (handlersRef.current.onVersionError) {
                handlersRef.current.onVersionError(data);
              }
              break;
              
            default:
              if (handlersRef.current.onMessage) {
                handlersRef.current.onMessage(data);
              }
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        setError(err);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        
        if (handlersRef.current.onDisconnect) {
          handlersRef.current.onDisconnect();
        }
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('❌ Error creating WebSocket:', err);
      setError(err);
    }
  }, [url]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);
  
  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('⚠️ WebSocket not connected. Cannot send message.');
    return false;
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  const generateDocument = useCallback((documentName) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'generate_document',
        documentName: documentName
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`🚀 Requesting generation of: ${documentName}`);
      return true;
    }
    console.warn('⚠️ WebSocket not connected. Cannot generate document.');
    return false;
  }, []);
  
  // Version Control Methods
  const getVersionHistory = useCallback((documentName, limit = 50) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'getVersionHistory',
        documentName,
        limit
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`📜 Requesting version history for: ${documentName}`);
      return true;
    }
    console.warn('⚠️ WebSocket not connected. Cannot get version history.');
    return false;
  }, []);
  
  const restoreVersion = useCallback((documentName, versionNumber) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'restoreVersion',
        documentName,
        versionNumber
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`🔄 Restoring version ${versionNumber} for: ${documentName}`);
      return true;
    }
    console.warn('⚠️ WebSocket not connected. Cannot restore version.');
    return false;
  }, []);
  
  const getVersionStats = useCallback((documentName) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'getVersionStats',
        documentName
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`📊 Requesting version stats for: ${documentName}`);
      return true;
    }
    console.warn('⚠️ WebSocket not connected. Cannot get version stats.');
    return false;
  }, []);
  
  return {
    isConnected,
    error,
    config,
    send,
    generateDocument,
    getVersionHistory,
    restoreVersion,
    getVersionStats,
    reconnect: connect,
    disconnect,
    ws: wsRef.current,
  };
};

