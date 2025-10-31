import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useSearch } from '../../hooks/useSearch';
import './SearchBar.css';

const SearchBar = () => {
  const {
    currentPdf,
    searchQuery,
    searchMatches,
    currentMatchIndex,
    setSearchQuery,
    setSearchMatches,
    setCurrentMatchIndex,
    findNextMatch,
    findPrevMatch,
    toggleSearch,
    goToPage,
  } = useAppContext();
  
  const inputRef = useRef(null);
  
  // Get text content function
  const getTextContent = async (pageNum) => {
    if (!currentPdf) return null;
    const page = await currentPdf.getPage(pageNum);
    return await page.getTextContent();
  };
  
  const { performSearch, searching } = useSearch(currentPdf, getTextContent);
  
  useEffect(() => {
    // Auto-focus when search opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Perform search when query changes
  useEffect(() => {
    const doSearch = async () => {
      if (!searchQuery || !currentPdf) {
        setSearchMatches([]);
        setCurrentMatchIndex(-1);
        return;
      }
      
      console.log('🔍 Performing search for:', searchQuery);
      const matches = await performSearch(searchQuery);
      console.log('🔍 Found matches:', matches?.length, 'results');
      setSearchMatches(matches || []);
      if (matches && matches.length > 0) {
        setCurrentMatchIndex(0);
        // Navigate to first match page
        const firstMatchPage = matches[0].pageNum;
        console.log('🔍 Navigating to first match on page:', firstMatchPage);
        goToPage(firstMatchPage);
      }
    };
    
    const timeoutId = setTimeout(doSearch, 300); // Debounce
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentPdf]);
  
  // Navigate to match page when current match changes
  useEffect(() => {
    if (currentMatchIndex >= 0 && searchMatches && searchMatches.length > 0) {
      const match = searchMatches[currentMatchIndex];
      if (match && match.pageNum) {
        console.log('🔍 Current match changed, navigating to page:', match.pageNum, 'Index:', currentMatchIndex);
        goToPage(match.pageNum);
      } else {
        console.warn('🔍 Match at index', currentMatchIndex, 'has no pageNum:', match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchIndex, searchMatches]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        findPrevMatch();
      } else {
        findNextMatch();
      }
    } else if (e.key === 'Escape') {
      toggleSearch();
    }
  };
  
  const matchesArray = Array.isArray(searchMatches) ? searchMatches : [];
  const matchCount = matchesArray.length > 0 
    ? `${currentMatchIndex + 1} / ${matchesArray.length}`
    : searching ? 'Searching...' : '0 / 0';
  
  return (
    <div className="search-container">
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search in document..."
        value={searchQuery || ''}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={!currentPdf}
      />
      
      <button
        className="toolbar-button"
        onClick={findPrevMatch}
        disabled={matchesArray.length === 0}
        title="Previous Match (Shift+Enter)"
      >
        <span>▲</span>
      </button>
      
      <button
        className="toolbar-button"
        onClick={findNextMatch}
        disabled={matchesArray.length === 0}
        title="Next Match (Enter)"
      >
        <span>▼</span>
      </button>
      
      <span className="search-count">{matchCount}</span>
      
      <button
        className="toolbar-button"
        onClick={toggleSearch}
        title="Close Search (Esc)"
      >
        <span>✕</span>
      </button>
    </div>
  );
};

export default SearchBar;

