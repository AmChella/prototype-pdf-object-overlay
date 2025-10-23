#!/bin/bash

# verify_coords.sh - Verify coordinate accuracy between aux and generated files
#
# Usage:
#   ./verify_coords.sh <aux-file> [ndjson-file] [marked-boxes-file]
#
# Examples:
#   ./verify_coords.sh TeX/document.aux
#   ./verify_coords.sh TeX/document.aux TeX/document-texpos.ndjson

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <aux-file> [ndjson-file] [marked-boxes-file]"
    echo ""
    echo "Examples:"
    echo "  $0 TeX/document.aux"
    echo "  $0 TeX/document.aux TeX/document-texpos.ndjson"
    echo "  $0 TeX/document.aux TeX/document-texpos.ndjson TeX/document-marked-boxes.json"
    exit 1
fi

AUX_FILE="$1"
BASE_NAME="${AUX_FILE%.aux}"
NDJSON_FILE="${2:-${BASE_NAME}-texpos.ndjson}"
MARKED_BOXES_FILE="${3:-${BASE_NAME}-marked-boxes.json}"

# Verify files exist
if [ ! -f "$AUX_FILE" ]; then
    echo -e "${RED}Error: AUX file not found: $AUX_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}=== Coordinate Verification ===${NC}"
echo ""
echo "Files to verify:"
echo "  AUX:           $AUX_FILE"
echo "  NDJSON:        $NDJSON_FILE"
echo "  Marked Boxes:  $MARKED_BOXES_FILE"
echo ""

# Count records in aux file
echo -e "${YELLOW}Checking AUX file...${NC}"
AUX_COUNT=$(grep -c '\\zref@newlabel{gm:' "$AUX_FILE" || echo "0")
echo "  Found $AUX_COUNT position records"

# Sample a few coordinates for verification
echo ""
echo -e "${YELLOW}Sample verification (first 3 elements):${NC}"
echo ""

SAMPLE_IDS=$(grep '\\zref@newlabel{gm:' "$AUX_FILE" | head -6 | grep -o 'gm:[^:]*' | sed 's/gm://' | sort -u | head -3)

for id in $SAMPLE_IDS; do
    echo -e "${GREEN}Checking ID: $id${NC}"
    
    # Get coordinates from AUX
    AUX_LINE=$(grep "gm:${id}:" "$AUX_FILE" | head -1)
    if [ -n "$AUX_LINE" ]; then
        AUX_X=$(echo "$AUX_LINE" | grep -o 'posx{[0-9]*}' | grep -o '[0-9]*')
        AUX_Y=$(echo "$AUX_LINE" | grep -o 'posy{[0-9]*}' | grep -o '[0-9]*')
        AUX_PAGE=$(echo "$AUX_LINE" | grep -o 'page{[0-9]*}' | grep -o '[0-9]*')
        
        echo "  AUX:    xsp=$AUX_X, ysp=$AUX_Y, page=$AUX_PAGE"
        
        # Check NDJSON if exists
        if [ -f "$NDJSON_FILE" ]; then
            NDJSON_LINE=$(grep "\"id\":\"${id}\"" "$NDJSON_FILE" | head -1)
            if [ -n "$NDJSON_LINE" ]; then
                NDJSON_X=$(echo "$NDJSON_LINE" | grep -o '"xsp":"[0-9]*"' | grep -o '[0-9]*')
                NDJSON_Y=$(echo "$NDJSON_LINE" | grep -o '"ysp":"[0-9]*"' | grep -o '[0-9]*')
                NDJSON_PAGE=$(echo "$NDJSON_LINE" | grep -o '"page":[0-9]*' | grep -o '[0-9]*')
                
                echo "  NDJSON: xsp=$NDJSON_X, ysp=$NDJSON_Y, page=$NDJSON_PAGE"
                
                # Verify match
                if [ "$AUX_X" = "$NDJSON_X" ] && [ "$AUX_Y" = "$NDJSON_Y" ] && [ "$AUX_PAGE" = "$NDJSON_PAGE" ]; then
                    echo -e "  ${GREEN}✓ MATCH${NC}"
                else
                    echo -e "  ${RED}✗ MISMATCH${NC}"
                fi
            else
                echo -e "  ${YELLOW}⚠ Not found in NDJSON${NC}"
            fi
        fi
        
        # Check marked-boxes if exists
        if [ -f "$MARKED_BOXES_FILE" ]; then
            # Calculate expected PT coordinates
            X_PT=$(echo "scale=2; $AUX_X / 65536" | bc)
            
            MARKED_LINE=$(grep -A 5 "\"id\": \"${id}\"" "$MARKED_BOXES_FILE" | head -6)
            if [ -n "$MARKED_LINE" ]; then
                MARKED_X=$(echo "$MARKED_LINE" | grep '"x_pt"' | grep -o '[0-9.]*' | head -1)
                MARKED_PAGE=$(echo "$MARKED_LINE" | grep '"page"' | grep -o '[0-9]*' | head -1)
                
                echo "  Marked: x_pt=$MARKED_X (expected: $X_PT), page=$MARKED_PAGE"
                
                # Simple comparison (allowing for rounding)
                DIFF=$(echo "$MARKED_X - $X_PT" | bc | sed 's/-//')
                IS_CLOSE=$(echo "$DIFF < 0.1" | bc)
                
                if [ "$IS_CLOSE" = "1" ]; then
                    echo -e "  ${GREEN}✓ Coordinates within tolerance${NC}"
                else
                    echo -e "  ${YELLOW}⚠ Coordinates differ by $DIFF pt${NC}"
                fi
            else
                echo -e "  ${YELLOW}⚠ Not found in marked-boxes${NC}"
            fi
        fi
    fi
    echo ""
done

# Summary
echo -e "${BLUE}=== Summary ===${NC}"

if [ -f "$NDJSON_FILE" ]; then
    NDJSON_COUNT=$(wc -l < "$NDJSON_FILE" | tr -d ' ')
    echo "  NDJSON records: $NDJSON_COUNT"
else
    echo -e "  ${YELLOW}NDJSON file not found${NC}"
fi

if [ -f "$MARKED_BOXES_FILE" ]; then
    MARKED_COUNT=$(grep -c '"id"' "$MARKED_BOXES_FILE" || echo "0")
    echo "  Marked boxes: $MARKED_COUNT"
else
    echo -e "  ${YELLOW}Marked boxes file not found${NC}"
fi

echo ""
echo -e "${GREEN}Verification complete!${NC}"
echo ""
echo "To sync coordinates from aux file:"
echo "  make sync-aux AUX=$AUX_FILE"
echo ""
echo "For detailed verification:"
echo "  See docs/AUX-SYNC-GUIDE.md"

