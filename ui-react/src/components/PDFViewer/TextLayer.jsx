import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './TextLayer.css';

const TextLayer = ({ textContent, viewport, pageNum, searchMatches, currentMatchIndex }) => {
  const textLayerRef = useRef(null);
  
  useEffect(() => {
    if (!textContent || !viewport || !textLayerRef.current) return;
    
    // Clear previous content
    textLayerRef.current.innerHTML = '';
    
    // Render each text item with proper PDF.js transformation
    textContent.items.forEach((item, itemIndex) => {
      const tx = pdfjsLib.Util.transform(
        viewport.transform,
        item.transform
      );
      
      const style = textContent.styles && textContent.styles[item.fontName] || {};
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const fontSize = fontHeight * (style.ascent || 1);
      
      const textDiv = document.createElement('span');
      textDiv.textContent = item.str;
      textDiv.dataset.itemIndex = itemIndex;
      
      // Position and size
      textDiv.style.left = `${tx[4]}px`;
      textDiv.style.top = `${tx[5]}px`;
      textDiv.style.fontSize = `${fontSize}px`;
      textDiv.style.fontFamily = item.fontName || 'sans-serif';
      
      textLayerRef.current.appendChild(textDiv);
    });
    
    console.log(`📝 Rendered ${textContent.items.length} text items on page ${pageNum}`);
  }, [textContent, viewport, pageNum]);
  
  // Highlight search matches - matching vanilla JS implementation exactly
  useEffect(() => {
    if (!textLayerRef.current || !textContent) return;
    
    // If no search matches, remove all existing highlights and restore original text
    if (!Array.isArray(searchMatches) || searchMatches.length === 0) {
      const highlightedSpans = textLayerRef.current.querySelectorAll('span[data-item-index]');
      highlightedSpans.forEach((span, index) => {
        const item = textContent.items[index];
        if (item && span.querySelector('mark')) {
          // Restore original text without highlights
          span.textContent = item.str;
        }
      });
      console.log(`🧹 Cleared all highlights on page ${pageNum}`);
      return;
    }
    
    try {
      const pageMatches = searchMatches.filter(m => m && m.pageNum === pageNum);
      
      if (pageMatches.length === 0) {
        // Clear highlights for this page if no matches
        const highlightedSpans = textLayerRef.current.querySelectorAll('span[data-item-index]');
        highlightedSpans.forEach((span, index) => {
          const item = textContent.items[index];
          if (item && span.querySelector('mark')) {
            span.textContent = item.str;
          }
        });
        return;
      }
      
      console.log(`🎨 Highlighting ${pageMatches.length} matches on page ${pageNum}`);
      
      // First, clear all existing highlights on this page
      const allSpans = textLayerRef.current.querySelectorAll('span[data-item-index]');
      allSpans.forEach((span, index) => {
        const item = textContent.items[index];
        if (item && span.querySelector('mark')) {
          span.textContent = item.str;
        }
      });
      
      // Process each match
      pageMatches.forEach((match) => {
        const textSpan = textLayerRef.current.querySelector(`[data-item-index="${match.itemIndex}"]`);
        
        if (!textSpan) {
          console.warn(`⚠️ Could not find text span for item index ${match.itemIndex}`);
          return;
        }
        
        // Get the text content
        let text = '';
        textSpan.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            text += node.textContent;
          }
        });
        
        if (match.charIndex + match.length > text.length) {
          console.warn(`⚠️ Match extends beyond text length`);
          return;
        }
        
        const beforeText = text.substring(0, match.charIndex);
        const matchText = text.substring(match.charIndex, match.charIndex + match.length);
        const afterText = text.substring(match.charIndex + match.length);
        
        // Create highlight mark element
        const highlight = document.createElement('mark');
        highlight.className = 'highlight';
        highlight.textContent = matchText;
        
        // Check if this is the current selected match
        if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
          const currentMatch = searchMatches[currentMatchIndex];
          if (currentMatch && 
              currentMatch.pageNum === match.pageNum && 
              currentMatch.itemIndex === match.itemIndex && 
              currentMatch.charIndex === match.charIndex) {
            highlight.classList.add('selected');
            // Scroll into view after a brief delay
            setTimeout(() => {
              highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }
        
        // Clear and rebuild the text span content
        textSpan.textContent = '';
        
        if (beforeText) {
          textSpan.appendChild(document.createTextNode(beforeText));
        }
        
        textSpan.appendChild(highlight);
        
        if (afterText) {
          textSpan.appendChild(document.createTextNode(afterText));
        }
      });
      
      console.log(`✅ Highlighted ${pageMatches.length} matches on page ${pageNum}`);
    } catch (error) {
      console.error('❌ Error highlighting matches:', error);
    }
  }, [searchMatches, currentMatchIndex, pageNum, textContent]);
  
  return (
    <div 
      ref={textLayerRef} 
      className="text-layer"
      style={{
        width: viewport.width + 'px',
        height: viewport.height + 'px'
      }}
    />
  );
};

export default TextLayer;

