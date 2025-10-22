#!/bin/bash

# Robust PDF Generation Script
# This script handles XML corruption, template issues, and LaTeX compilation problems

set -e

# Check if required files exist
if [ $# -ne 3 ]; then
    echo "Usage: $0 <xml_file> <template_file> <output_name>"
    echo "Example: $0 xml/TNQ1580368500270.xml template/ENDEND10921-sample-style.tex.xml working-pdf"
    exit 1
fi

XML_FILE="$1"
TEMPLATE_FILE="$2"
OUTPUT_NAME="$3"
TEX_FILE="TeX/${OUTPUT_NAME}.tex"
PDF_FILE="TeX/${OUTPUT_NAME}.pdf"

echo "=== Robust PDF Generation ==="
echo "XML: $XML_FILE"
echo "Template: $TEMPLATE_FILE"
echo "Output: $OUTPUT_NAME"
echo ""

# Step 1: Fix XML file if needed
echo "Step 1: Checking and fixing XML file..."
if [ ! -f "$XML_FILE" ]; then
    echo "Error: XML file not found: $XML_FILE"
    exit 1
fi

# Create a fixed version of the XML if it has entity issues
FIXED_XML="xml/${OUTPUT_NAME}-fixed.xml"
if grep -q "&equals;" "$XML_FILE" || grep -q "&minus;" "$XML_FILE"; then
    echo "Fixing XML entities..."
    sed 's/&equals;/=/g; s/&minus;/-/g; s/&sigma;/σ/g; s/&epsi;/ε/g; s/&lowast;/*/g; s/&nu;/ν/g; s/&sum;/Σ/g; s/&nbsp;/ /g; s/&times;/×/g; s/&percnt;/%/g; s/&plus;/+/g; s/&sim;/~/g; s/&alpha;/α/g; s/&phiv;/φ/g; s/&ldquo;/"/g; s/&rdquo;/"/g' "$XML_FILE" > "$FIXED_XML"
    XML_FILE="$FIXED_XML"
    echo "Fixed XML saved to: $FIXED_XML"
fi

# Step 2: Generate TeX file
echo "Step 2: Generating TeX file..."
node src/cli.js "$XML_FILE" "$TEMPLATE_FILE" "$TEX_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to generate TeX file!"
    exit 1
fi

echo "TeX file generated: $TEX_FILE"

# Step 3: Fix HTML entities
echo "Step 3: Fixing HTML entities..."
sed -i '' 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\\&/g' "$TEX_FILE"

# Step 4: Fix mathematical expressions and LaTeX issues
echo "Step 4: Fixing mathematical expressions..."
node fix-math-body-only.js "$TEX_FILE"

if [ $? -ne 0 ]; then
    echo "Error: Failed to fix mathematical expressions!"
    exit 1
fi

# Step 5: Additional LaTeX fixes
echo "Step 5: Applying additional LaTeX fixes..."

# Fix image file extensions (convert .tif to .png for LaTeX compatibility)
echo "Step 5a: Fixing image file extensions..."
sed -i '' 's/\.tif}/.png}/g' "$TEX_FILE"

# Fix lonely \item commands (skip this if we have itemize environments)
# These commands would remove \item from proper lists, so we comment them out
# sed -i '' 's/\\item[[:space:]]*\([^\\]\)/\1/g' "$TEX_FILE"
# sed -i '' '/^[[:space:]]*\\item[[:space:]]*$/d' "$TEX_FILE"

# Fix malformed textsuperscript commands more conservatively
sed -i '' 's/\\textsuperscript{\[mathematical expression\]}/[math]/g' "$TEX_FILE"
sed -i '' 's/\\textsuperscript{\[^}]*mathematical[^}]*}/[math]/g' "$TEX_FILE"
sed -i '' 's/\\textsuperscript{\[^}]*\}\}/[math]/g' "$TEX_FILE"
sed -i '' 's/\\textsuperscript{\[^}]*\}\./[math]/g' "$TEX_FILE"

# Remove empty superscripts
sed -i '' 's/\\textsuperscript{\[^}]*\}/[math]/g' "$TEX_FILE"

# Conservative brace fixing - only remove clearly malformed ones
sed -i '' 's/\\textsuperscript{\[^}]*\}\}/[math]/g' "$TEX_FILE"
sed -i '' 's/\\textsuperscript{\[^}]*\}\./[math]/g' "$TEX_FILE"

# Fix bibliography issues (disabled - template now handles this)
# if grep -q "\\bibitem" "$TEX_FILE"; then
#     echo "Fixing bibliography..."
#     # Add bibliography environment if missing
#     if ! grep -q "\\begin{thebibliography}" "$TEX_FILE"; then
#         sed -i '' '/\\bibitem/a\
# \\begin{thebibliography}{99}
# ' "$TEX_FILE"
#         echo "\\end{thebibliography}" >> "$TEX_FILE"
#     fi
# fi

# Step 6: Compile to PDF
echo "Step 6: Compiling to PDF (multiple passes for accurate page numbers)..."
cd TeX

# First pass: Generate initial PDF and write positions
echo "  Pass 1/3: Initial compilation..."
lualatex "${OUTPUT_NAME}.tex"

if [ $? -ne 0 ]; then
    echo "Error: First LaTeX pass failed!"
    exit 1
fi

# Second pass: Read positions from first pass and update references
echo "  Pass 2/3: Updating cross-references..."
lualatex "${OUTPUT_NAME}.tex" > /dev/null

# Third pass: Ensure all positions and page numbers are accurate (especially for floats)
echo "  Pass 3/3: Finalizing positions..."
lualatex "${OUTPUT_NAME}.tex" > /dev/null

# Check if the PDF was created
if [ $? -ne 0 ]; then
    echo "Error: LaTeX compilation failed!"
    echo "Check the log file: TeX/${OUTPUT_NAME}.log"
    exit 1
fi

cd ..

# Step 7: Verify PDF was created
if [ -f "$PDF_FILE" ]; then
    echo ""
    echo "=== SUCCESS ==="
    echo "PDF generated successfully: $PDF_FILE"
    echo "File size: $(ls -lh "$PDF_FILE" | awk '{print $5}')"
    echo ""
    echo "To view the PDF:"
    echo "  open $PDF_FILE"
    echo "  or"
    echo "  lualatex TeX/${OUTPUT_NAME}.tex"
else
    echo "Error: PDF file was not created!"
    exit 1
fi

# Cleanup
if [ -f "$FIXED_XML" ]; then
    rm "$FIXED_XML"
fi

echo "Done!"
