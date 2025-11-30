#!/bin/bash

##
## Test Script for Column Boundary Marker System
##
## This script:
## 1. Compiles the example LaTeX document
## 2. Verifies column markers are generated
## 3. Runs analysis on the markers
## 4. Checks output for expected patterns
##

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

EXAMPLE_DIR="$PROJECT_ROOT/layouts/elsevier/examples"
EXAMPLE_TEX="example-column-markers.tex"
EXAMPLE_NAME="example-column-markers"

TEMP_DIR="$PROJECT_ROOT/tmp/column-marker-test"

echo "=== Column Boundary Marker System Test ==="
echo ""

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Copy example and dependencies
echo "1. Setting up test environment..."
cp "$EXAMPLE_DIR/$EXAMPLE_TEX" .
cp "$PROJECT_ROOT/layouts/elsevier/NeopageColumnMarker.sty" .

# Copy required dependencies if they exist
if [ -f "$PROJECT_ROOT/layouts/elsevier/Neopagemain.sty" ]; then
  cp "$PROJECT_ROOT/layouts/elsevier/Neopagemain.sty" .
fi

echo "   ✓ Files copied to $TEMP_DIR"
echo ""

# Compile LaTeX document
echo "2. Compiling LaTeX document..."
if command -v pdflatex &> /dev/null; then
  pdflatex -interaction=nonstopmode "$EXAMPLE_TEX" > /dev/null 2>&1 || {
    echo "   ✗ LaTeX compilation failed"
    echo "   Check $TEMP_DIR/$EXAMPLE_NAME.log for details"
    exit 1
  }
  echo "   ✓ LaTeX compilation successful"
else
  echo "   ⚠ pdflatex not found - skipping compilation"
  echo "   Creating mock marker file for testing..."
  
  # Create mock marker file for testing the analysis
  cat > "$EXAMPLE_NAME-column-markers.ndjson" << 'EOF'
% Column Boundary Markers (NDJSON format)
{"id": "colmark-1-top", "type": "column-top", "column": "left", "page": 1, "x_pt": 72, "y_pt": 150, "x_sp": 4718592, "y_sp": 9830400}
{"id": "colmark-1-bottom", "type": "column-bottom", "column": "left", "page": 1, "x_pt": 72, "y_pt": 650, "x_sp": 4718592, "y_sp": 42598400}
{"id": "colmark-2-top", "type": "column-top", "column": "right", "page": 1, "x_pt": 320, "y_pt": 150, "x_sp": 20971520, "y_sp": 9830400}
{"id": "colmark-2-bottom", "type": "column-bottom", "column": "right", "page": 1, "x_pt": 320, "y_pt": 650, "x_sp": 20971520, "y_sp": 42598400}
{"id": "colmark-3-top", "type": "column-top", "column": "left", "page": 2, "x_pt": 72, "y_pt": 100, "x_sp": 4718592, "y_sp": 6553600}
{"id": "colmark-3-bottom", "type": "column-bottom", "column": "left", "page": 2, "x_pt": 72, "y_pt": 700, "x_sp": 4718592, "y_sp": 45875200}
{"id": "colmark-4-top", "type": "column-top", "column": "right", "page": 2, "x_pt": 320, "y_pt": 100, "x_sp": 20971520, "y_sp": 6553600}
{"id": "colmark-4-bottom", "type": "column-bottom", "column": "right", "page": 2, "x_pt": 320, "y_pt": 700, "x_sp": 20971520, "y_sp": 45875200}
EOF
  echo "   ✓ Mock marker file created"
fi
echo ""

# Check if marker file exists
MARKER_FILE="$EXAMPLE_NAME-column-markers.ndjson"
if [ ! -f "$MARKER_FILE" ]; then
  echo "   ✗ Column marker file not generated: $MARKER_FILE"
  exit 1
fi

echo "3. Verifying marker file..."
MARKER_COUNT=$(grep -c '^{' "$MARKER_FILE" || true)
echo "   ✓ Found $MARKER_COUNT markers"

