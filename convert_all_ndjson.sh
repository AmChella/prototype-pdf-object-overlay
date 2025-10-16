#!/bin/bash

# Convert all ndjson files in TeX directory to marked-boxes.json format
# Usage: ./convert_all_ndjson.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEX_DIR="$SCRIPT_DIR/TeX"
UI_DIR="$SCRIPT_DIR/ui"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NDJSON to Marked-Boxes Converter ===${NC}"
echo

# Check if TeX directory exists
if [ ! -d "$TEX_DIR" ]; then
    echo -e "${RED}Error: TeX directory not found: $TEX_DIR${NC}"
    exit 1
fi

# Find all ndjson files
ndjson_files=($(find "$TEX_DIR" -name "*.ndjson" -type f))

if [ ${#ndjson_files[@]} -eq 0 ]; then
    echo -e "${YELLOW}No .ndjson files found in $TEX_DIR${NC}"
    exit 0
fi

echo -e "${BLUE}Found ${#ndjson_files[@]} ndjson file(s):${NC}"
for file in "${ndjson_files[@]}"; do
    echo -e "  ${YELLOW}$(basename "$file")${NC}"
done
echo

# Convert each file
converted_count=0
for ndjson_file in "${ndjson_files[@]}"; do
    filename=$(basename "$ndjson_file")
    basename_without_ext="${filename%.*}"
    
    echo -e "${BLUE}Converting: ${YELLOW}$filename${NC}"
    
    # Run the conversion
    if python3 "$SCRIPT_DIR/convert_ndjson_to_marked_boxes.py" "$ndjson_file"; then
        # Copy to UI directory
        marked_boxes_file="$TEX_DIR/${basename_without_ext}-marked-boxes.json"
        ui_marked_boxes_file="$UI_DIR/${basename_without_ext}-marked-boxes.json"
        
        if [ -f "$marked_boxes_file" ]; then
            cp "$marked_boxes_file" "$ui_marked_boxes_file"
            echo -e "${GREEN}✓ Converted and copied to UI directory${NC}"
            ((converted_count++))
        else
            echo -e "${RED}✗ Conversion failed - output file not found${NC}"
        fi
    else
        echo -e "${RED}✗ Conversion failed${NC}"
    fi
    echo
done

echo -e "${GREEN}=== Conversion Complete ===${NC}"
echo -e "${GREEN}Successfully converted $converted_count file(s)${NC}"

# List generated files
echo
echo -e "${BLUE}Generated files in TeX directory:${NC}"
ls -la "$TEX_DIR"/*-marked-boxes.json 2>/dev/null || echo "  No marked-boxes.json files found"

echo
echo -e "${BLUE}Generated files in UI directory:${NC}"
ls -la "$UI_DIR"/*-marked-boxes.json 2>/dev/null || echo "  No marked-boxes.json files found"