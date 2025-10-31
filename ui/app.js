// app.js - vanilla JS + PDF.js overlay prototype

const pdfjsLib = window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

// Get DOM elements (some may not exist in all UI versions)
const viewer = document.getElementById("viewerContainer");
const loadBtn = document.getElementById("loadBtn"); // May not exist in modern UI
const pdfUrlInput = document.getElementById("pdfUrl");
const pdfFileInput = document.getElementById("pdfFileInput");
const uploadPdfBtn = document.getElementById("uploadPdfBtn"); // May not exist in modern UI
const loadJsonBtn = document.getElementById("loadJsonBtn"); // May not exist in modern UI
const jsonSelect = document.getElementById("jsonSelect");
const jsonFileInput = document.getElementById("jsonFileInput");
const uploadJsonBtn = document.getElementById("uploadJsonBtn"); // May not exist in modern UI
const unitSelect = document.getElementById("unitSelect");
const coordinateOrigin = document.getElementById("coordinateOrigin");
const toggleOutlineBtn = document.getElementById("toggleOutlineBtn");
const toggleOverlaysBtn = document.getElementById("toggleOverlaysBtn");
const debugBtn = document.getElementById("debugBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const autoDetectBtn = document.getElementById("autoDetectBtn");
const dropZone = document.getElementById("dropZone");

// Page navigation elements
const pageNavigation = document.getElementById("pageNavigation");
const firstPageBtn = document.getElementById("firstPageBtn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const lastPageBtn = document.getElementById("lastPageBtn");
const pageInput = document.getElementById("pageInput");
const totalPages = document.getElementById("totalPages");

// Progress bar elements
// New simple progress modal elements
const progressModal = document.getElementById("progressModal");
const progressModalTitle = document.getElementById("progressModalTitle");
const progressModalBar = document.getElementById("progressModalBar");
const progressModalStatus = document.getElementById("progressModalStatus");

let currentPdf = null;
let currentPageNumber = 1;
let currentViewport = null;
let overlayData = []; // coordinate JSON
let pageWrapper = null; // container for current page
let showOutline = false;
let overlaysVisible = true; // track overlay visibility state
let currentPdfObjectUrl = null; // Track object URL for cleanup
let enableWebSocket = true; // Set to true to enable WebSocket connection
let currentDocument = null; // Track currently loaded document (document or ENDEND10921)
let currentScale = 1.5; // Default zoom scale

// Search variables
let searchQuery = '';
let searchMatches = [];
let currentMatchIndex = -1;
let pageTextContent = new Map(); // Cache text content per page

// loadBtn.addEventListener("click", () => {
//   const url = pdfUrlInput.value.trim();
//   if (!url) return alert("Enter PDF URL");
//   loadPdf(url);
// });

// PDF File Upload
if (uploadPdfBtn) {
  uploadPdfBtn.addEventListener("click", () => {
    pdfFileInput.click();
  });
}

if (pdfFileInput) {
  pdfFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    console.log("Loading PDF file:", file.name);
    if (pdfUrlInput) {
      pdfUrlInput.value = `📄 ${file.name}`;
    }

    // Create object URL for the file
    const fileUrl = URL.createObjectURL(file);
    loadPdf(fileUrl);
  });
}

// JSON File Upload
if (uploadJsonBtn) {
  uploadJsonBtn.addEventListener("click", () => {
    jsonFileInput.click();
  });
}

if (jsonFileInput) {
  jsonFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.json')) {
    alert("Please select a JSON file");
    return;
  }

  console.log("Loading JSON file:", file.name);

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const jsonData = JSON.parse(event.target.result);
      overlayData = jsonData;
      console.log("Loaded overlay data from file:", overlayData);

      // Update the select dropdown to show uploaded file
      const uploadedOption = document.querySelector('#jsonSelect option[value="uploaded"]');
      if (uploadedOption) {
        uploadedOption.remove();
      }

      const newOption = document.createElement('option');
      newOption.value = 'uploaded';
      newOption.textContent = `📄 ${file.name} (Uploaded)`;
      newOption.selected = true;
      jsonSelect.insertBefore(newOption, jsonSelect.firstChild);

      // Validate coordinate consistency
      validateCoordinates(overlayData);

      updateStatus(); // Update status indicator

      if (currentPdf) renderPage(currentPageNumber);
    } catch (error) {
      console.error("Error parsing JSON file:", error);
      alert("Error parsing JSON file: " + error.message);
    }
  };

  reader.onerror = () => {
    alert("Error reading file");
  };

  reader.readAsText(file);
  });
}

// loadJsonBtn.addEventListener("click", () => {
//   const selectedJson = jsonSelect.value;

//   if (!selectedJson) {
//     alert("Please select a JSON file or upload one");
//     return;
//   }

//   if (selectedJson === 'uploaded') {
//     // File was already loaded via upload, just re-render if PDF is loaded
//     if (currentPdf && overlayData.length > 0) {
//       renderPage(currentPageNumber);
//     } else {
//       alert("Uploaded JSON data is ready. Please load a PDF file.");
//     }
//     return;
//   }

//   console.log("Loading JSON:", selectedJson);
//   fetch(selectedJson)
//     .then((r) => r.json())
//     .then((j) => {
//       overlayData = j;
//       console.log("Loaded overlay data:", overlayData);

//       // Validate coordinate consistency
//       validateCoordinates(overlayData);

//       updateStatus(); // Update status indicator

//       if (currentPdf) renderPage(currentPageNumber);
//     })
//     .catch((err) => {
//       console.error("Failed to load JSON:", err);
//       alert("Failed to load JSON: " + err);
//     });
// });

function validateCoordinates(data) {
  console.log("=== COORDINATE VALIDATION ===");

  data.forEach(item => {
    console.log(`Validating item: ${item.id}`);

    // Check if coordinate conversions are consistent
    if (item.x_pt !== undefined && item.x_px !== undefined) {
      const expectedPx = item.x_pt * (4/3); // 1 pt = 4/3 px at 96 DPI
      const actualPx = item.x_px;
      const diff = Math.abs(expectedPx - actualPx);

      if (diff > 1) {
        console.warn(`  ⚠️  PT to PX conversion mismatch: ${item.x_pt}pt → expected ${expectedPx}px, got ${actualPx}px (diff: ${diff})`);
      } else {
        console.log(`  ✅ PT to PX conversion OK: ${item.x_pt}pt → ${actualPx}px`);
      }
    }

    if (item.x_pt !== undefined && item.x_mm !== undefined) {
      const expectedMm = item.x_pt * 0.352777778; // 1 pt = 0.352777778 mm
      const actualMm = item.x_mm;
      const diff = Math.abs(expectedMm - actualMm);

      if (diff > 0.1) {
        console.warn(`  ⚠️  PT to MM conversion mismatch: ${item.x_pt}pt → expected ${expectedMm.toFixed(2)}mm, got ${actualMm}mm (diff: ${diff.toFixed(2)})`);
      } else {
        console.log(`  ✅ PT to MM conversion OK: ${item.x_pt}pt → ${actualMm}mm`);
      }
    }

    // Check for reasonable coordinate ranges
    if (item.x_pt !== undefined) {
      if (item.x_pt < 0 || item.y_pt < 0) {
        console.warn(`  ⚠️  Negative coordinates: (${item.x_pt}, ${item.y_pt})`);
      }
      if (item.w_pt <= 0 || item.h_pt <= 0) {
        console.warn(`  ⚠️  Invalid dimensions: ${item.w_pt} × ${item.h_pt}`);
      }
    }
  });
}

if (debugBtn) {
  debugBtn.addEventListener("click", () => {
    console.log("=== DEBUG INFO ===");
    console.log("Current PDF:", currentPdf);
  console.log("Current page:", currentPageNumber);
  console.log("Current viewport:", currentViewport);
  console.log("Overlay data:", overlayData);
  console.log("Selected unit:", unitSelect ? unitSelect.value : 'N/A');
  console.log("Coordinate origin:", coordinateOrigin ? coordinateOrigin.value : 'N/A');

  if (pageWrapper) {
    console.log("Page wrapper dimensions:", {
      width: pageWrapper.style.width,
      height: pageWrapper.style.height,
      actualWidth: pageWrapper.offsetWidth,
      actualHeight: pageWrapper.offsetHeight
    });
  }

  if (currentViewport) {
    const pageHeight = currentViewport.height / currentViewport.scale;
    console.log("Viewport details:", {
      width: currentViewport.width,
      height: currentViewport.height,
      scale: currentViewport.scale,
      rotation: currentViewport.rotation,
      pageHeightInPoints: pageHeight
    });
  }

  // Debug each overlay item
  if (overlayData.length > 0) {
    console.log("=== OVERLAY ITEMS DEBUG ===");
    const pageItems = overlayData.filter(item => item.page === currentPageNumber);
    pageItems.forEach(item => {
      console.log(`Item: ${item.id}`);
      console.log(`  PT: (${item.x_pt}, ${item.y_pt}) ${item.w_pt}×${item.h_pt}`);
      console.log(`  PX: (${item.x_px}, ${item.y_px}) ${item.w_px}×${item.h_px}`);
      console.log(`  MM: (${item.x_mm}, ${item.y_mm}) ${item.w_mm}×${item.h_mm}`);

      if (currentViewport) {
        const pageHeight = currentViewport.height / currentViewport.scale;
        const y_bottomLeft = pageHeight - item.y_pt - item.h_pt;
        console.log(`  Converted to bottom-left: (${item.x_pt}, ${y_bottomLeft})`);

        const vb = currentViewport.convertToViewportRectangle([
          item.x_pt, y_bottomLeft,
          item.x_pt + item.w_pt, y_bottomLeft + item.h_pt
        ]);
        console.log(`  Viewport rect: [${vb.join(', ')}]`);
      }
    });
  }

  alert("Debug info logged to console. Check browser developer tools.");
  });
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", () => {
  if (overlayData.length === 0) {
    alert("No coordinate data loaded. Please load a JSON file first.");
    return;
  }

  console.log("=== COORDINATE ANALYSIS ===");

  // Check if coordinates look like they're using top-left or bottom-left origin
  const analysis = {
    likelyTopLeft: 0,
    likelyBottomLeft: 0,
    totalItems: overlayData.length
  };

  overlayData.forEach(item => {
    if (item.y_pt !== undefined) {
      // In a typical A4 page (595x842 pt), if y coordinates are mostly in upper half,
      // they're likely using top-left origin
      if (item.y_pt > 421) { // More than half page height
        analysis.likelyTopLeft++;
      } else {
        analysis.likelyBottomLeft++;
      }
    }
  });

  console.log("Origin Analysis:", analysis);

  let message = `Coordinate Analysis:\n\n`;
  message += `Total items: ${analysis.totalItems}\n`;
  message += `Items with Y > 421pt: ${analysis.likelyTopLeft} (suggests top-left origin)\n`;
  message += `Items with Y ≤ 421pt: ${analysis.likelyBottomLeft} (suggests bottom-left origin)\n\n`;

  if (analysis.likelyTopLeft > analysis.likelyBottomLeft) {
    message += "🔍 DIAGNOSIS: Your coordinates likely use TOP-LEFT origin\n";
    message += "📝 Try setting Origin to 'Top-Left' in the controls.";
  } else {
    message += "🔍 DIAGNOSIS: Your coordinates likely use BOTTOM-LEFT origin\n";
    message += "📝 Try setting Origin to 'Bottom-Left (PDF Standard)' in the controls.";
  }

  message += "\n\n💡 TIP: If overlays appear upside down, try switching the coordinate origin setting!";

  alert(message);
  });
}

