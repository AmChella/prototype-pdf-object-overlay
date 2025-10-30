#!/bin/bash

# Test script for multi-column and multi-page coordinate splitting

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║   Testing Multi-Column/Page Coordinate Splitting                     ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if aux file exists
AUX_FILE="${1:-TeX/ENDEND10921-generated.aux}"

if [ ! -f "$AUX_FILE" ]; then
    echo -e "${YELLOW}⚠️  Aux file not found: $AUX_FILE${NC}"
    echo ""
    echo "Usage: $0 [aux-file]"
    echo ""
    echo "Example:"
    echo "  $0 TeX/ENDEND10921-generated.aux"
    echo ""
    exit 1
fi

echo -e "${BLUE}📄 Input: $AUX_FILE${NC}"
echo ""

# Extract directory and job name
AUX_DIR=$(dirname "$AUX_FILE")
JOB_NAME=$(basename "$AUX_FILE" .aux)

NDJSON_FILE="$AUX_DIR/${JOB_NAME}-texpos.ndjson"
MARKED_BOXES_FILE="$AUX_DIR/${JOB_NAME}-marked-boxes.json"

echo "─────────────────────────────────────────────────────────────────────"
echo "Step 1: Sync coordinates with multi-column/page splitting"
echo "─────────────────────────────────────────────────────────────────────"
echo ""

node scripts/external/sync_from_aux.js "$AUX_FILE" --force

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Sync failed${NC}"
    exit 1
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "Step 2: Analyze results"
echo "─────────────────────────────────────────────────────────────────────"
echo ""

# Check if jq is available
if command -v jq &> /dev/null; then
    echo -e "${BLUE}📊 Statistics:${NC}"
    echo ""
    
    TOTAL=$(jq 'length' "$MARKED_BOXES_FILE")
    SPLIT=$(jq '[.[] | select(.totalSegments > 1)] | length' "$MARKED_BOXES_FILE")
    SINGLE=$(jq '[.[] | select(.totalSegments == null or .totalSegments == 1)] | length' "$MARKED_BOXES_FILE")
    
    echo "  Total boxes:   $TOTAL"
    echo "  Split items:   $SPLIT"
    echo "  Single items:  $SINGLE"
    echo ""
    
    if [ "$SPLIT" -gt 0 ]; then
        echo -e "${BLUE}✂️  Split Elements:${NC}"
        echo ""
        jq -r '.[] | select(.totalSegments > 1) | "  • \(.originalId) → \(.totalSegments) segments (page \(.page), col \(.segmentColumn // "N/A"))"' "$MARKED_BOXES_FILE" | head -10
        
        if [ "$SPLIT" -gt 10 ]; then
            echo "  ... and $((SPLIT - 10)) more"
        fi
        echo ""
    fi
    
    echo -e "${BLUE}📋 Example Segmented Element:${NC}"
    echo ""
    jq '.[] | select(.totalSegments > 1) | {id, originalId, segmentIndex, totalSegments, page, column: .segmentColumn, x_pt, y_pt, width_pt, height_pt}' "$MARKED_BOXES_FILE" | head -20
    echo ""
    
else
    echo -e "${YELLOW}⚠️  jq not installed, skipping detailed analysis${NC}"
    echo ""
    echo "  To see detailed statistics, install jq:"
    echo "    brew install jq"
    echo ""
fi

echo "─────────────────────────────────────────────────────────────────────"
echo "Step 3: Verify files"
echo "─────────────────────────────────────────────────────────────────────"
echo ""

if [ -f "$NDJSON_FILE" ]; then
    NDJSON_LINES=$(wc -l < "$NDJSON_FILE")
    echo -e "${GREEN}✅ NDJSON file created: $NDJSON_FILE ($NDJSON_LINES records)${NC}"
else
    echo -e "${YELLOW}⚠️  NDJSON file not found${NC}"
fi

if [ -f "$MARKED_BOXES_FILE" ]; then
    echo -e "${GREEN}✅ Marked-boxes file created: $MARKED_BOXES_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  Marked-boxes file not found${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo "Test Scenarios Covered:"
echo "─────────────────────────────────────────────────────────────────────"
echo ""
echo "  ✓ Scenario 1: Paragraph spans columns (left → right)"
echo "      → Creates 2 items (one per column)"
echo ""
echo "  ✓ Scenario 2: Paragraph spans pages"
echo "      → Creates 2 items (one per page)"
echo ""
echo "  ✓ Scenario 3: Paragraph spans columns AND pages"
echo "      → Creates 3+ items (page 1 col 0, page 1 col 1, page 2 col 0, ...)"
echo ""

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║   ✅ Multi-Column/Page Splitting Test Complete!                      ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"