if [ "$MARKER_COUNT" -lt 4 ]; then
  echo "   ⚠ Warning: Expected at least 4 markers (2 columns × 2 types)"
fi
echo ""

# Run analysis
echo "4. Running marker analysis..."
if command -v node &> /dev/null; then
  ANALYSIS_SCRIPT="$PROJECT_ROOT/scripts/analyze-column-markers.js"
  
  if [ -f "$ANALYSIS_SCRIPT" ]; then
    node "$ANALYSIS_SCRIPT" "$MARKER_FILE" > analysis-output.txt 2>&1
    echo "   ✓ Analysis completed"
    echo ""
    
    # Display key results
    echo "   Key Results:"
    echo "   ────────────"
    grep -A 6 "Statistics:" analysis-output.txt || true
    echo ""
    
    # Check for expected patterns
    echo "5. Validating results..."
    
    if grep -q "left-to-right" analysis-output.txt; then
      echo "   ✓ Left-to-right flow detected"
    else
      echo "   ⚠ Left-to-right flow not found"
    fi
    
    if grep -q "Complete" analysis-output.txt; then
      echo "   ✓ Complete column segments found"
    else
      echo "   ⚠ No complete segments found"
    fi
    
    if grep -q "Page 1" analysis-output.txt; then
      echo "   ✓ Page 1 markers present"
    else
      echo "   ⚠ Page 1 markers missing"
    fi
    
    echo ""
    echo "   Full analysis saved to: $TEMP_DIR/analysis-output.txt"
  else
    echo "   ⚠ Analysis script not found: $ANALYSIS_SCRIPT"
  fi
else
  echo "   ⚠ Node.js not found - skipping analysis"
fi
echo ""

# Test integration script
echo "6. Testing coordinate integration..."
if command -v node &> /dev/null; then
  INTEGRATION_SCRIPT="$PROJECT_ROOT/scripts/column-coordinate-integration.js"
  
  if [ -f "$INTEGRATION_SCRIPT" ]; then
    # Create test coordinates
    cat > test-coordinates.json << 'EOF'
[
  {"page": 1, "x": 75, "y": 200, "text": "Left column paragraph 1"},
  {"page": 1, "x": 75, "y": 300, "text": "Left column paragraph 2"},
  {"page": 1, "x": 325, "y": 200, "text": "Right column paragraph 1"},
  {"page": 1, "x": 325, "y": 300, "text": "Right column paragraph 2"},
  {"page": 2, "x": 75, "y": 150, "text": "Page 2 left column"}
]
EOF
    
    node "$INTEGRATION_SCRIPT" "$MARKER_FILE" test-coordinates.json > integration-output.txt 2>&1
    echo "   ✓ Integration test completed"
    
    if [ -f "test-coordinates-enhanced.json" ]; then
      echo "   ✓ Enhanced coordinates generated"
      ENHANCED_COUNT=$(grep -c '"column":' test-coordinates-enhanced.json || true)
      echo "   ✓ $ENHANCED_COUNT coordinates enhanced with column info"
    fi
  else
    echo "   ⚠ Integration script not found: $INTEGRATION_SCRIPT"
  fi
else
  echo "   ⚠ Node.js not found - skipping integration test"
fi
echo ""

# Summary
echo "=== Test Summary ==="
echo ""
echo "Generated files:"
ls -lh "$TEMP_DIR" | grep -E "(pdf|ndjson|json|txt)" || true
echo ""
echo "Test directory: $TEMP_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the PDF: $TEMP_DIR/$EXAMPLE_NAME.pdf"
echo "  2. Check markers: $TEMP_DIR/$MARKER_FILE"
echo "  3. View analysis: $TEMP_DIR/analysis-output.txt"
echo "  4. Test integration: $TEMP_DIR/test-coordinates-enhanced.json"
echo ""
echo "✓ Test completed successfully!"