if (autoDetectBtn) {
  autoDetectBtn.addEventListener("click", () => {
  if (overlayData.length === 0) {
    alert("No coordinate data loaded. Please load a JSON file first.");
    return;
  }

  if (!currentPdf) {
    alert("No PDF loaded. Please load a PDF file first.");
    return;
  }

  // Try both coordinate systems and see which one makes more sense
  console.log("=== AUTO-DETECTING COORDINATE ORIGIN ===");

  const currentOrigin = coordinateOrigin.value;
  const testOrigins = ['top-left', 'bottom-left'];
  let bestOrigin = currentOrigin;
  let bestScore = -1;

  testOrigins.forEach(origin => {
    coordinateOrigin.value = origin;

    // Calculate how many items would be visible on the page with this origin
    const pageHeight = currentViewport.height / currentViewport.scale;
    let visibleCount = 0;
    let validCount = 0;

    overlayData.filter(item => item.page === currentPageNumber).forEach(item => {
      const coords = getCoordinatesFromItem(item, unitSelect.value);
      if (!coords) return;

      let x1, y1, x2, y2;

      if (origin === "top-left") {
        x1 = coords.x;
        y1 = pageHeight - coords.y - coords.height;
        x2 = coords.x + coords.width;
        y2 = pageHeight - coords.y;
      } else {
        x1 = coords.x;
        y1 = coords.y;
        x2 = coords.x + coords.width;
        y2 = coords.y + coords.height;
      }

      // Check if coordinates are within reasonable bounds
      if (x1 >= 0 && y1 >= 0 && x2 <= 1000 && y2 <= 1500 && x2 > x1 && y2 > y1) {
        validCount++;
        // Extra points if coordinates are well within typical page bounds
        if (x1 >= 20 && y1 >= 20 && x2 <= 600 && y2 <= 800) {
          visibleCount++;
        }
      }
    });

    const score = validCount * 2 + visibleCount;
    console.log(`Origin ${origin}: valid=${validCount}, visible=${visibleCount}, score=${score}`);

    if (score > bestScore) {
      bestScore = score;
      bestOrigin = origin;
    }
  });

  // Set the best origin
  coordinateOrigin.value = bestOrigin;

  // Re-render with the detected origin
  renderPage(currentPageNumber);

  alert(`🎯 Auto-detection complete!\n\nDetected coordinate origin: ${bestOrigin.toUpperCase()}\n\nThe page has been re-rendered with the detected settings. If overlays still don't align correctly, try manually switching the coordinate origin.`);
  });
}

if (unitSelect) {
  unitSelect.addEventListener("change", () => {
    console.log("Unit changed to:", unitSelect.value);

    // Update unit indicator if it exists
    const currentUnit = document.getElementById("currentUnit");
    if (currentUnit) {
      currentUnit.textContent = '✅';
      currentUnit.className = 'status-value status-loaded';
    }

    if (currentPdf && overlayData.length > 0) {
      // Re-render the page with new unit settings
      renderPage(currentPageNumber);
    }
  });
}

if (coordinateOrigin) {
  coordinateOrigin.addEventListener("change", () => {
    console.log("Coordinate origin changed to:", coordinateOrigin.value);

    if (currentPdf && overlayData.length > 0) {
      // Re-render the page with new coordinate origin
      renderPage(currentPageNumber);
    }
  });
}

if (toggleOutlineBtn) {
  toggleOutlineBtn.addEventListener("click", () => {
    toggleOutline();
  });
}

if (toggleOverlaysBtn) {
  toggleOverlaysBtn.addEventListener("click", () => {
    toggleOverlays();
  });
}

// Page Navigation Event Listeners
if (firstPageBtn) {
  firstPageBtn.addEventListener("click", () => {
    goToPage(1);
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPageNumber > 1) {
      goToPage(currentPageNumber - 1);
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    if (currentPdf && currentPageNumber < currentPdf.numPages) {
      goToPage(currentPageNumber + 1);
    }
  });
}

if (lastPageBtn) {
  lastPageBtn.addEventListener("click", () => {
    if (currentPdf) {
      goToPage(currentPdf.numPages);
    }
  });
}

if (pageInput) {
  pageInput.addEventListener("change", () => {
    const pageNum = parseInt(pageInput.value);
    if (pageNum && pageNum >= 1 && currentPdf && pageNum <= currentPdf.numPages) {
      goToPage(pageNum);
    } else {
      // Reset to current page if invalid
      pageInput.value = currentPageNumber;
    }
  });

  pageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      pageInput.blur(); // This will trigger the change event
    }
  });
}

// Keyboard navigation and shortcuts
document.addEventListener("keydown", (e) => {
  // Only handle shortcuts when not in an input field
  if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "SELECT") {
    // Page navigation
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      if (currentPageNumber > 1) {
        goToPage(currentPageNumber - 1);
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (currentPdf && currentPageNumber < currentPdf.numPages) {
        goToPage(currentPageNumber + 1);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      goToPage(1);
    } else if (e.key === "End") {
      e.preventDefault();
      if (currentPdf) {
        goToPage(currentPdf.numPages);
      }
    } 
    // Overlay toggle
    else if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      toggleOverlays();
    }
    // Sidebar toggle
    else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
      }
    }
    // Zoom controls
    else if ((e.ctrlKey || e.metaKey) && e.key === '+') {
      e.preventDefault();
      const newScale = Math.min(currentScale + 0.25, 3);
      setZoom(newScale);
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      const newScale = Math.max(currentScale - 0.25, 0.25);
      setZoom(newScale);
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      setZoom(1.0);
    }
    // Search toggle
    else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      toggleSearch();
    }
  }
});

// Initialize on page load - Main initialization function
function initializeApp() {
  console.log('🚀 Initializing PDF Overlay System...');
  console.log('📋 Document readyState:', document.readyState);
  
  // Set PDF Standard (bottom-left) as default coordinate origin
  const coordOrigin = document.getElementById('coordinateOrigin');
  if (coordOrigin) {
    coordOrigin.value = 'bottom-left';
  }

  // Show welcome message if no PDF is loaded
  const pdfUrl = document.getElementById('pdfUrl');
  if (pdfUrl && !pdfUrl.value.trim()) {
    setTimeout(() => {
      showProcessingNotification('💡 Tip: Generate PDF and coordinates will be auto-loaded!', 'info');
    }, 2000);
  }

  updateStatus();
  setupDragAndDrop();

  // Restore overlay visibility state from localStorage
  const savedOverlayState = localStorage.getItem('overlaysVisible');
  if (savedOverlayState !== null) {
    overlaysVisible = savedOverlayState === 'true';
    if (!overlaysVisible) {
      // Apply hidden state without animation
      document.body.classList.add('overlays-hidden');
      const btn = document.getElementById('toggleOverlaysBtn');
      if (btn) {
        btn.innerHTML = '<span>🙈</span><span>Show Overlays</span>';
        btn.classList.add('active');
      }
    }
  }
  
  // Update connection status initially
  updateConnectionStatus(false);
  
  // Initialize WebSocket connection (controlled by enableWebSocket flag)
  if (enableWebSocket) {
    initWebSocket();
  } else {
    console.log('🔌 WebSocket connection disabled (set enableWebSocket = true to enable)');
  }

  // Document Generation Event Listeners
  setupDocumentGeneration();
  
  // Setup toolbar controls
  setupToolbarControls();
}

// Check if DOM is already loaded (script at end of body)
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // DOM is already loaded, run init immediately
  initializeApp();
}

// Setup toolbar controls (PDF.js-style)
function setupToolbarControls() {
  console.log('🔧 Setting up toolbar controls...');
  
  // Sidebar toggle
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      console.log('Sidebar toggled:', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    });
    console.log('✅ Sidebar toggle attached');
  }
  
  // Toolbar page navigation
  const firstPageBtnToolbar = document.getElementById('firstPageBtnToolbar');
  const prevPageBtnToolbar = document.getElementById('prevPageBtnToolbar');
  const nextPageBtnToolbar = document.getElementById('nextPageBtnToolbar');
  const lastPageBtnToolbar = document.getElementById('lastPageBtnToolbar');
  const pageInputToolbar = document.getElementById('pageInputToolbar');
  
  console.log('Navigation elements found:', {
    firstPageBtnToolbar: !!firstPageBtnToolbar,
    prevPageBtnToolbar: !!prevPageBtnToolbar,
    nextPageBtnToolbar: !!nextPageBtnToolbar,
    lastPageBtnToolbar: !!lastPageBtnToolbar,
    pageInputToolbar: !!pageInputToolbar
  });
  
  if (firstPageBtnToolbar) {
    firstPageBtnToolbar.addEventListener('click', () => {
      console.log('First page button clicked');
      goToPage(1);
    });
    console.log('✅ First page button listener attached');
  } else {
    console.error('❌ firstPageBtnToolbar not found!');
  }
  
  if (prevPageBtnToolbar) {
    prevPageBtnToolbar.addEventListener('click', () => {
      console.log('Previous page button clicked, current page:', currentPageNumber);
      if (currentPageNumber > 1) goToPage(currentPageNumber - 1);
    });
    console.log('✅ Previous page button listener attached');
  } else {
    console.error('❌ prevPageBtnToolbar not found!');
  }
  
  if (nextPageBtnToolbar) {
    nextPageBtnToolbar.addEventListener('click', () => {
      console.log('Next page button clicked, current page:', currentPageNumber);
      if (currentPdf && currentPageNumber < currentPdf.numPages) {
        goToPage(currentPageNumber + 1);
      }
    });
    console.log('✅ Next page button listener attached');
  } else {
    console.error('❌ nextPageBtnToolbar not found!');
  }
  
  if (lastPageBtnToolbar) {
    lastPageBtnToolbar.addEventListener('click', () => {
      console.log('Last page button clicked');
      if (currentPdf) goToPage(currentPdf.numPages);
    });
    console.log('✅ Last page button listener attached');
  } else {
    console.error('❌ lastPageBtnToolbar not found!');
  }
  
  if (pageInputToolbar) {
    pageInputToolbar.addEventListener('change', () => {
      const pageNum = parseInt(pageInputToolbar.value);
      console.log('Page input changed to:', pageNum);
      if (pageNum && pageNum >= 1 && currentPdf && pageNum <= currentPdf.numPages) {
        goToPage(pageNum);
      } else {
        pageInputToolbar.value = currentPageNumber;
      }
    });
    
    pageInputToolbar.addEventListener('keypress', (e) => {
      if (e.key === "Enter") {
        pageInputToolbar.blur(); // This will trigger the change event
      }
    });
    console.log('✅ Page input listener attached');
  } else {
    console.error('❌ pageInputToolbar not found!');
  }
  
  // Zoom controls
  const zoomSelect = document.getElementById('zoomSelect');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  
  if (zoomSelect) {
    zoomSelect.addEventListener('change', () => {
      handleZoomChange(zoomSelect.value);
    });
  }
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const newScale = Math.min(currentScale + 0.25, 3);
      setZoom(newScale);
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const newScale = Math.max(currentScale - 0.25, 0.25);
      setZoom(newScale);
    });
  }
  
  // Toolbar overlay toggle
  const toggleOverlaysBtnToolbar = document.getElementById('toggleOverlaysBtnToolbar');
  if (toggleOverlaysBtnToolbar) {
    toggleOverlaysBtnToolbar.addEventListener('click', toggleOverlays);
  }
  
  // Search controls
  setupSearchControls();
}

