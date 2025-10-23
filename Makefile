# Makefile for PDF + JSON Coordinate Generation
#
# Usage:
#   make                    # Build default file
#   make FILE=my-doc.tex    # Build specific file
#   make clean              # Clean build files
#   make test               # Build and start test server

# Default TeX file
FILE ?= MultiColumn-CS-working-marked.tex
BASE_NAME = $(basename $(FILE))

# Directories
TEX_DIR = TeX
UI_DIR = ui

# Build targets
.PHONY: all build clean test help server sync-aux

# Default target
all: build

# Build PDF and JSON
build:
	@echo "Building $(FILE)..."
	@python3 build_pdf_json.py $(FILE)
	@echo "Build complete!"

# Clean build files
clean:
	@echo "Cleaning build files..."
	@rm -f $(TEX_DIR)/*.aux $(TEX_DIR)/*.log $(TEX_DIR)/*.fls $(TEX_DIR)/*.fdb_latexmk $(TEX_DIR)/*.synctex.gz
	@echo "Clean complete!"

# Build and test
test: build
	@echo "Starting test server..."
	@if ! curl -s http://localhost:8000 >/dev/null 2>&1; then \
		echo "Starting development server on port 8000..."; \
		python3 -m http.server 8000 & \
		sleep 2; \
	fi
	@echo "Test server ready at: http://localhost:8000/ui/"

# Start development server
server:
	@echo "Starting development server..."
	@python3 -m http.server 8000

# Sync coordinates from aux file to NDJSON and marked-boxes.json
# This ensures perfect coordinate accuracy from the source of truth
sync-aux:
	@if [ -z "$(AUX)" ]; then \
		echo "Error: AUX variable not set"; \
		echo "Usage: make sync-aux AUX=path/to/file.aux [OUTDIR=output/dir]"; \
		exit 1; \
	fi
	@echo "Syncing coordinates from $(AUX)..."
	@if [ -n "$(OUTDIR)" ]; then \
		node scripts/external/sync_from_aux.js $(AUX) --output-dir $(OUTDIR) --force; \
	else \
		node scripts/external/sync_from_aux.js $(AUX) --force; \
	fi
	@echo "Sync complete!"

# Show help
help:
	@echo "PDF + JSON Coordinate Generator"
	@echo ""
	@echo "Targets:"
	@echo "  all       Build PDF and JSON (default)"
	@echo "  build     Build PDF and JSON"
	@echo "  clean     Clean build files"
	@echo "  test      Build and start test server"
	@echo "  server    Start development server only"
	@echo "  sync-aux  Sync coordinates from aux file (requires AUX=file.aux)"
	@echo "  help      Show this help"
	@echo ""
	@echo "Variables:"
	@echo "  FILE      TeX file to build (default: $(FILE))"
	@echo "  AUX       Aux file to sync from (for sync-aux target)"
	@echo "  OUTDIR    Output directory for synced files (optional)"
	@echo ""
	@echo "Examples:"
	@echo "  make"
	@echo "  make FILE=my-document.tex"
	@echo "  make clean"
	@echo "  make test"
	@echo "  make sync-aux AUX=TeX/document.aux"
	@echo "  make sync-aux AUX=TeX/document.aux OUTDIR=ui"

# Quick targets for common files
marked:
	@make FILE=MultiColumn-CS-working-marked.tex

original:
	@make FILE=MultiColumn-CS-working.tex