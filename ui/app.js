// app.js - vanilla JS + PDF.js overlay prototype

const pdfjsLib = window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

const viewer = document.getElementById("viewerContainer");
const loadBtn = document.getElementById("loadBtn");
const pdfUrlInput = document.getElementById("pdfUrl");
const pdfFileInput = document.getElementById("pdfFileInput");
const uploadPdfBtn = document.getElementById("uploadPdfBtn");
const loadJsonBtn = document.getElementById("loadJsonBtn");
const jsonSelect = document.getElementById("jsonSelect");
const jsonFileInput = document.getElementById("jsonFileInput");
const uploadJsonBtn = document.getElementById("uploadJsonBtn");
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
const progressOverlay = document.getElementById("progressOverlay");
const progressTitle = document.getElementById("progressTitle");
const progressSteps = document.getElementById("progressSteps");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressCancelBtn = document.getElementById("progressCancelBtn");

let currentPdf = null;
let currentPageNumber = 1;
let currentViewport = null;
let overlayData = []; // coordinate JSON
let pageWrapper = null; // container for current page
let showOutline = false;
let overlaysVisible = true; // track overlay visibility state
let currentPdfObjectUrl = null; // Track object URL for cleanup
let enableWebSocket = true; // Set to true to enable WebSocket connection

// loadBtn.addEventListener("click", () => {
//   const url = pdfUrlInput.value.trim();
//   if (!url) return alert("Enter PDF URL");
//   loadPdf(url);
// });

// PDF File Upload
uploadPdfBtn.addEventListener("click", () => {``
  pdfFileInput.click();
});

pdfFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    alert("Please select a PDF file");
    return;
  }

  console.log("Loading PDF file:", file.name);
  pdfUrlInput.value = `📄 ${file.name}`;

  // Create object URL for the file
  const fileUrl = URL.createObjectURL(file);
  loadPdf(fileUrl);
});

// JSON File Upload
uploadJsonBtn.addEventListener("click", () => {
  jsonFileInput.click();
});

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

debugBtn.addEventListener("click", () => {
  console.log("=== DEBUG INFO ===");
  console.log("Current PDF:", currentPdf);
  console.log("Current page:", currentPageNumber);
  console.log("Current viewport:", currentViewport);
  console.log("Overlay data:", overlayData);
  console.log("Selected unit:", unitSelect.value);
  console.log("Coordinate origin:", coordinateOrigin.value);

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

unitSelect.addEventListener("change", () => {
  console.log("Unit changed to:", unitSelect.value);

  // Update unit indicator
  document.getElementById("currentUnit").textContent = '✅';
  document.getElementById("currentUnit").className = 'status-value status-loaded';

  if (currentPdf && overlayData.length > 0) {
    // Re-render the page with new unit settings
    renderPage(currentPageNumber);
  }
});

coordinateOrigin.addEventListener("change", () => {
  console.log("Coordinate origin changed to:", coordinateOrigin.value);

  if (currentPdf && overlayData.length > 0) {
    // Re-render the page with new coordinate origin
    renderPage(currentPageNumber);
  }
});toggleOutlineBtn.addEventListener("click", () => {
  toggleOutline();
});

toggleOverlaysBtn.addEventListener("click", () => {
  toggleOverlays();
});

// Page Navigation Event Listeners
firstPageBtn.addEventListener("click", () => {
  goToPage(1);
});

prevPageBtn.addEventListener("click", () => {
  if (currentPageNumber > 1) {
    goToPage(currentPageNumber - 1);
  }
});

nextPageBtn.addEventListener("click", () => {
  if (currentPdf && currentPageNumber < currentPdf.numPages) {
    goToPage(currentPageNumber + 1);
  }
});

lastPageBtn.addEventListener("click", () => {
  if (currentPdf) {
    goToPage(currentPdf.numPages);
  }
});

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

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  // Only handle arrow keys when not in an input field
  if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
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
    } else if (e.key === "o" || e.key === "O") {
      e.preventDefault();
      toggleOverlays();
    }
  }
});

