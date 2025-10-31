/**
 * Load and parse JSON overlay data from a URL
 * Handles both marked-boxes format (array) and geometry format (object)
 * 
 * @param {string} url - URL to fetch JSON from
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Array>} Array of overlay data
 */
export async function loadOverlayJSON(url, maxRetries = 5) {
  console.log(`📊 Loading overlay JSON from: ${url}`);
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📊 JSON load attempt ${attempt}/${maxRetries}`);
      
      // Add cache-busting parameter
      const fetchUrl = `${url}?t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        if (attempt < maxRetries) {
          console.log(`⏳ JSON not ready yet (status ${response.status}), waiting 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      const overlayArray = parseOverlayData(jsonData);
      
      console.log(`✅ Successfully loaded ${overlayArray.length} overlays from JSON`);
      return overlayArray;
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`⏳ Error loading JSON, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw new Error(`Failed to load JSON after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Extract coordinates from item with support for multiple property formats
 * Supports: x_pt/y_pt/w_pt/h_pt OR x/y/width/height
 */
function getCoordinatesFromItem(item) {
  let x, y, width, height;
  
  // Format 1: _pt suffix (points format)
  if (typeof item.x_pt === 'number') {
    x = item.x_pt;
    y = item.y_pt;
    width = item.w_pt;
    height = item.h_pt;
  } 
  // Format 2: Standard property names
  else if (typeof item.x === 'number') {
    x = item.x;
    y = item.y;
    width = item.width;
    height = item.height;
  }
  // Format 3: Alternative names
  else if (typeof item.left === 'number') {
    x = item.left;
    y = item.top;
    width = item.width;
    height = item.height;
  }
  
  return { x, y, width, height };
}

/**
 * Parse overlay data from different JSON formats
 * Supports both marked-boxes format (array) and geometry format (object)
 * 
 * @param {Object|Array} jsonData - Raw JSON data
 * @returns {Array} Array of overlay objects
 */
export function parseOverlayData(jsonData) {
  let overlayArray = [];
  
  console.log('📋 Parsing JSON data:', jsonData);
  
  if (Array.isArray(jsonData)) {
    // Direct marked-boxes format
    console.log('✅ Detected marked-boxes format (array)');
    
    // Normalize coordinate properties
    overlayArray = jsonData.map((item, index) => {
      // Extract coordinates from various formats
      const coords = getCoordinatesFromItem(item);
      
      // Check if coordinates are valid
      if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || 
          typeof coords.width !== 'number' || typeof coords.height !== 'number') {
        console.warn(`⚠️ Item ${index} (${item.id || 'unknown'}) missing coordinates:`, {
          id: item.id,
          rawCoords: coords,
          availableProps: Object.keys(item)
        });
      }
      
      // Return normalized overlay object
      return {
        ...item,
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      };
    });
    
    console.log(`✅ Parsed ${overlayArray.length} overlays from marked-boxes format`);
  } else if (jsonData.pdfGeometryV1 && jsonData.pdfGeometryV1.pages) {
    // Convert geometry format to overlay format
    console.log('🔄 Converting geometry format to marked-boxes format...');
    jsonData.pdfGeometryV1.pages.forEach((page, pageIndex) => {
      console.log(`  Processing page ${page.index || pageIndex}: ${page.elements?.length || 0} elements`);
      if (page.elements) {
        page.elements.forEach((element, elemIndex) => {
          // Extract coordinates from various formats
          const coords = getCoordinatesFromItem(element);
          
          // Validate element has coordinates
          if (typeof coords.x !== 'number' || typeof coords.y !== 'number' || 
              typeof coords.width !== 'number' || typeof coords.height !== 'number') {
            console.warn(`  ⚠️ Element ${elemIndex} (${element.id || 'unknown'}) missing coordinates:`, {
              id: element.id,
              rawCoords: coords,
              availableProps: Object.keys(element)
            });
          }
          
          overlayArray.push({
            ...element,
            id: element.id,
            page: page.index,
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            text: element.text || element.id,
            action: element.action,
            type: element.type
          });
        });
      }
    });
    console.log(`✅ Converted ${overlayArray.length} elements from geometry format`);
  } else {
    console.warn('⚠️ Unsupported JSON format. Expected either:');
    console.warn('  1. Array of overlays (marked-boxes format)');
    console.warn('  2. Object with pdfGeometryV1.pages (geometry format)');
    console.warn('  Received:', typeof jsonData, Object.keys(jsonData || {}));
  }
  
  // Log summary
  const validOverlays = overlayArray.filter(o => 
    typeof o.x === 'number' && typeof o.y === 'number' && 
    typeof o.width === 'number' && typeof o.height === 'number'
  );
  const invalidOverlays = overlayArray.length - validOverlays.length;
  
  if (invalidOverlays > 0) {
    console.warn(`⚠️ Found ${invalidOverlays} overlays with invalid/missing coordinates`);
  }
  console.log(`✅ Returning ${validOverlays} valid overlays (${invalidOverlays} skipped)`);
  
  return overlayArray;
}

/**
 * Check if a marked-boxes version of a geometry JSON file exists
 * If geometry file is provided, try to find marked-boxes variant
 * 
 * @param {string} jsonPath - Path to JSON file
 * @returns {Promise<string>} Path to preferred JSON file
 */
export async function findPreferredJSONPath(jsonPath) {
  // If it's a geometry.json, check if marked-boxes.json exists (preferred format)
  if (jsonPath.includes('-geometry.json')) {
    const markedBoxesPath = jsonPath.replace('-geometry.json', '-marked-boxes.json');
    console.log(`🔍 Checking for preferred marked-boxes format: ${markedBoxesPath}`);
    
    try {
      const response = await fetch(markedBoxesPath, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Found marked-boxes format, using that instead of geometry format`);
        return markedBoxesPath;
      }
    } catch (error) {
      console.log(`ℹ️ Marked-boxes format not found, using geometry format`);
    }
  }
  
  return jsonPath;
}

/**
 * Convert a file system path to a relative URL
 * Extracts the path from 'ui/' onwards
 * 
 * @param {string} filePath - Full file system path
 * @returns {string} Relative URL path
 */
export function convertToRelativeUrl(filePath) {
  if (!filePath) return '';
  
  if (filePath.includes('/ui/')) {
    const relativePath = filePath.substring(filePath.indexOf('/ui/') + 1);
    return '/' + relativePath;
  }
  
  // Fallback: just use the basename
  const filename = filePath.split('/').pop();
  return '/ui/' + filename;
}

