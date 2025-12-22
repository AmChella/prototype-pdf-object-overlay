import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDevTools } from '../../context/DevToolsContext';
import './ContextMenu.css';

const ContextMenu = ({ children }) => {
    const { isDevToolsOpen, toggleDevTools } = useDevTools();
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);

    const handleContextMenu = useCallback((e) => {
        // Don't prevent default on input elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        e.preventDefault();

        // Calculate position, ensuring menu stays within viewport
        const x = Math.min(e.clientX, window.innerWidth - 200);
        const y = Math.min(e.clientY, window.innerHeight - 150);

        setMenuPosition({ x, y });
        setMenuVisible(true);
    }, []);

    const handleClick = useCallback(() => {
        if (menuVisible) {
            setMenuVisible(false);
        }
    }, [menuVisible]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && menuVisible) {
            setMenuVisible(false);
        }
    }, [menuVisible]);

    useEffect(() => {
        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClick, handleKeyDown]);

    const handleInspect = (e) => {
        e.stopPropagation();
        toggleDevTools();
        setMenuVisible(false);
    };

    const handleReload = (e) => {
        e.stopPropagation();
        window.location.reload();
        setMenuVisible(false);
    };

    return (
        <div className="context-menu-wrapper" onContextMenu={handleContextMenu}>
            {children}

            {menuVisible && (
                <div
                    ref={menuRef}
                    className="context-menu"
                    style={{
                        left: menuPosition.x,
                        top: menuPosition.y
                    }}
                >
                    <div className="context-menu-item" onClick={handleInspect}>
                        <span className="context-menu-icon">🔧</span>
                        <span className="context-menu-label">
                            {isDevToolsOpen ? 'Close DevTools' : 'Inspect'}
                        </span>
                        <span className="context-menu-shortcut">F12</span>
                    </div>
                    <div className="context-menu-separator" />
                    <div className="context-menu-item" onClick={handleReload}>
                        <span className="context-menu-icon">🔄</span>
                        <span className="context-menu-label">Reload</span>
                        <span className="context-menu-shortcut">⌘R</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextMenu;