// Initialize unit indicator
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("currentUnit").textContent = '✅';
  document.getElementById("currentUnit").className = 'status-value status-loaded';
  updateStatus();
  setupDragAndDrop();

  // Restore overlay visibility state from localStorage
  const savedOverlayState = localStorage.getItem('overlaysVisible');
  if (savedOverlayState !== null) {
    overlaysVisible = savedOverlayState === 'true';
    if (!overlaysVisible) {
      // Apply hidden state without animation
      document.body.classList.add('overlays-hidden');
      toggleOverlaysBtn.textContent = '🙈 Show Overlays';
      toggleOverlaysBtn.classList.add('overlays-hidden');
    }
  }
  updateStatus();
});

async function goToPage(pageNum) {
  if (!currentPdf || pageNum < 1 || pageNum > currentPdf.numPages) {
    return;
  }

  // Clear overlay selection when changing pages
  selectedOverlayId = null;

  currentPageNumber = pageNum;
  await renderPage(currentPageNumber);
  updatePageNavigation();
}

function updatePageNavigation() {
  if (!currentPdf) {
    pageNavigation.style.display = "none";
    return;
  }

  // Show navigation if PDF has more than 1 page
  if (currentPdf.numPages > 1) {
    pageNavigation.style.display = "block";
  } else {
    pageNavigation.style.display = "none";
    return;
  }

  // Update page input and total pages
  pageInput.value = currentPageNumber;
  totalPages.textContent = currentPdf.numPages;

  // Update button states
  firstPageBtn.disabled = currentPageNumber === 1;
  prevPageBtn.disabled = currentPageNumber === 1;
  nextPageBtn.disabled = currentPageNumber === currentPdf.numPages;
  lastPageBtn.disabled = currentPageNumber === currentPdf.numPages;

  // Update button styles based on state
  [firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn].forEach(btn => {
    if (btn.disabled) {
      btn.style.background = "#adb5bd";
      btn.style.cursor = "not-allowed";
    } else {
      btn.style.background = "#6c757d";
      btn.style.cursor = "pointer";
    }
  });

  // Update page info
  const overlayCount = overlayData.filter(item => item.page === currentPageNumber).length;
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.textContent = `Page ${currentPageNumber} of ${currentPdf.numPages} • ${overlayCount} overlay items on this page • Use arrow keys or click buttons to navigate`;
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
  const pdfStatus = document.getElementById("pdfStatus");
  const jsonStatus = document.getElementById("jsonStatus");
  const overlayStatus = document.getElementById("overlayStatus");

  // Update PDF status with icon
  if (currentPdf) {
    pdfStatus.textContent = '✅';
    pdfStatus.className = 'status-value status-loaded';
  } else {
    pdfStatus.textContent = '❌';
    pdfStatus.className = 'status-value status-none';
  }

  // Update JSON status with icon
  if (overlayData.length > 0) {
    jsonStatus.textContent = '✅';
    jsonStatus.className = 'status-value status-loaded';
  } else {
    jsonStatus.textContent = '❌';
    jsonStatus.className = 'status-value status-none';
  }

  // Update overlay status with icon
  if (overlayStatus) {
    if (overlaysVisible) {
      overlayStatus.textContent = '✅';
      overlayStatus.className = 'status-value status-loaded';
    } else {
      overlayStatus.textContent = '❌';
      overlayStatus.className = 'status-value status-disconnected';
    }
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

  // choose a scale (can be dynamic, fit-to-width, etc.)
  const scale = 1.5;
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

  if (showOutline) {
    pageWrapper.classList.add('outlined');
    toggleOutlineBtn.textContent = '📐 Hide Outline';
    toggleOutlineBtn.classList.add('active');

    // Update dimensions in the outline
    if (currentViewport) {
      const dimensions = `${Math.round(currentViewport.width)}×${Math.round(currentViewport.height)}px`;
      pageWrapper.setAttribute('data-dimensions', dimensions);
    }

    // Add coordinate grid
    drawCoordinateGrid();
  } else {
    pageWrapper.classList.remove('outlined');
    toggleOutlineBtn.textContent = '📐 Show Outline';
    toggleOutlineBtn.classList.remove('active');

    // Remove coordinate grid
    const gridCanvas = pageWrapper.querySelector('.coordinate-grid');
    if (gridCanvas) {
      gridCanvas.remove();
    }
  }
}

function toggleOverlays() {
  overlaysVisible = !overlaysVisible;

  if (overlaysVisible) {
    // Show overlays
    document.body.classList.remove('overlays-hidden');
    toggleOverlaysBtn.textContent = '👁️ Hide Overlays';
    toggleOverlaysBtn.classList.remove('overlays-hidden');
    // Show overlay selector panel
    if (overlayData.length > 0) {
      overlaySelector.style.display = 'block';
    }
    console.log('Overlays shown');
  } else {
    // Hide overlays
    document.body.classList.add('overlays-hidden');
    toggleOverlaysBtn.textContent = '🙈 Show Overlays';
    toggleOverlaysBtn.classList.add('overlays-hidden');
    // Hide overlay selector panel
    overlaySelector.style.display = 'none';
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

        case 'processing_started':
            console.log('🚀 Processing started for:', data.overlayType);
            showProgress(`Processing ${data.overlayType} instruction...`, [
                'Compiling LaTeX',
                'Generating PDF',
                'Creating Coordinates',
                'Finalizing',
                'Loading Files'
            ]);

            // Start the first step manually and simulate progress if no server updates
            setTimeout(() => {
                nextProgressStep('Starting compilation...');
            }, 500);

            // Fallback progress simulation if server doesn't send progress updates
            let fallbackSteps = 0;
            const fallbackInterval = setInterval(() => {
                fallbackSteps++;
                if (fallbackSteps < 5 && currentProgressStep < 5) {
                    const messages = [
                        'Compiling LaTeX files...',
                        'Generating PDF document...',
                        'Creating coordinate data...',
                        'Finalizing output...',
                        'Preparing file loading...'
                    ];
                    nextProgressStep(messages[fallbackSteps - 1]);
                } else {
                    clearInterval(fallbackInterval);
                }
            }, 2000); // Advance every 2 seconds as fallback

            // Store interval ID to clear it if we get actual progress updates
            window.progressFallbackInterval = fallbackInterval;
            break;

        case 'processing_progress':
            console.log('📊 Processing progress:', data);
            // Clear fallback interval since we're getting real updates
            if (window.progressFallbackInterval) {
                clearInterval(window.progressFallbackInterval);
                window.progressFallbackInterval = null;
            }

            if (data.step) {
                nextProgressStep(data.message || null);
            } else if (data.message) {
                progressText.textContent = data.message;
            }
            break;

        case 'processing_complete':
            console.log('✅ Processing complete');
            // Clear fallback interval
            if (window.progressFallbackInterval) {
                clearInterval(window.progressFallbackInterval);
                window.progressFallbackInterval = null;
            }

            // Complete the final step
            nextProgressStep('Processing complete!');

            // Add a new step for file loading
            setTimeout(() => {
                nextProgressStep('Loading generated files...');

                // Auto-reload the newly generated files
                setTimeout(() => {
                    console.log('🔄 Starting auto-load of generated files...');
                    loadNewGeneratedFiles().then(() => {
                        // Hide progress only after files are successfully loaded
                        setTimeout(() => {
                            hideProgress();
                            showProcessingNotification(`✅ Files loaded successfully!`, 'success');
                        }, 500);
                    }).catch(() => {
                        // Hide progress even if auto-loading fails
                        setTimeout(() => {
                            hideProgress();
                            showProcessingNotification(`⚠️ Processing complete, but auto-loading failed. Please load files manually.`, 'warning');
                        }, 500);
                    });
                }, 500);
            }, 1000);
            break;

        case 'processing_error':
            hideProgress();
            showProcessingNotification(`❌ Error: ${data.error}`, 'error');
            break;

        case 'file_change':
            console.log(`📁 File ${data.eventType}: ${data.filePath}`);
            if (data.eventType === 'change' && (data.filePath.endsWith('.pdf') || data.filePath.endsWith('.json'))) {
                setTimeout(() => {
                    loadNewGeneratedFiles();
                }, 500);
            }
            break;

        case 'dropdown_options':
            if (data.overlayType) {
                dropdownOptions[data.overlayType] = data.options;
            } else {
                dropdownOptions = data.options;
            }
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function updateConnectionStatus(connected) {
    // Update connection status in the status panel
    const connectionStatus = document.getElementById('connectionStatus');
    const statusValue = connectionStatus?.querySelector('.status-value');

    if (connectionStatus && statusValue) {
        connectionStatus.style.display = 'flex';
        statusValue.textContent = connected ? '✅' : '❌';
        statusValue.className = connected ? 'status-value status-connected' : 'status-value status-disconnected';
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

async function loadNewGeneratedFiles() {
    // Prevent multiple simultaneous calls
    if (isAutoLoadingInProgress) {
        console.log('🔄 Auto-loading already in progress, skipping...');
        return Promise.resolve();
    }

    isAutoLoadingInProgress = true;

    try {
        console.log('🔄 Checking for newly generated files...');

        // Enhanced file detection with more possible locations and formats
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

        let foundFiles = null;

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

        if (foundFiles) {
            console.log('📄 Auto-loading newly generated files...');

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

                // Update JSON status
                document.getElementById("jsonStatus").textContent = `${overlayData.length} items`;
                document.getElementById("jsonStatus").className = "status-value status-loaded";

                // Update the PDF URL and load - add timestamp to force reload
                const pdfUrlWithTimestamp = `${foundFiles.pdf}?t=${Date.now()}`;
                pdfUrlInput.value = foundFiles.pdf;

                // Clear dropdown selections to encourage using generated files
                jsonSelect.value = "";

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

// Progress Bar Management
let currentProgressStep = 0;
let progressCancelRequested = false;

function showProgress(title = "Processing PDF...", steps = null) {
    console.log('🎯 Starting progress bar:', title);
    progressTitle.textContent = title;
    progressText.textContent = "Initializing...";
    currentProgressStep = 0;
    progressCancelRequested = false;

    // Setup steps
    if (steps) {
        updateProgressSteps(steps);
    }

    // Reset progress bar and all steps
    progressBar.className = 'progress-bar indeterminate';
    progressBar.style.width = '0%';

    // Reset all steps
    const stepElements = progressSteps.querySelectorAll('.progress-step');
    stepElements.forEach(step => {
        step.classList.remove('active', 'completed');
    });

    // Show overlay
    progressOverlay.style.display = 'flex';

    console.log('✅ Progress bar shown');
    // Don't start first step automatically - wait for processing_progress messages
}

function updateProgressSteps(steps) {
    const stepElements = progressSteps.querySelectorAll('.progress-step');
    stepElements.forEach((step, index) => {
        const circle = step.querySelector('.progress-step-circle');
        const label = step.querySelector('.progress-step-label');

        if (index < steps.length) {
            circle.textContent = index + 1;
            label.textContent = steps[index];
            step.style.display = 'flex';
        } else {
            step.style.display = 'none';
        }
    });
}

function nextProgressStep(message = null) {
    if (progressCancelRequested) return;

    console.log(`📈 Progress step ${currentProgressStep + 1}, message: ${message}`);

    const stepElements = progressSteps.querySelectorAll('.progress-step');

    // Mark current step as completed (if we're moving from a previous step)
    if (currentProgressStep > 0 && currentProgressStep <= stepElements.length) {
        const prevStep = stepElements[currentProgressStep - 1];
        prevStep.classList.add('completed');
        prevStep.classList.remove('active');
        console.log(`✅ Completed step ${currentProgressStep}`);
    }

    // Move to next step
    currentProgressStep++;

    if (currentProgressStep <= stepElements.length) {
        const currentStep = stepElements[currentProgressStep - 1];
        currentStep.classList.add('active');

        // Update progress bar - more gradual progression
        const progressPercent = ((currentProgressStep - 1) / stepElements.length) * 100;
        progressBar.className = 'progress-bar';
        progressBar.style.width = `${progressPercent}%`;

        // Update text
        if (message) {
            progressText.textContent = message;
        } else if (currentStep) {
            const stepLabel = currentStep.querySelector('.progress-step-label').textContent;
            progressText.textContent = `${stepLabel}...`;
        }

        console.log(`🎯 Active step ${currentProgressStep}: ${progressText.textContent}`);
    } else {
        // All steps completed
        progressBar.style.width = '100%';
        console.log('🎉 All progress steps completed');
    }
}

function hideProgress() {
    // Clear any fallback intervals
    if (window.progressFallbackInterval) {
        clearInterval(window.progressFallbackInterval);
        window.progressFallbackInterval = null;
    }

    progressOverlay.style.display = 'none';
    currentProgressStep = 0;
    progressCancelRequested = false;

    // Reset all steps
    const stepElements = progressSteps.querySelectorAll('.progress-step');
    stepElements.forEach(step => {
        step.classList.remove('active', 'completed');
    });

    console.log('🎯 Progress bar hidden and reset');
}

// Test function for progress bar
function testProgressBar() {
    console.log('🧪 Testing progress bar...');
    showProgress('Testing Progress Bar...', [
        'Test Step 1',
        'Test Step 2',
        'Test Step 3',
        'Test Step 4',
        'Test Step 5'
    ]);

    // Simulate progress steps
    let testStep = 0;
    const testInterval = setInterval(() => {
        testStep++;
        if (testStep <= 5) {
            nextProgressStep(`Testing step ${testStep}...`);
        } else {
            clearInterval(testInterval);
            setTimeout(() => {
                hideProgress();
                showProcessingNotification('✅ Progress bar test completed!', 'success');
            }, 1000);
        }
    }, 1500);
}

// Make test function globally accessible
window.testProgressBar = testProgressBar;

// Test function for auto-loading
function testAutoLoad() {
    console.log('🧪 Testing auto-load...');
    showProcessingNotification('🔄 Testing auto-load functionality...', 'info');

    setTimeout(() => {
        loadNewGeneratedFiles();
    }, 1000);
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
    progressCancelRequested = true;
    progressText.textContent = "Canceling...";

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

// Initialize WebSocket when page loads
document.addEventListener("DOMContentLoaded", () => {
    // Set PDF Standard (bottom-left) as default coordinate origin
    coordinateOrigin.value = 'bottom-left';

    // Enhanced UI initialization
    // Show welcome message encouraging to use generated files
    if (!pdfUrlInput.value.trim()) {
        setTimeout(() => {
            showProcessingNotification('💡 Tip: Generate PDF and coordinates will be auto-loaded!', 'info');
        }, 2000);
    }

    // Ensure PDF Management accordion is open by default
    const pdfSection = document.querySelector('.control-section .section-header');
    if (pdfSection && !pdfSection.classList.contains('active')) {
        pdfSection.classList.add('active');
        pdfSection.nextElementSibling.classList.add('active');
    }

    document.getElementById("currentUnit").textContent = '✅';
    document.getElementById("currentUnit").className = 'status-value status-loaded';
    updateStatus();
    setupDragAndDrop();

    // Restore overlay visibility state from localStorage
    const savedOverlayState = localStorage.getItem('overlaysVisible');
    if (savedOverlayState !== null) {
        overlaysVisible = savedOverlayState === 'true';
        if (!overlaysVisible) {
            // Apply hidden state without animation
            document.body.classList.add('overlays-hidden');
            toggleOverlaysBtn.textContent = '🙈 Show Overlays';
            toggleOverlaysBtn.classList.add('overlays-hidden');
        }
    }
    updateStatus();

    // Initialize WebSocket connection (controlled by enableWebSocket flag)
    if (enableWebSocket) {
        initWebSocket();
    } else {
        console.log('🔌 WebSocket connection disabled (set enableWebSocket = true to enable)');
        // Hide WebSocket status indicator
        document.getElementById('connectionStatus').style.display = 'none';
    }
});