// Setup search controls
function setupSearchControls() {
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  const searchContainer = document.getElementById('searchContainer');
  const toolbarTitle = document.getElementById('toolbarTitle');
  const searchInput = document.getElementById('searchInput');
  const searchCloseBtn = document.getElementById('searchCloseBtn');
  const searchPrevBtn = document.getElementById('searchPrevBtn');
  const searchNextBtn = document.getElementById('searchNextBtn');
  
  // Toggle search UI
  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', () => {
      toggleSearch();
    });
  }
  
  // Close search
  if (searchCloseBtn) {
    searchCloseBtn.addEventListener('click', () => {
      toggleSearch();
    });
  }
  
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          findPrevMatch();
        } else {
          findNextMatch();
        }
      } else if (e.key === 'Escape') {
        toggleSearch();
      }
    });
  }
  
  // Navigation buttons
  if (searchPrevBtn) {
    searchPrevBtn.addEventListener('click', findPrevMatch);
  }
  
  if (searchNextBtn) {
    searchNextBtn.addEventListener('click', findNextMatch);
  }
  
  console.log('✅ Search controls initialized');
}

// Toggle search UI
function toggleSearch() {
  const searchContainer = document.getElementById('searchContainer');
  const toolbarTitle = document.getElementById('toolbarTitle');
  const searchInput = document.getElementById('searchInput');
  
  if (searchContainer.style.display === 'none') {
    searchContainer.style.display = 'flex';
    toolbarTitle.style.display = 'none';
    searchInput.focus();
  } else {
    searchContainer.style.display = 'none';
    toolbarTitle.style.display = 'block';
    clearSearch();
  }
}

// Perform search
async function performSearch(query) {
  searchQuery = query.trim();
  
  if (!searchQuery || !currentPdf) {
    clearSearch();
    return;
  }
  
  console.log('🔍 Searching for:', searchQuery);
  searchMatches = [];
  
  // Search through all pages
  for (let pageNum = 1; pageNum <= currentPdf.numPages; pageNum++) {
    const matches = await searchInPage(pageNum, searchQuery);
    searchMatches.push(...matches);
  }
  
  console.log(`Found ${searchMatches.length} matches`);
  updateSearchCount();
  
  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    // Re-render current page to show highlights
    if (currentPageNumber) {
      await renderPage(currentPageNumber);
    }
    highlightCurrentMatch();
  } else {
    // Re-render to clear any old highlights
    if (currentPageNumber) {
      await renderPage(currentPageNumber);
    }
  }
}

// Search in a specific page
async function searchInPage(pageNum, query) {
  const page = await currentPdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  
  // Cache text content
  pageTextContent.set(pageNum, textContent);
  
  const matches = [];
  const queryLower = query.toLowerCase();
  
  textContent.items.forEach((item, itemIndex) => {
    const text = item.str.toLowerCase();
    let startIndex = 0;
    
    while ((startIndex = text.indexOf(queryLower, startIndex)) !== -1) {
      matches.push({
        pageNum,
        itemIndex,
        charIndex: startIndex,
        length: query.length,
        item
      });
      startIndex += query.length;
    }
  });
  
  return matches;
}

// Highlight current match
function highlightCurrentMatch() {
  if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) {
    return;
  }
  
  const match = searchMatches[currentMatchIndex];
  
  // Navigate to the page if needed
  if (match.pageNum !== currentPageNumber) {
    goToPage(match.pageNum).then(() => {
      updateHighlights();
    });
  } else {
    updateHighlights();
  }
  
  updateSearchCount();
}

// Scroll to match
function scrollToMatch(match) {
  console.log('Scrolling to match on page', match.pageNum);
  updateHighlights();
}

// Find next match
function findNextMatch() {
  if (searchMatches.length === 0) return;
  
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  highlightCurrentMatch();
}

// Find previous match
function findPrevMatch() {
  if (searchMatches.length === 0) return;
  
  currentMatchIndex = currentMatchIndex - 1;
  if (currentMatchIndex < 0) {
    currentMatchIndex = searchMatches.length - 1;
  }
  highlightCurrentMatch();
}

// Update search count display
function updateSearchCount() {
  const searchCount = document.getElementById('searchCount');
  if (searchCount) {
    if (searchMatches.length === 0) {
      searchCount.textContent = '0 / 0';
    } else {
      searchCount.textContent = `${currentMatchIndex + 1} / ${searchMatches.length}`;
    }
  }
}

// Clear search
function clearSearch() {
  searchQuery = '';
  searchMatches = [];
  currentMatchIndex = -1;
  updateSearchCount();
  
  // Re-render current page to remove highlights
  if (currentPdf && currentPageNumber) {
    renderPage(currentPageNumber);
  }
}

// Render text layer for search highlighting
function renderTextLayer(textLayerDiv, viewport, textContent, pageNum) {
  textLayerDiv.innerHTML = '';
  
  textContent.items.forEach((item, itemIndex) => {
    const tx = pdfjsLib.Util.transform(
      viewport.transform,
      item.transform
    );
    
    const style = textContent.styles[item.fontName] || {};
    const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    const fontAscent = style.ascent ? style.ascent * fontHeight : fontHeight * 0.75;
    
    const textDiv = document.createElement('span');
    textDiv.textContent = item.str;
    textDiv.style.position = 'absolute';
    textDiv.style.left = tx[4] + 'px';
    textDiv.style.top = (tx[5] - fontAscent) + 'px';
    textDiv.style.fontSize = fontHeight + 'px';
    textDiv.style.fontFamily = item.fontName || 'sans-serif';
    textDiv.setAttribute('data-item-index', itemIndex);
    
    textLayerDiv.appendChild(textDiv);
  });
  
  // Apply highlights if there's an active search
  if (searchQuery) {
    highlightMatchesOnPage(textLayerDiv, pageNum);
  }
}

// Highlight matches on a specific page
function highlightMatchesOnPage(textLayerDiv, pageNum) {
  const pageMatches = searchMatches.filter(m => m.pageNum === pageNum);
  console.log(`🎨 Highlighting ${pageMatches.length} matches on page ${pageNum}`);
  
  pageMatches.forEach((match, index) => {
    const textSpan = textLayerDiv.querySelector(`[data-item-index="${match.itemIndex}"]`);
    if (!textSpan) {
      console.warn(`⚠️ Could not find text span for item index ${match.itemIndex}`);
      return;
    }
    
    const text = textSpan.textContent;
    const beforeText = text.substring(0, match.charIndex);
    const matchText = text.substring(match.charIndex, match.charIndex + match.length);
    const afterText = text.substring(match.charIndex + match.length);
    
    console.log(`  Match ${index}: "${matchText}" at char ${match.charIndex} in item ${match.itemIndex}`);
    
    // Replace content with highlighted version
    textSpan.innerHTML = '';
    
    if (beforeText) {
      textSpan.appendChild(document.createTextNode(beforeText));
    }
    
    const highlight = document.createElement('span');
    highlight.className = 'highlight';
    highlight.textContent = matchText;
    
    // Check if this is the current match
    const globalMatchIndex = searchMatches.indexOf(match);
    if (globalMatchIndex === currentMatchIndex) {
      highlight.classList.add('selected');
      console.log(`  ✨ This is the selected match (${globalMatchIndex + 1}/${searchMatches.length})`);
    }
    
    textSpan.appendChild(highlight);
    
    if (afterText) {
      textSpan.appendChild(document.createTextNode(afterText));
    }
  });
}

// Re-highlight when navigating between matches
function updateHighlights() {
  // Remove all selected highlights
  document.querySelectorAll('.textLayer .highlight.selected').forEach(h => {
    h.classList.remove('selected');
  });
  
  // Add selected to current match
  if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
    const match = searchMatches[currentMatchIndex];
    const textLayer = pageWrapper?.querySelector('.textLayer');
    
    if (textLayer && match.pageNum === currentPageNumber) {
      const highlights = textLayer.querySelectorAll('.highlight');
      const pageMatches = searchMatches.filter(m => m.pageNum === currentPageNumber);
      const localIndex = pageMatches.indexOf(match);
      
      if (highlights[localIndex]) {
        highlights[localIndex].classList.add('selected');
        highlights[localIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

// Handle zoom changes
function handleZoomChange(value) {
  if (value === 'auto' || value === 'page-fit' || value === 'page-width') {
    // Special zoom modes - for now just use defaults
    if (value === 'page-fit') setZoom(1.0);
    else if (value === 'page-width') setZoom(1.5);
    else setZoom(1.5);
  } else {
    const scale = parseFloat(value);
    if (!isNaN(scale)) {
      setZoom(scale);
    }
  }
}

// Set zoom level
function setZoom(scale) {
  currentScale = scale;
  const zoomSelect = document.getElementById('zoomSelect');
  if (zoomSelect) {
    zoomSelect.value = scale.toString();
  }
  if (currentPdf && currentPageNumber) {
    renderPage(currentPageNumber);
  }
}

// Document Generation Setup
function setupDocumentGeneration() {
  const generateDocumentBtn = document.getElementById('generateDocumentBtn');
  const generateEndend10921Btn = document.getElementById('generateEndend10921Btn');
  
  if (generateDocumentBtn) {
    generateDocumentBtn.addEventListener('click', () => {
      generateDocument('document');
    });
  }
  
  if (generateEndend10921Btn) {
    generateEndend10921Btn.addEventListener('click', () => {
      generateDocument('ENDEND10921');
    });
  }
}

// Generate Document Function
async function generateDocument(documentName) {
  console.log(`🚀 Generating document: ${documentName}`);
  
  // Show generating state
  const btn = document.querySelector(`[data-document="${documentName}"]`);
  if (btn) {
    btn.classList.add('generating');
  }
  
  // Show progress
  showProgress(`Generating ${documentName}.xml...`);
  
  // Send generation request to server
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'generate_document',
      documentName: documentName
    }));
    
    // Store which document we're generating
    currentDocument = documentName;
  } else {
    console.error('❌ WebSocket not connected');
    hideProgress();
    if (btn) {
      btn.classList.remove('generating');
    }
    alert('Not connected to server. Please refresh the page.');
  }
}

