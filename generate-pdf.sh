#!/bin/bash

# Generate PDF from XML using template with automatic HTML entity fixing
# Usage: ./generate-pdf.sh <xml-file> <template-file> <output-name>

set -e  # Exit on any error

# Check arguments
if [ $# -ne 3 ]; then
    echo "Usage: $0 <xml-file> <template-file> <output-name>"
    echo "Example: $0 xml/ENDEND10921.xml template/ENDEND10921-sample-style.tex.xml ENDEND10921"
    exit 1
fi

XML_FILE="$1"
TEMPLATE_FILE="$2"
OUTPUT_NAME="$3"
TEX_FILE="TeX/${OUTPUT_NAME}.tex"
PDF_FILE="TeX/${OUTPUT_NAME}.pdf"

echo "=== PDF Generation Script ==="
echo "XML File: $XML_FILE"
echo "Template: $TEMPLATE_FILE"
echo "Output: $OUTPUT_NAME"
echo "================================"

# Check if input files exist
if [ ! -f "$XML_FILE" ]; then
    echo "Error: XML file '$XML_FILE' not found!"
    exit 1
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file '$TEMPLATE_FILE' not found!"
    exit 1
fi

# Step 1: Generate LaTeX from XML using template
echo "Step 1: Generating LaTeX from XML..."
node src/cli.js "$XML_FILE" "$TEMPLATE_FILE" "$TEX_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to generate LaTeX file!"
    exit 1
fi

echo "✓ LaTeX file generated: $TEX_FILE"

# Step 2: Fix HTML entities
echo "Step 2: Fixing HTML entities..."
node fix-html-entities.js "$TEX_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to fix HTML entities!"
    exit 1
fi

echo "✓ HTML entities fixed"

# Step 3: Fix mathematical expressions
echo "Step 3: Fixing mathematical expressions..."
node fix-math-body-only.js "$TEX_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to fix mathematical expressions!"
    exit 1
fi

echo "✓ Mathematical expressions fixed"

# Step 4: Compile LaTeX to PDF
echo "Step 4: Compiling LaTeX to PDF..."
cd TeX
lualatex "${OUTPUT_NAME}.tex"

if [ $? -ne 0 ]; then
    echo "Error: Failed to compile LaTeX to PDF!"
    exit 1
fi

cd ..

echo "✓ PDF compiled successfully: $PDF_FILE"

# Step 4: Check if PDF was created and show info
if [ -f "$PDF_FILE" ]; then
    PDF_SIZE=$(ls -lh "$PDF_FILE" | awk '{print $5}')
    PDF_PAGES=$(pdfinfo "$PDF_FILE" 2>/dev/null | grep Pages | awk '{print $2}' || echo "unknown")
    echo "================================"
    echo "✓ SUCCESS!"
    echo "PDF File: $PDF_FILE"
    echo "Size: $PDF_SIZE"
    echo "Pages: $PDF_PAGES"
    echo "================================"
else
    echo "Error: PDF file was not created!"
    exit 1
fi
