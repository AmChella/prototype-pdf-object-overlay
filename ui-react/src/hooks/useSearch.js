import { useState, useCallback, useEffect } from 'react';

export const useSearch = (pdfDocument, getTextContent) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [searching, setSearching] = useState(false);

  const searchInPage = useCallback(async (pageNum, query) => {
    if (!getTextContent || !query) return [];

    try {
      const textContent = await getTextContent(pageNum);
      if (!textContent || !textContent.items) return [];

      const pageMatches = [];
      const queryLower = query.toLowerCase();

      textContent.items.forEach((item, itemIndex) => {
        if (!item || !item.str) return;

        const text = item.str.toLowerCase();
        let startIndex = 0;

        while ((startIndex = text.indexOf(queryLower, startIndex)) !== -1) {
          pageMatches.push({
            pageNum,
            itemIndex,
            charIndex: startIndex,
            length: query.length,
            item
          });
          startIndex += query.length;
        }
      });

      return pageMatches;
    } catch (err) {
      console.error('Error searching page:', pageNum, err);
      return [];
    }
  }, [getTextContent]);

  const performSearch = useCallback(async (query) => {
    if (!query || !pdfDocument) {
      setMatches([]);
      setCurrentIndex(-1);
      return [];
    }

    setSearching(true);
    setSearchQuery(query);

    try {
      const allMatches = [];

      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const pageMatches = await searchInPage(pageNum, query);
        allMatches.push(...pageMatches);
      }

      setMatches(allMatches);

      if (allMatches.length > 0) {
        setCurrentIndex(0);
      } else {
        setCurrentIndex(-1);
      }

      console.log(`Found ${allMatches.length} matches for "${query}"`);
      return allMatches;
    } catch (err) {
      console.error('Error performing search:', err);
      return [];
    } finally {
      setSearching(false);
    }
  }, [pdfDocument, searchInPage]);

  const nextMatch = useCallback(() => {
    if (!matches || matches.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % matches.length);
  }, [matches]);

  const prevMatch = useCallback(() => {
    if (!matches || matches.length === 0) return;
    setCurrentIndex(prev => prev <= 0 ? matches.length - 1 : prev - 1);
  }, [matches]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setMatches([]);
    setCurrentIndex(-1);
  }, []);

  const getCurrentMatch = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < matches.length) {
      return matches[currentIndex];
    }
    return null;
  }, [currentIndex, matches]);

  return {
    searchQuery,
    matches,
    currentIndex,
    searching,
    performSearch,
    nextMatch,
    prevMatch,
    clearSearch,
    getCurrentMatch,
  };
};