// Update Current Document UI
function updateCurrentDocumentUI(documentName) {
  console.log(`📝 Updating UI for document: ${documentName}`);
  currentDocument = documentName;
  
  // Update status display
  const statusDiv = document.getElementById('currentDocumentStatus');
  const statusValue = document.getElementById('currentDocumentName');
  
  if (statusDiv && statusValue) {
    statusDiv.style.display = 'block';
    statusValue.textContent = documentName;
  }
  
  // Update button states
  const allBtns = document.querySelectorAll('.document-btn');
  allBtns.forEach(btn => {
    btn.classList.remove('active', 'generating');
  });
  
  const activeBtn = document.querySelector(`[data-document="${documentName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

async function goToPage(pageNum) {
  console.log('📄 goToPage called with pageNum:', pageNum);
  
  if (!currentPdf) {
    console.warn('⚠️ No PDF loaded, cannot navigate');
    return;
  }
  
  if (pageNum < 1 || pageNum > currentPdf.numPages) {
    console.warn('⚠️ Invalid page number:', pageNum, 'Valid range: 1-' + currentPdf.numPages);
    return;
  }

  // Clear overlay selection when changing pages
  selectedOverlayId = null;

  currentPageNumber = pageNum;
  console.log('✅ Navigating to page:', currentPageNumber);
  await renderPage(currentPageNumber);
  updatePageNavigation();
}

function updatePageNavigation() {
  if (!currentPdf) {
    return;
  }

  // Update toolbar page controls
  const pageInputToolbar = document.getElementById('pageInputToolbar');
  const totalPagesToolbar = document.getElementById('totalPagesToolbar');
  const firstPageBtnToolbar = document.getElementById('firstPageBtnToolbar');
  const prevPageBtnToolbar = document.getElementById('prevPageBtnToolbar');
  const nextPageBtnToolbar = document.getElementById('nextPageBtnToolbar');
  const lastPageBtnToolbar = document.getElementById('lastPageBtnToolbar');
  
  if (pageInputToolbar) {
    pageInputToolbar.value = currentPageNumber;
    pageInputToolbar.max = currentPdf.numPages;
  }
  
  if (totalPagesToolbar) {
    totalPagesToolbar.textContent = currentPdf.numPages;
  }

  // Update button states
  if (firstPageBtnToolbar) firstPageBtnToolbar.disabled = currentPageNumber === 1;
  if (prevPageBtnToolbar) prevPageBtnToolbar.disabled = currentPageNumber === 1;
  if (nextPageBtnToolbar) nextPageBtnToolbar.disabled = currentPageNumber === currentPdf.numPages;
  if (lastPageBtnToolbar) lastPageBtnToolbar.disabled = currentPageNumber === currentPdf.numPages;

  // Also update legacy navigation if it exists
  if (pageNavigation) {
    if (currentPdf.numPages > 1) {
      pageNavigation.style.display = "flex";
    } else {
      pageNavigation.style.display = "none";
    }
  }

  if (pageInput) {
    pageInput.value = currentPageNumber;
  }
  
  const totalPagesEl = document.getElementById('totalPages');
  if (totalPagesEl) {
    totalPagesEl.textContent = currentPdf.numPages;
  }

  if (firstPageBtn) firstPageBtn.disabled = currentPageNumber === 1;
  if (prevPageBtn) prevPageBtn.disabled = currentPageNumber === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPageNumber === currentPdf.numPages;
  if (lastPageBtn) lastPageBtn.disabled = currentPageNumber === currentPdf.numPages;

  // Update page info
  const overlayCount = overlayData.filter(item => item.page === currentPageNumber).length;
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPageNumber} of ${currentPdf.numPages} • ${overlayCount} overlay items`;
  }
}

function setupDragAndDrop() {
  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, preventDefaults, false);
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    document.addEventListener(eventName, () => {
      dropZone.classList.remove('hidden');
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, () => {
      dropZone.classList.remove('dragover');
      setTimeout(() => {
        if (!dropZone.classList.contains('dragover')) {
          dropZone.classList.add('hidden');
        }
      }, 100);
    }, false);
  });

  // Handle dropped files
  document.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  handleFiles(files);
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (fileExtension === 'pdf') {
      // Handle PDF file
      console.log("Dropped PDF file:", file.name);
      pdfUrlInput.value = `📄 ${file.name}`;

      const fileUrl = URL.createObjectURL(file);
      loadPdf(fileUrl);

    } else if (fileExtension === 'json') {
      // Handle JSON file
      console.log("Dropped JSON file:", file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          overlayData = jsonData;
          console.log("Loaded overlay data from dropped file:", overlayData);

          // Update the select dropdown to show uploaded file
          const uploadedOption = document.querySelector('#jsonSelect option[value="uploaded"]');
          if (uploadedOption) {
            uploadedOption.remove();
          }

          const newOption = document.createElement('option');
          newOption.value = 'uploaded';
          newOption.textContent = `📄 ${file.name} (Dropped)`;
          newOption.selected = true;
          jsonSelect.insertBefore(newOption, jsonSelect.firstChild);

          // Validate coordinate consistency
          validateCoordinates(overlayData);

          updateStatus(); // Update status indicator

          if (currentPdf) renderPage(currentPageNumber);
        } catch (error) {
          console.error("Error parsing dropped JSON file:", error);
          alert("Error parsing JSON file: " + error.message);
        }
      };

      reader.onerror = () => {
        alert("Error reading dropped file");
      };

      reader.readAsText(file);
    } else {
      alert(`Unsupported file type: .${fileExtension}\nPlease drop PDF or JSON files only.`);
    }
  });
}

function updateStatus() {
  // Update page info text
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    if (!currentPdf && overlayData.length === 0) {
      pageInfo.textContent = 'Load a PDF and coordinate data to begin';
    } else if (!currentPdf) {
      pageInfo.textContent = `Coordinate data loaded (${overlayData.length} items) - Load a PDF to view overlays`;
    } else if (overlayData.length === 0) {
      pageInfo.textContent = `PDF loaded (${currentPdf.numPages} pages) - Load coordinate data to view overlays`;
    } else {
      const overlayCount = overlayData.filter(item => item.page === currentPageNumber).length;
      pageInfo.textContent = `Page ${currentPageNumber} of ${currentPdf.numPages} • ${overlayCount} overlays on this page`;
    }
  }

  // Update file upload areas to show what's loaded
  const pdfUploadArea = document.getElementById('pdfUploadArea');
  if (pdfUploadArea && currentPdf) {
    pdfUploadArea.querySelector('.upload-text').textContent = 'PDF loaded ✓';
    pdfUploadArea.style.borderColor = 'var(--success)';
    pdfUploadArea.style.background = '#d1fae5';
  }

  const jsonUploadArea = document.getElementById('jsonUploadArea');
  if (jsonUploadArea && overlayData.length > 0) {
    jsonUploadArea.querySelector('.upload-text').textContent = `${overlayData.length} coordinates loaded ✓`;
    jsonUploadArea.style.borderColor = 'var(--success)';
    jsonUploadArea.style.background = '#d1fae5';
  }
}

async function loadPdf(url) {
  viewer.innerHTML = "";

  // Clean up previous object URL if it exists
  if (currentPdfObjectUrl && currentPdfObjectUrl !== url) {
    URL.revokeObjectURL(currentPdfObjectUrl);
    currentPdfObjectUrl = null;
  }

  // Store the object URL if this is a blob URL (uploaded file)
  if (url.startsWith('blob:')) {
    currentPdfObjectUrl = url;
  }

  try {
    currentPdf = await pdfjsLib.getDocument({ url }).promise;
    console.log("PDF loaded, pages:", currentPdf.numPages);
    updateStatus(); // Update status indicator
    updatePageNavigation(); // Update page navigation
    // render first page for demo
    currentPageNumber = 1;
    await renderPage(currentPageNumber);
  } catch (e) {
    console.error(e);
    alert("Error loading PDF: " + e.message);
    updateStatus(); // Update status even on error
  }
}

async function renderPage(pageNum) {
  viewer.innerHTML = "";
  const page = await currentPdf.getPage(pageNum);

  // Get page info for debugging
  const pageInfo = {
    pageNumber: pageNum,
    userUnit: page.userUnit,
    rotate: page.rotate,
    view: page.view,
    pageInfo: page.pageInfo
  };
  console.log("Page info:", pageInfo);

  // Use current zoom scale
  const scale = currentScale;
  const viewport = page.getViewport({ scale });
  currentViewport = viewport;

  console.log("Viewport info:", {
    width: viewport.width,
    height: viewport.height,
    scale: viewport.scale,
    rotation: viewport.rotation,
    transform: viewport.transform
  });

  // wrapper
  pageWrapper = document.createElement("div");
  pageWrapper.className = "pageWrapper";
  pageWrapper.style.width = viewport.width + "px";
  pageWrapper.style.height = viewport.height + "px";
  pageWrapper.style.margin = "auto";
  pageWrapper.style.position = "relative";
  viewer.appendChild(pageWrapper);

  // canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = viewport.width + "px";
  canvas.style.height = viewport.height + "px";
  pageWrapper.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // render PDF page into canvas
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Text layer for search highlighting
  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "textLayer";
  textLayerDiv.style.width = viewport.width + "px";
  textLayerDiv.style.height = viewport.height + "px";
  textLayerDiv.style.position = "absolute";
  textLayerDiv.style.left = "0";
  textLayerDiv.style.top = "0";
  pageWrapper.appendChild(textLayerDiv);

  // Render text layer
  console.log('📝 Rendering text layer for page', pageNum);
  const textContent = await page.getTextContent();
  pageTextContent.set(pageNum, textContent);
  renderTextLayer(textLayerDiv, viewport, textContent, pageNum);
  console.log('✅ Text layer rendered with', textContent.items.length, 'text items');

  // overlay layer (absolute)
  const overlayLayer = document.createElement("div");
  overlayLayer.className = "overlay-layer";
  overlayLayer.style.width = viewport.width + "px";
  overlayLayer.style.height = viewport.height + "px";
  overlayLayer.style.position = "absolute";
  overlayLayer.style.left = "0";
  overlayLayer.style.top = "0";
  pageWrapper.appendChild(overlayLayer);

  // draw rectangles from overlayData for this page
  drawOverlaysForPage(overlayLayer, pageNum, viewport);

  // Refresh outline if it's currently enabled
  if (showOutline) {
    pageWrapper.classList.add('outlined');
    const dimensions = `${Math.round(viewport.width)}×${Math.round(viewport.height)}px`;
    pageWrapper.setAttribute('data-dimensions', dimensions);
    drawCoordinateGrid();
  }

  // Update page navigation after rendering
  updatePageNavigation();
}

