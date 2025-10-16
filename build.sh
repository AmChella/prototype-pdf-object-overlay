#!/bin/bash

# PDF + JSON Build Script
# Builds PDF and generates coordinate JSON in one command

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEX_FILE="MultiColumn-CS-working-marked.tex"
CLEAN_FIRST=true
COPY_TO_UI=true

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
}

# Help function
show_help() {
    echo "PDF + JSON Coordinate Generator"
    echo ""
    echo "Usage: $0 [options] [tex_file]"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo "  -n, --no-clean  Don't clean build files first"
    echo "  -k, --keep-only Don't copy files to UI directory"
    echo "  -f, --file      Specify TeX file (default: MultiColumn-CS-working-marked.tex)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Build default file"
    echo "  $0 my-document.tex                    # Build specific file"
    echo "  $0 -n -k my-document.tex             # Build without cleaning or copying"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--no-clean)
            CLEAN_FIRST=false
            shift
            ;;
        -k|--keep-only)
            COPY_TO_UI=false
            shift
            ;;
        -f|--file)
            TEX_FILE="$2"
            shift 2
            ;;
        -*)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            TEX_FILE="$1"
            shift
            ;;
    esac
done

# Check if we're in the right directory
if [[ ! -d "TeX" ]]; then
    print_error "TeX directory not found. Please run from project root."
    exit 1
fi

if [[ ! -f "TeX/$TEX_FILE" ]]; then
    print_error "TeX file not found: TeX/$TEX_FILE"
    exit 1
fi

print_status "Building PDF and JSON coordinates..."
print_status "TeX file: $TEX_FILE"
print_status "Clean first: $CLEAN_FIRST"
print_status "Copy to UI: $COPY_TO_UI"

# Check for required tools
if ! command -v lualatex &> /dev/null; then
    print_error "lualatex not found. Please install TeXLive or MiKTeX."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    print_error "python3 not found. Please install Python 3."
    exit 1
fi

# Build arguments for Python script
PYTHON_ARGS="$TEX_FILE"
if [[ "$COPY_TO_UI" == false ]]; then
    PYTHON_ARGS="$PYTHON_ARGS --no-copy"
fi
if [[ "$CLEAN_FIRST" == false ]]; then
    PYTHON_ARGS="$PYTHON_ARGS --no-clean"
fi

# Run the Python build script
print_status "Starting build process..."
if python3 build_pdf_json.py $PYTHON_ARGS; then
    print_success "Build completed successfully!"
    
    # Show generated files
    BASE_NAME=$(basename "$TEX_FILE" .tex)
    PDF_FILE="TeX/${BASE_NAME}.pdf"
    JSON_FILE="TeX/${BASE_NAME}-boxes.json"
    
    if [[ -f "$PDF_FILE" ]]; then
        PDF_SIZE=$(du -h "$PDF_FILE" | cut -f1)
        print_success "PDF generated: $PDF_FILE ($PDF_SIZE)"
    fi
    
    if [[ -f "$JSON_FILE" ]]; then
        JSON_SIZE=$(du -h "$JSON_FILE" | cut -f1)
        COORD_COUNT=$(python3 -c "import json; print(len(json.load(open('$JSON_FILE'))))" 2>/dev/null || echo "?")
        print_success "JSON generated: $JSON_FILE ($JSON_SIZE, $COORD_COUNT items)"
    fi
    
    if [[ "$COPY_TO_UI" == true ]]; then
        print_success "Files copied to UI directory for testing"
        print_status "You can now test at: http://localhost:8000/ui/"
    fi
    
    # Check if server is running
    if curl -s http://localhost:8000 &> /dev/null; then
        print_success "Development server is running"
        print_status "Open: http://localhost:8000/ui/"
    else
        print_warning "Development server not running"
        print_status "Start with: python3 -m http.server 8000"
    fi
    
else
    print_error "Build failed. Check output above for details."
    exit 1
fi