function getCoordinatesFromItem(item, unit) {
  let x, y, width, height;

  // Always use points as the base unit for PDF coordinate system
  // PDF.js expects coordinates in points
  if (item.x_pt !== undefined) {
    x = item.x_pt;
    y = item.y_pt;
    width = item.w_pt;
    height = item.h_pt;
  } else if (item.x !== undefined) {
    // Fallback to basic coordinates (assumed to be in points)
    x = item.x;
    y = item.y;
    width = item.width;
    height = item.height;
  } else {
    console.warn("No valid coordinates found for item:", item);
    return null;
  }

  return { x, y, width, height, originalUnit: 'pt' };
}

function drawOverlaysForPage(overlayLayer, pageNum, viewport) {
  overlayLayer.innerHTML = "";

  const selectedUnit = unitSelect.value;
  const pageItems = overlayData.filter((item) => item.page === pageNum);
  console.log(`Drawing ${pageItems.length} overlays for page ${pageNum} using unit: ${selectedUnit}`, pageItems);

  pageItems.forEach((item) => {
    // Get coordinates in points (PDF coordinate system)
    const coords = getCoordinatesFromItem(item, selectedUnit);

    if (!coords || (!coords.x && coords.x !== 0) || (!coords.y && coords.y !== 0) ||
        !coords.width || !coords.height) {
      console.warn(`No valid coordinates found for item:`, item);
      return;
    }

    // PDF coordinates are in points with bottom-left origin
    // Handle both top-left and bottom-left origin coordinate systems
    const useTopLeftOrigin = coordinateOrigin.value === "top-left";

    // Get the PDF page dimensions in points
    const pageHeight = viewport.height / viewport.scale; // Convert back to points

    let x1, y1, x2, y2;

    if (useTopLeftOrigin) {
      // Convert from top-left origin to bottom-left origin (PDF standard)
      x1 = coords.x;
      const y1_topLeft = coords.y;
      y1 = pageHeight - y1_topLeft - coords.height; // Convert to bottom-left origin
      x2 = coords.x + coords.width;
      y2 = pageHeight - y1_topLeft; // Bottom-left origin

      console.log(`Item ${item.id}: Converting from top-left [${coords.x}, ${y1_topLeft}] to bottom-left [${x1}, ${y1}]`);
    } else {
      // Coordinates are already in bottom-left origin (PDF standard)
      x1 = coords.x;
      y1 = coords.y;
      x2 = coords.x + coords.width;
      y2 = coords.y + coords.height;

      console.log(`Item ${item.id}: Using bottom-left coords [${x1}, ${y1}] as-is`);
    }

    console.log(`Item ${item.id}: Final PDF rect [${x1}, ${y1}, ${x2}, ${y2}] (page height: ${pageHeight})`);

    // Skip items with zero or negative dimensions
    if (x2 <= x1 || y2 <= y1) {
      console.warn(`Skipping item ${item.id} with invalid dimensions`);
      return;
    }

    // Convert from PDF coordinate system to viewport coordinates
    // PDF.js convertToViewportRectangle handles the scaling and coordinate transformation
    const vb = viewport.convertToViewportRectangle([x1, y1, x2, y2]);
    console.log(`Item ${item.id}: Viewport coords`, vb);

    // vb returns [x1, y1, x2, y2] in viewport coordinates
    // Calculate position and dimensions
    const left = Math.min(vb[0], vb[2]);
    const top = Math.min(vb[1], vb[3]);
    const width = Math.abs(vb[2] - vb[0]);
    const height = Math.abs(vb[3] - vb[1]);

    // Skip items that are too small to be visible
    if (width < 1 || height < 1) {
      console.warn(`Skipping item ${item.id} with too small viewport dimensions:`, {width, height});
      return;
    }

    console.log(`Item ${item.id}: Final position - left: ${left}, top: ${top}, width: ${width}, height: ${height}`);

    // Create overlay element
    const el = document.createElement("div");
    el.className = "overlay-rect";
    el.dataset.elemId = item.id;
    el.dataset.id = item.id;
    el.dataset.unit = selectedUnit.toUpperCase();
    el.style.left = Math.round(left) + "px";
    el.style.top = Math.round(top) + "px";
    el.style.width = Math.round(width) + "px";
    el.style.height = Math.round(height) + "px";

    // Create informative title with coordinates in different units
    const displayCoords = getDisplayCoordinates(item, selectedUnit);
    el.title = `${item.id} - ${displayCoords}`;

    el.addEventListener("click", onOverlayClick);
    overlayLayer.appendChild(el);
  });

  // Populate the overlay selector panel
  populateOverlaySelector();
}

function getDisplayCoordinates(item, selectedUnit) {
  const units = ['pt', 'px', 'mm'];
  const coordStrings = [];

  units.forEach(unit => {
    const suffix = `_${unit}`;
    if (item[`x${suffix}`] !== undefined) {
      const x = Math.round(item[`x${suffix}`] * 100) / 100;
      const y = Math.round(item[`y${suffix}`] * 100) / 100;
      const w = Math.round(item[`w${suffix}`] * 100) / 100;
      const h = Math.round(item[`h${suffix}`] * 100) / 100;
      const prefix = unit === selectedUnit ? '★ ' : '';
      coordStrings.push(`${prefix}${unit.toUpperCase()}: (${x}, ${y}) ${w}×${h}`);
    }
  });

  return coordStrings.join(' | ');
}function toggleOutline() {
  showOutline = !showOutline;
  const btn = document.getElementById('toggleOutlineBtn');

  if (showOutline) {
    if (pageWrapper) {
      pageWrapper.classList.add('outlined');
      // Update dimensions in the outline
      if (currentViewport) {
        const dimensions = `${Math.round(currentViewport.width)}×${Math.round(currentViewport.height)}px`;
        pageWrapper.setAttribute('data-dimensions', dimensions);
      }
      // Add coordinate grid
      drawCoordinateGrid();
    }
    
    if (btn) {
      btn.innerHTML = '<span>📐</span><span>Hide Outline</span>';
      btn.classList.add('active');
    }
  } else {
    if (pageWrapper) {
      pageWrapper.classList.remove('outlined');
      // Remove coordinate grid
      const gridCanvas = pageWrapper.querySelector('.coordinate-grid');
      if (gridCanvas) {
        gridCanvas.remove();
      }
    }
    
    if (btn) {
      btn.innerHTML = '<span>📐</span><span>Show Outline</span>';
      btn.classList.remove('active');
    }
  }
}

function toggleOverlays() {
  overlaysVisible = !overlaysVisible;
  const btn = document.getElementById('toggleOverlaysBtn');
  const toolbarBtn = document.getElementById('toggleOverlaysBtnToolbar');

  if (overlaysVisible) {
    // Show overlays
    document.body.classList.remove('overlays-hidden');
    if (btn) {
      btn.innerHTML = '<span>👁️</span><span>Hide Overlays</span>';
      btn.classList.remove('active');
    }
    if (toolbarBtn) {
      toolbarBtn.style.background = 'transparent';
    }
    // Show overlay selector panel
    if (overlayData.length > 0 && overlaySelector) {
      overlaySelector.style.display = 'block';
    }
    console.log('Overlays shown');
  } else {
    // Hide overlays
    document.body.classList.add('overlays-hidden');
    if (btn) {
      btn.innerHTML = '<span>🙈</span><span>Show Overlays</span>';
      btn.classList.add('active');
    }
    if (toolbarBtn) {
      toolbarBtn.style.background = 'rgba(255,255,255,0.15)';
    }
    // Hide overlay selector panel
    if (overlaySelector) {
      overlaySelector.style.display = 'none';
    }
    console.log('Overlays hidden');
  }

  // Save state to localStorage
  localStorage.setItem('overlaysVisible', overlaysVisible.toString());

  // Update status indicator
  updateStatus();
}

function drawCoordinateGrid() {
  if (!currentViewport || !pageWrapper) return;

  // Remove existing grid
  const existingGrid = pageWrapper.querySelector('.coordinate-grid');
  if (existingGrid) {
    existingGrid.remove();
  }

  // Create grid canvas
  const gridCanvas = document.createElement('canvas');
  gridCanvas.className = 'coordinate-grid';
  gridCanvas.width = Math.floor(currentViewport.width);
  gridCanvas.height = Math.floor(currentViewport.height);
  gridCanvas.style.width = currentViewport.width + 'px';
  gridCanvas.style.height = currentViewport.height + 'px';

  const ctx = gridCanvas.getContext('2d');

  // Draw grid lines every 50 pixels
  const gridSize = 50;
  ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);

  // Vertical lines
  for (let x = 0; x <= gridCanvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gridCanvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= gridCanvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gridCanvas.width, y);
    ctx.stroke();
  }

  // Draw coordinate labels
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
  ctx.font = '10px Arial';

  // Corner coordinates
  ctx.fillText('(0,0)', 5, 15);
  ctx.fillText(`(${Math.round(currentViewport.width)},0)`, gridCanvas.width - 60, 15);
  ctx.fillText('(0,' + Math.round(currentViewport.height) + ')', 5, gridCanvas.height - 5);
  ctx.fillText(`(${Math.round(currentViewport.width)},${Math.round(currentViewport.height)})`, gridCanvas.width - 80, gridCanvas.height - 5);

  pageWrapper.appendChild(gridCanvas);
}

// --- Modal behavior ---
const modal = document.getElementById("modal");
const elemIdSpan = document.getElementById("elemId");
const elemTypeSpan = document.getElementById("elemType");
const actionSelect = document.getElementById("actionSelect");
const cancelBtn = document.getElementById("cancelBtn");
const sendBtn = document.getElementById("sendBtn");

let currentClickedId = null;
let currentOverlayType = null;
let ws = null;
let dropdownOptions = {};

// WebSocket connection
function initWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = 8081; // Server WebSocket port
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}`;

    console.log('🔗 Connecting to WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = function() {
        console.log('✅ WebSocket connected');
        updateConnectionStatus(true);
    };

    ws.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    };

    ws.onclose = function() {
        console.log('🔌 WebSocket disconnected');
        updateConnectionStatus(false);

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            initWebSocket();
        }, 3000);
    };

    ws.onerror = function(error) {
        console.error('❌ WebSocket error:', error);
        updateConnectionStatus(false);
    };
}

function handleWebSocketMessage(data) {
    console.log('📨 WebSocket message received:', data);

    switch (data.type) {
        case 'config':
            dropdownOptions = data.data.dropdownOptions;
            console.log('✅ Dropdown options loaded:', dropdownOptions);
            break;

        case 'generation_started':
            console.log('🚀 Document generation started:', data.documentName);
            showProgress(`Generating ${data.documentName}...`);
            // Start with XML stage
            activateStage('xml');
            break;

        case 'generation_progress':
            console.log('📊 Generation progress:', data.message);
            if (data.message && progressModalStatus) {
                progressModalStatus.textContent = data.message;
                
                // Update stages based on message content
                const message = data.message.toLowerCase();
                if (message.includes('xml') || message.includes('modif')) {
                    activateStage('xml');
                } else if (message.includes('tex') || message.includes('convert')) {
                    activateStage('tex');
                } else if (message.includes('pdf') || message.includes('compil')) {
                    activateStage('pdf');
                } else if (message.includes('json') || message.includes('coordinat')) {
                    activateStage('json');
                } else if (message.includes('copying') || message.includes('complete')) {
                    completeStagesUpTo('json');
                }
            }
            break;

        case 'generation_complete':
            console.log('✅ Document generation complete', data);
            
            // Mark all stages as completed
            completeStagesUpTo('json');
            
            // Update status
            if (progressModalStatus) {
                progressModalStatus.textContent = 'Generation complete! Loading files...';
            }
            
            // Update UI to show current document
            updateCurrentDocumentUI(data.documentName);
            
            // Auto-load the generated files
            setTimeout(() => {
                const pdfPath = convertToRelativeUrl(data.pdfPath);
                const jsonPath = convertToRelativeUrl(data.jsonPath);
                
                console.log(`📄 Loading generated files: PDF=${pdfPath}, JSON=${jsonPath}`);
                
                loadNewGeneratedFiles(pdfPath, jsonPath).then(() => {
                    setTimeout(() => {
                        hideProgress();
                    }, 500);
                }).catch(error => {
                    console.error('❌ Failed to load generated files:', error);
                    hideProgress();
                    alert('Generated files successfully, but failed to load them. Please reload manually.');
                });
            }, 500);
            break;

        case 'generation_error':
            console.error('❌ Generation error:', data.error);
            hideProgress();
            alert(`Failed to generate document: ${data.error}`);
            
            // Remove generating state
            const btn = document.querySelector(`[data-document="${data.documentName}"]`);
            if (btn) {
                btn.classList.remove('generating');
            }
            break;

        case 'processing_started':
            console.log('🚀 Processing started for:', data.overlayType);
            showProgress(`Processing ${data.overlayType} instruction...`);
            // Start with XML stage
            activateStage('xml');
            break;

        case 'processing_progress':
            console.log('📊 Processing progress:', data);
            // Clear fallback interval since we're getting real updates
            if (window.progressFallbackInterval) {
                clearInterval(window.progressFallbackInterval);
                window.progressFallbackInterval = null;
            }

            if (data.message && progressModalStatus) {
                progressModalStatus.textContent = data.message;
                
                // Update stages based on message content
                const message = data.message.toLowerCase();
                if (message.includes('xml') || message.includes('modif')) {
                    activateStage('xml');
                } else if (message.includes('tex') || message.includes('convert')) {
                    activateStage('tex');
                } else if (message.includes('pdf') || message.includes('compil')) {
                    activateStage('pdf');
                } else if (message.includes('json') || message.includes('coordinat')) {
                    activateStage('json');
                } else if (message.includes('copying') || message.includes('complete')) {
                    completeStagesUpTo('json');
                }
            }
            break;

        case 'processing_complete':
            console.log('✅ Processing complete', data);
            
            // Mark all stages as completed
            completeStagesUpTo('json');
            
            // Update status
            if (progressModalStatus) {
                progressModalStatus.textContent = 'Processing complete! Loading files...';
            }

            // Auto-reload the newly generated files with specific paths
            setTimeout(() => {
                console.log('🔄 Starting auto-load of generated files...');
                
                // Use the exact file paths from the server response
                let pdfPath = data.result?.pdfPath;
                let jsonPath = data.result?.jsonPath;
                
                if (pdfPath && jsonPath) {
                    // Convert absolute filesystem paths to relative web URLs
                    // e.g., /Users/che/Code/.../TeX/file.pdf -> /TeX/file.pdf
                    pdfPath = convertToRelativeUrl(pdfPath);
                    jsonPath = convertToRelativeUrl(jsonPath);
                    
                    console.log(`📄 Converted paths: PDF=${pdfPath}, JSON=${jsonPath}`);
                    
                    loadNewGeneratedFiles(pdfPath, jsonPath).then(() => {
                        // Hide progress after files are successfully loaded
                        setTimeout(() => {
                            hideProgress();
                            showProcessingNotification(`✅ Files loaded successfully!`, 'success');
                        }, 500);
                    }).catch((error) => {
                        // Hide progress even if auto-loading fails
                        setTimeout(() => {
                            hideProgress();
                            showProcessingNotification(`⚠️ Processing complete, but auto-loading failed: ${error.message}`, 'warning');
                        }, 500);
                    });
                } else {
                    console.warn('⚠️ No file paths in processing_complete message, skipping auto-load');
                    hideProgress();
                    showProcessingNotification(`⚠️ Processing complete, but no file paths received. Please load files manually.`, 'warning');
                }
            }, 1000);
            break;

        case 'processing_error':
            hideProgress();
            showProcessingNotification(`❌ Error: ${data.error}`, 'error');
            break;

        case 'file_change':
            console.log(`📁 File ${data.eventType}: ${data.filePath}`);
            // File change auto-loading is disabled - only load files after explicit processing_complete
            // This prevents loading default files when any file changes
            break;

        case 'dropdown_options':
            if (data.overlayType) {
                dropdownOptions[data.overlayType] = data.options;
            } else {
                dropdownOptions = data.options;
            }
            break;

        case 'process_output':
            // Server already filters messages, so we only receive important status
            const message = data.message.trim();
            if (!message) break;
            
            console.log(`📤 Status update:`, message);
            
            // Update the new simple modal
            if (progressModalStatus) {
                // Check if it's an error message
                const isError = 
                    message.toLowerCase().includes('error') ||
                    message.toLowerCase().includes('failed') ||
                    message.includes('❌');
                
                // Update status text
                if (isError) {
                    progressModalStatus.textContent = `⚠️ ${message}`;
                    progressModalStatus.style.color = '#ef4444';
                    console.error('🔴 Error:', message);
                } else {
                    progressModalStatus.textContent = message;
                    progressModalStatus.style.color = '#64748b';
                }
                
                console.log(`✅ Status updated: "${message}"`);
            } else {
                console.error('❌ progressModalStatus element not found!');
            }
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function updateConnectionStatus(connected) {
    // Update connection status in the header
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');

    if (connectionDot && connectionText) {
        if (connected) {
            connectionDot.className = 'status-dot connected';
            connectionText.textContent = 'Connected';
        } else {
            connectionDot.className = 'status-dot disconnected';
            connectionText.textContent = 'Disconnected';
        }
    }
}

function showProcessingNotification(message, type = 'info') {
    // Create or update notification
    let notification = document.getElementById('processing-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'processing-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 10px;
            background: #3498db;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            font-size: 12px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: none;
        `;
        document.body.appendChild(notification);
    }

    // Update notification appearance based on type
    const colors = {
        info: '#3498db',
        success: '#2ecc71',
        error: '#e74c3c'
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;

    // Auto-hide after 5 seconds for success/error messages
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Flag to prevent multiple simultaneous auto-loading attempts
let isAutoLoadingInProgress = false;

async function loadNewGeneratedFiles(specificPdfPath = null, specificJsonPath = null) {
    // Prevent multiple simultaneous calls
    if (isAutoLoadingInProgress) {
        console.log('🔄 Auto-loading already in progress, skipping...');
        return Promise.resolve();
    }

    isAutoLoadingInProgress = true;

    try {
        let foundFiles = null;

        // If specific paths are provided, use them directly
        if (specificPdfPath && specificJsonPath) {
            console.log(`📄 Loading specified files: PDF=${specificPdfPath}, JSON=${specificJsonPath}`);
            
            // Ensure paths start with /
            const pdfPath = specificPdfPath.startsWith('/') ? specificPdfPath : '/' + specificPdfPath;
            let jsonPath = specificJsonPath.startsWith('/') ? specificJsonPath : '/' + specificJsonPath;
            
            // If it's a geometry.json, check if marked-boxes.json exists (preferred format)
            if (jsonPath.includes('-geometry.json')) {
                const markedBoxesPath = jsonPath.replace('-geometry.json', '-marked-boxes.json');
                console.log(`🔍 Checking for preferred marked-boxes format: ${markedBoxesPath}`);
                const markedBoxesExists = await checkFileExists(markedBoxesPath);
                if (markedBoxesExists) {
                    console.log(`✅ Found marked-boxes format, using that instead of geometry format`);
                    jsonPath = markedBoxesPath;
                }
            }
            
            // Check if the specified files exist
            const pdfExists = await checkFileExists(pdfPath);
            const jsonExists = await checkFileExists(jsonPath);
            
            console.log(`🔍 Checking specified files: PDF=${pdfPath} (${pdfExists ? '✅' : '❌'}), JSON=${jsonPath} (${jsonExists ? '✅' : '❌'})`);
            
            if (pdfExists && jsonExists) {
                foundFiles = { pdf: pdfPath, json: jsonPath };
            } else {
                throw new Error(`Specified files not found: PDF=${pdfExists ? '✅' : '❌'}, JSON=${jsonExists ? '✅' : '❌'}`);
            }
        } else {
            // Fallback: Check default locations (only when no specific paths provided)
            console.log('🔄 No specific paths provided, checking default locations...');

            const possiblePaths = [
                // Priority 1: Latest generated files with marked-boxes format
                { pdf: '/TeX/document-generated.pdf', json: '/TeX/document-generated-texpos-marked-boxes.json' },
                { pdf: '/ui/document-generated.pdf', json: '/ui/document-generated-texpos-marked-boxes.json' },

                // Priority 2: Standard generated files with geometry format
                { pdf: '/TeX/document-generated.pdf', json: '/TeX/document-generated-geometry.json' },
                { pdf: '/ui/document-generated.pdf', json: '/ui/document-generated-geometry.json' },

                // Priority 3: Basic document files
                { pdf: '/TeX/document.pdf', json: '/TeX/document-texpos-marked-boxes.json' },
                { pdf: '/TeX/document.pdf', json: '/TeX/document-geometry.json' },
                { pdf: '/ui/document.pdf', json: '/ui/document-texpos-marked-boxes.json' },
                { pdf: '/ui/document.pdf', json: '/ui/document-geometry.json' }
            ];

            // Check each possible path combination
            for (const paths of possiblePaths) {
                const pdfExists = await checkFileExists(paths.pdf);
                const jsonExists = await checkFileExists(paths.json);

                console.log(`🔍 Checking: PDF=${paths.pdf} (${pdfExists ? '✅' : '❌'}), JSON=${paths.json} (${jsonExists ? '✅' : '❌'})`);

                if (pdfExists && jsonExists) {
                    foundFiles = paths;
                    console.log(`✅ Found generated files: ${paths.pdf}, ${paths.json}`);
                    break;
                }
            }
        }

        if (foundFiles) {
            console.log('📄 Auto-loading files...');

            // Show loading notification
            showProcessingNotification('📥 Auto-loading generated PDF and coordinates...', 'info');

            try {
                // Load the new JSON data first with retry logic
                let jsonResponse;
                let attempts = 0;
                const maxAttempts = 3;

                while (attempts < maxAttempts) {
                    attempts++;
                    console.log(`📊 Loading JSON attempt ${attempts}/${maxAttempts}: ${foundFiles.json}`);

                    jsonResponse = await fetch(foundFiles.json + `?t=${Date.now()}`);

                    if (jsonResponse.ok) {
                        break;
                    } else if (attempts < maxAttempts) {
                        console.log(`⏳ JSON not ready yet, waiting 1 second...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (jsonResponse && jsonResponse.ok) {
                    const newOverlayData = await jsonResponse.json();

                // Handle different JSON formats
                if (Array.isArray(newOverlayData)) {
                    // Direct marked-boxes format
                    overlayData = newOverlayData;
                    console.log('✅ Loaded marked-boxes format JSON');
                } else if (newOverlayData.pdfGeometryV1 && newOverlayData.pdfGeometryV1.pages) {
                    // Convert geometry format to overlay format
                    console.log('🔄 Converting geometry format to marked-boxes format...');
                    overlayData = [];
                    newOverlayData.pdfGeometryV1.pages.forEach(page => {
                        page.elements.forEach(element => {
                            overlayData.push({
                                id: element.id,
                                page: page.index,
                                x_pt: element.x,
                                y_pt: element.y,
                                w_pt: element.w,
                                h_pt: element.h,
                                x_mm: element.x * 0.352778,
                                y_mm: element.y * 0.352778,
                                w_mm: element.w * 0.352778,
                                h_mm: element.h * 0.352778,
                                x_px: element.x * 1.333333,
                                y_px: element.y * 1.333333,
                                w_px: element.w * 1.333333,
                                h_px: element.h * 1.333333
                            });
                        });
                    });
                    console.log('✅ Converted to marked-boxes format');
                }

                console.log(`✅ Loaded ${overlayData.length} coordinate items from ${foundFiles.json}`);

                // Update JSON status (if element exists in UI)
                const jsonStatus = document.getElementById("jsonStatus");
                if (jsonStatus) {
                    jsonStatus.textContent = `${overlayData.length} items`;
                    jsonStatus.className = "status-value status-loaded";
                }

                // Update the PDF URL and load - add timestamp to force reload
                const pdfUrlWithTimestamp = `${foundFiles.pdf}?t=${Date.now()}`;
                if (pdfUrlInput) {
                    pdfUrlInput.value = foundFiles.pdf;
                }

                // Clear dropdown selections to encourage using generated files
                if (jsonSelect) {
                    jsonSelect.value = "";
                }

                // Load the PDF
                console.log(`📄 Loading PDF: ${foundFiles.pdf}`);
                await loadPdf(pdfUrlWithTimestamp);

                console.log('✅ Auto-loaded generated files successfully!');

                // Show success notification
                setTimeout(() => {
                    showProcessingNotification('✅ Generated PDF and coordinates loaded automatically!', 'success');
                }, 500);

                // Update status indicators
                updateStatus();

                // Re-render current page with new overlays
                if (currentPdf && currentPageNumber) {
                    renderPage(currentPageNumber);
                }

            } else {
                console.warn('⚠️ Failed to load JSON file after all attempts');
                showProcessingNotification('⚠️ Failed to load coordinate data', 'warning');
            }

            } catch (jsonError) {
                console.error('❌ Error loading JSON:', jsonError);
                showProcessingNotification('❌ Error loading coordinate data', 'error');
            }
        } else {
            console.log('⚠️ No newly generated files found');
            showProcessingNotification('⚠️ Generated files not found', 'warning');
        }
    } catch (error) {
        console.error('❌ Failed to load new generated files:', error);
        showProcessingNotification('❌ Failed to load new files', 'error');
    } finally {
        // Always reset the loading flag
        isAutoLoadingInProgress = false;
    }
}

/**
 * Converts absolute filesystem paths to relative web URLs
 * e.g., /Users/che/Code/.../TeX/file.pdf -> /TeX/file.pdf
 */
function convertToRelativeUrl(filePath) {
    if (!filePath) return filePath;
    
    // If it already looks like a relative URL (starts with / and is short), return as-is
    if (filePath.startsWith('/') && !filePath.includes('/Users/') && !filePath.includes('/home/')) {
        return filePath;
    }
    
    // Find common web-accessible directories
    const webDirs = ['TeX', 'ui', 'xml', 'images', 'assets'];
    
    for (const dir of webDirs) {
        const index = filePath.lastIndexOf(`/${dir}/`);
        if (index !== -1) {
            // Extract everything from this directory onwards
            const relativePath = filePath.substring(index);
            console.log(`🔄 Converted ${filePath} -> ${relativePath}`);
            return relativePath;
        }
        
        // Also check for the directory at the end (no trailing slash)
        const dirPattern = new RegExp(`/${dir}/([^/]+)$`);
        if (dirPattern.test(filePath)) {
            const relativePath = filePath.substring(filePath.lastIndexOf(`/${dir}/`));
            console.log(`🔄 Converted ${filePath} -> ${relativePath}`);
            return relativePath;
        }
    }
    
    // If no web directory found, check if it's already relative
    if (!filePath.startsWith('/')) {
        return '/' + filePath;
    }
    
    // As a fallback, try to find the workspace name in the path
    const workspacePattern = /prototype-pdf-object-overlay\/(.+)$/;
    const match = filePath.match(workspacePattern);
    if (match) {
        const relativePath = '/' + match[1];
        console.log(`🔄 Converted ${filePath} -> ${relativePath}`);
        return relativePath;
    }
    
    // If all else fails, return as-is and log a warning
    console.warn(`⚠️ Could not convert path to relative URL: ${filePath}`);
    return filePath;
}

async function checkFileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

function detectOverlayType(elementId) {
    if (elementId.startsWith('fig-') || elementId.includes('figure')) {
        return 'figure';
    } else if (elementId.startsWith('tbl-') || elementId.includes('table')) {
        return 'table';
    } else if (elementId.includes('-p') || elementId.startsWith('sec') || elementId.includes('para')) {
        return 'paragraph';
    }
    return 'unknown';
}

function populateActionDropdown(overlayType) {
    actionSelect.innerHTML = '<option value="">Select an action...</option>';

    const options = dropdownOptions[overlayType];
    if (options && options.length > 0) {
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            actionSelect.appendChild(optionElement);
        });
    } else {
        actionSelect.innerHTML = '<option value="">No actions available</option>';
    }
}

function onOverlayClick(ev) {
    ev.stopPropagation();
    const id = ev.currentTarget.dataset.elemId;
    currentClickedId = id;
    currentOverlayType = detectOverlayType(id);

    // Update selection in the overlay selector list
    selectOverlayFromList(id);

    elemIdSpan.textContent = id;
    elemTypeSpan.textContent = currentOverlayType;

    // Populate dropdown based on overlay type
    populateActionDropdown(currentOverlayType);

    modal.style.display = "flex";
}

cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
  currentClickedId = null;
});

cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    currentClickedId = null;
    currentOverlayType = null;
});

sendBtn.addEventListener("click", async () => {
    const selectedAction = actionSelect.value;
    if (!selectedAction) {
        alert("Please select an action");
        return;
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert("WebSocket connection not available. Please check server connection.");
        return;
    }

    // Send instruction via WebSocket
    const message = {
        type: 'instruction',
        elementId: currentClickedId,
        overlayType: currentOverlayType,
        instruction: selectedAction,
        timestamp: new Date().toISOString()
    };

    console.log('📤 Sending instruction:', message);

    try {
        ws.send(JSON.stringify(message));

        // Close modal
        modal.style.display = "none";
        currentClickedId = null;
        currentOverlayType = null;

        // Show processing notification
        showProcessingNotification(`Sending ${currentOverlayType} instruction...`);

    } catch (error) {
        console.error('❌ Failed to send instruction:', error);
        alert("Failed to send instruction: " + error.message);
    }
});

// Simple Progress Modal Management
function showProgress(title = "Processing...") {
    console.log('🎯 Showing progress modal:', title);
    
    if (progressModal) {
        progressModalTitle.textContent = title;
        progressModalStatus.textContent = "Preparing...";
        progressModalStatus.style.color = '#64748b';
        progressModal.style.display = 'flex';
        
        // Reset all stages to pending
        resetProgressStages();
        
        // Reset progress bar
        if (progressModalBar) {
            progressModalBar.style.width = '0%';
        }
        
        console.log('✅ Progress modal shown');
    } else {
        console.error('❌ Progress modal element not found!');
    }
}

// Reset all progress stages
function resetProgressStages() {
    const stages = ['xml', 'tex', 'pdf', 'json'];
    stages.forEach(stage => {
        const stageElement = document.getElementById(`stage-${stage}`);
        if (stageElement) {
            stageElement.className = 'progress-stage pending';
            const statusIcon = stageElement.querySelector('.stage-status');
            if (statusIcon) {
                statusIcon.textContent = '⏳';
            }
        }
    });
}

// Update progress stage state
function setProgressStage(stageName, state) {
    const stageElement = document.getElementById(`stage-${stageName}`);
    if (!stageElement) {
        console.warn(`⚠️ Stage element not found: stage-${stageName}`);
        return;
    }
    
    // Remove all state classes
    stageElement.classList.remove('pending', 'active', 'completed', 'error');
    
    // Add new state class
    stageElement.classList.add(state);
    
    // Update status icon
    const statusIcon = stageElement.querySelector('.stage-status');
    if (statusIcon) {
        switch(state) {
            case 'active':
                statusIcon.textContent = '⏳';
                break;
            case 'completed':
                statusIcon.textContent = '✅';
                break;
            case 'error':
                statusIcon.textContent = '❌';
                break;
            default:
                statusIcon.textContent = '⏳';
        }
    }
    
    // Update overall progress bar
    updateOverallProgress();
    
    console.log(`📊 Stage ${stageName} set to: ${state}`);
}

// Activate a stage and mark all previous stages as completed
function activateStage(stageName) {
    const stages = ['xml', 'tex', 'pdf', 'json'];
    const currentIndex = stages.indexOf(stageName);
    
    if (currentIndex === -1) {
        console.warn(`⚠️ Unknown stage: ${stageName}`);
        return;
    }
    
    // Mark all previous stages as completed
    for (let i = 0; i < currentIndex; i++) {
        setProgressStage(stages[i], 'completed');
    }
    
    // Mark current stage as active
    setProgressStage(stageName, 'active');
    
    console.log(`🎯 Activated stage: ${stageName} (completed ${currentIndex} previous stages)`);
}

// Mark all stages up to and including the specified stage as completed
function completeStagesUpTo(stageName) {
    const stages = ['xml', 'tex', 'pdf', 'json'];
    const targetIndex = stages.indexOf(stageName);
    
    if (targetIndex === -1) {
        console.warn(`⚠️ Unknown stage: ${stageName}`);
        return;
    }
    
    // Mark all stages up to and including target as completed
    for (let i = 0; i <= targetIndex; i++) {
        setProgressStage(stages[i], 'completed');
    }
    
    console.log(`✅ Completed stages up to: ${stageName}`);
}

// Update overall progress bar based on stage completion
function updateOverallProgress() {
    const stages = ['xml', 'tex', 'pdf', 'json'];
    let completedCount = 0;
    
    stages.forEach(stage => {
        const stageElement = document.getElementById(`stage-${stage}`);
        if (stageElement && stageElement.classList.contains('completed')) {
            completedCount++;
        }
    });
    
    const percentage = (completedCount / stages.length) * 100;
    
    if (progressModalBar) {
        progressModalBar.style.width = `${percentage}%`;
    }
    
    console.log(`📊 Overall progress: ${percentage}%`);
}

// Old progress functions - replaced by stage system
function updateProgressSteps(steps) {
    // No longer used - kept for compatibility
}

function nextProgressStep(message = null) {
    // No longer used - old complex progress system replaced with stage system
    // Kept as stub for backward compatibility
    console.log('📝 nextProgressStep (deprecated):', message);
}

function hideProgress() {
    console.log('🔒 Hiding progress modal');
    
    if (progressModal) {
        progressModal.style.display = 'none';
        console.log('✅ Progress modal hidden');
    }
}

// Test function for progress modal
function testProgressBar() {
    console.log('🧪 Testing progress modal...');
    showProgress('Testing Progress Modal...');

    // Simulate status updates
    let testStep = 0;
    const testInterval = setInterval(() => {
        testStep++;
        if (testStep <= 5) {
            if (progressModalStatus) {
                progressModalStatus.textContent = `Test step ${testStep} of 5...`;
            }
        } else {
            clearInterval(testInterval);
            setTimeout(() => {
                hideProgress();
                showProcessingNotification('✅ Progress modal test completed!', 'success');
            }, 1000);
        }
    }, 1500);
}

// Make test function globally accessible
window.testProgressBar = testProgressBar;

// Test function for auto-loading
function testAutoLoad(pdfPath = null, jsonPath = null) {
    if (pdfPath && jsonPath) {
        console.log(`🧪 Testing auto-load with specific paths: ${pdfPath}, ${jsonPath}`);
        showProcessingNotification('🔄 Testing auto-load with specific paths...', 'info');
        setTimeout(() => {
            loadNewGeneratedFiles(pdfPath, jsonPath);
        }, 1000);
    } else {
        console.log('🧪 Testing auto-load with default locations...');
        showProcessingNotification('🔄 Testing auto-load from default locations...', 'info');
        setTimeout(() => {
            loadNewGeneratedFiles();
        }, 1000);
    }
}

// Make auto-load test globally accessible
window.testAutoLoad = testAutoLoad;

// Status panel toggle functionality
function toggleStatusPanel(panel) {
    panel.classList.toggle('expanded');
}

// Make status panel toggle globally accessible
window.toggleStatusPanel = toggleStatusPanel;

// ===== Overlay Selector Panel Functions =====

let selectedOverlayId = null;
const overlaySelector = document.getElementById('overlaySelector');
const overlayList = document.getElementById('overlayList');
const overlaySelectorCount = document.getElementById('overlaySelectorCount');

function toggleOverlaySelector() {
    overlaySelector.classList.toggle('collapsed');
}

window.toggleOverlaySelector = toggleOverlaySelector;

function populateOverlaySelector() {
    // Get overlays for current page
    const pageItems = overlayData.filter(item => item.page === currentPageNumber);
    
    // Update count
    overlaySelectorCount.textContent = pageItems.length;
    
    // Clear list
    overlayList.innerHTML = '';
    
    // Show/hide selector panel
    if (pageItems.length > 0) {
        overlaySelector.style.display = 'block';
        
        // Sort overlays by ID for better organization
        pageItems.sort((a, b) => a.id.localeCompare(b.id));
        
        // Add each overlay to the list
        pageItems.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'overlay-list-item';
            listItem.dataset.overlayId = item.id;
            
            // Detect overlay type
            const overlayType = detectOverlayType(item.id);
            const typeColors = {
                'figure': '#3498db',
                'table': '#2ecc71',
                'paragraph': '#9b59b6',
                'unknown': '#95a5a6'
            };
            
            // Create item content
            const itemContent = document.createElement('div');
            itemContent.style.flex = '1';
            
            const itemHeader = document.createElement('div');
            itemHeader.style.display = 'flex';
            itemHeader.style.alignItems = 'center';
            itemHeader.style.marginBottom = '4px';
            
            const idSpan = document.createElement('span');
            idSpan.className = 'overlay-item-id';
            idSpan.textContent = item.id;
            
            const typeSpan = document.createElement('span');
            typeSpan.className = 'overlay-item-type';
            typeSpan.textContent = overlayType;
            typeSpan.style.background = typeColors[overlayType] || typeColors.unknown;
            
            itemHeader.appendChild(idSpan);
            itemHeader.appendChild(typeSpan);
            
            const positionSpan = document.createElement('div');
            positionSpan.className = 'overlay-item-position';
            positionSpan.textContent = `(${Math.round(item.x_pt)}, ${Math.round(item.y_pt)}) ${Math.round(item.w_pt)}×${Math.round(item.h_pt)} pt`;
            
            itemContent.appendChild(itemHeader);
            itemContent.appendChild(positionSpan);
            
            listItem.appendChild(itemContent);
            
            // Add click handler
            listItem.addEventListener('click', (e) => {
                e.stopPropagation();
                selectOverlayFromList(item.id);
            });
            
            // Add mouseover handler to highlight overlay
            listItem.addEventListener('mouseenter', () => {
                highlightOverlay(item.id, true);
            });
            
            listItem.addEventListener('mouseleave', () => {
                highlightOverlay(item.id, false);
            });
            
            overlayList.appendChild(listItem);
        });
    } else {
        overlaySelector.style.display = 'none';
        overlayList.innerHTML = '<div class="overlay-list-empty">No overlays on this page</div>';
    }
}

function selectOverlayFromList(overlayId) {
    // Deselect previous
    if (selectedOverlayId) {
        const prevOverlay = document.querySelector(`[data-elem-id="${selectedOverlayId}"]`);
        if (prevOverlay) {
            prevOverlay.classList.remove('selected');
            // Reset inline styles to restore original appearance
            prevOverlay.style.borderColor = '';
            prevOverlay.style.background = '';
            prevOverlay.style.zIndex = '';
        }
        const prevListItem = document.querySelector(`[data-overlay-id="${selectedOverlayId}"]`);
        if (prevListItem) {
            prevListItem.classList.remove('selected');
        }
    }
    
    // Select new
    selectedOverlayId = overlayId;
    
    // Highlight overlay on PDF
    const overlay = document.querySelector(`[data-elem-id="${overlayId}"]`);
    if (overlay) {
        overlay.classList.add('selected');
        // Apply selection highlight
        overlay.style.borderColor = 'rgba(33, 150, 243, 1)'; // Blue for selection
        overlay.style.background = 'rgba(33, 150, 243, 0.3)';
        overlay.style.zIndex = '130';
        // Scroll overlay into view if needed
        overlay.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
    
    // Highlight in list
    const listItem = document.querySelector(`[data-overlay-id="${overlayId}"]`);
    if (listItem) {
        listItem.classList.add('selected');
        // Scroll list item into view
        listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    console.log('📍 Selected overlay:', overlayId);
}

function highlightOverlay(overlayId, highlight) {
    const overlay = document.querySelector(`[data-elem-id="${overlayId}"]`);
    if (overlay) {
        if (highlight) {
            overlay.style.borderColor = 'rgba(255, 193, 7, 1)';
            overlay.style.background = 'rgba(255, 193, 7, 0.2)';
            overlay.style.zIndex = '120';
        } else if (!overlay.classList.contains('selected')) {
            overlay.style.borderColor = '';
            overlay.style.background = '';
            overlay.style.zIndex = '';
        }
    }
}

function cancelProgress() {
    if (progressModalStatus) {
        progressModalStatus.textContent = "Canceling...";
    }

    // You can add WebSocket cancellation logic here if needed
    setTimeout(() => {
        hideProgress();
        showProcessingNotification("❌ Process canceled by user", 'error');
    }, 1000);
}

// Accordion functionality
function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.accordion-toggle');

    // Close other accordions
    const allHeaders = document.querySelectorAll('.section-header');
    allHeaders.forEach(h => {
        if (h !== header) {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        }
    });

    // Toggle current accordion
    header.classList.toggle('active');
    content.classList.toggle('active');
}

// Helper function to toggle accordion sections (removed duplicate DOMContentLoaded listener)

// Global function for toggling overlay selector (called from HTML onclick)
function toggleOverlaySelector() {
  const selector = document.getElementById('overlaySelector');
  if (selector) {
    selector.classList.toggle('collapsed');
  }
}
