#!/usr/bin/env python3
"""
PDF + JSON Coordinate Generator Script

This script:
1. Compiles LaTeX to PDF with coordinate tracking
2. Generates JSON coordinate file
3. Creates visual markers on PDF for verification
4. Handles the complete build process
5. Provides build status and error handling

Usage: python3 build_pdf_json.py [options]
"""

import os
import sys
import subprocess
import json
import argparse
import shutil
from pathlib import Path
from datetime import datetime

class PDFJSONBuilder:
    def __init__(self, tex_dir="TeX", output_dir=None):
        self.tex_dir = Path(tex_dir)
        self.output_dir = Path(output_dir) if output_dir else self.tex_dir
        self.build_log = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.build_log.append(log_entry)
        print(log_entry)

    def run_command(self, cmd, cwd=None):
        """Run a shell command and capture output"""
        self.log(f"Running: {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.tex_dir,
                capture_output=True,
                text=True,
                check=True
            )
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            return True, result.stdout, result.stderr
        except subprocess.CalledProcessError as e:
            self.log(f"Error running command: {e}", "ERROR")
            self.log(f"Stderr: {e.stderr}", "ERROR")
            return False, e.stdout, e.stderr

    def check_dependencies(self):
        """Check if required tools are available"""
        self.log("Checking dependencies...")

        # Check for lualatex
        success, _, _ = self.run_command(["which", "lualatex"])
        if not success:
            self.log("lualatex not found. Please install TeXLive or MiKTeX", "ERROR")
            return False

        # Check for required files
        if not (self.tex_dir / "test.jpeg").exists():
            self.log("test.jpeg not found in TeX directory", "WARNING")

        return True

    def clean_build_files(self, tex_name):
        """Clean auxiliary build files"""
        self.log("Cleaning build files...")
        extensions = [".aux", ".log", ".fls", ".fdb_latexmk", ".synctex.gz"]
        for ext in extensions:
            file_path = self.tex_dir / f"{tex_name}{ext}"
            if file_path.exists():
                file_path.unlink()
                self.log(f"Removed {file_path.name}")

    def build_pdf(self, tex_file, clean_first=True):
        """Build PDF from LaTeX file"""
        tex_path = Path(tex_file)
        tex_name = tex_path.stem

        if clean_first:
            self.clean_build_files(tex_name)

        self.log(f"Building PDF from {tex_file}...")

        # Run lualatex twice (for proper cross-references)
        for run_num in [1, 2]:
            self.log(f"LaTeX run {run_num}/2")
            success, stdout, stderr = self.run_command([
                "lualatex",
                "-interaction=nonstopmode",
                "-file-line-error",
                tex_file
            ])

            if not success:
                self.log(f"LaTeX compilation failed on run {run_num}", "ERROR")
                return False

        # Check if PDF was created
        pdf_path = self.tex_dir / f"{tex_name}.pdf"
        if pdf_path.exists():
            self.log(f"PDF created successfully: {pdf_path}")
            return True
        else:
            self.log("PDF was not created", "ERROR")
            return False

    def validate_json(self, json_file):
        """Validate and enhance the generated JSON file"""
        json_path = self.tex_dir / json_file

        if not json_path.exists():
            self.log(f"JSON file not found: {json_file}", "ERROR")
            return False

        try:
            with open(json_path, 'r') as f:
                data = json.load(f)

            self.log(f"JSON loaded successfully with {len(data)} items")

            # Validate each item
            for i, item in enumerate(data):
                required_fields = ["id", "page", "x_pt", "y_pt", "w_pt", "h_pt"]
                for field in required_fields:
                    if field not in item:
                        self.log(f"Item {i} missing required field: {field}", "WARNING")

                # Check coordinate sanity
                if item.get("w_pt", 0) <= 0 or item.get("h_pt", 0) <= 0:
                    self.log(f"Item {item.get('id', i)} has invalid dimensions", "WARNING")

            return True

        except json.JSONDecodeError as e:
            self.log(f"Invalid JSON in {json_file}: {e}", "ERROR")
            return False

    def create_build_report(self, tex_name):
        """Create a build report with statistics"""
        report = {
            "build_time": datetime.now().isoformat(),
            "tex_file": f"{tex_name}.tex",
            "pdf_file": f"{tex_name}.pdf",
            "json_file": f"{tex_name}-boxes.json",
            "build_log": self.build_log
        }

        # Add file sizes and stats
        pdf_path = self.tex_dir / f"{tex_name}.pdf"
        json_path = self.tex_dir / f"{tex_name}-boxes.json"

        if pdf_path.exists():
            report["pdf_size_bytes"] = pdf_path.stat().st_size

        if json_path.exists():
            report["json_size_bytes"] = json_path.stat().st_size
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                report["coordinate_count"] = len(data)
                report["coordinate_items"] = [item["id"] for item in data]
            except:
                pass

        # Save report
        report_path = self.tex_dir / f"{tex_name}-build-report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

        self.log(f"Build report saved: {report_path}")
        return report

    def copy_to_ui(self, tex_name):
        """Copy generated files to UI directory for testing"""
        ui_dir = self.tex_dir.parent / "ui"
        if not ui_dir.exists():
            self.log("UI directory not found, skipping copy", "WARNING")
            return False

        # Copy PDF
        pdf_src = self.tex_dir / f"{tex_name}.pdf"
        pdf_dst = ui_dir / f"{tex_name}.pdf"
        if pdf_src.exists():
            shutil.copy2(pdf_src, pdf_dst)
            self.log(f"Copied PDF to UI: {pdf_dst}")

        # Copy JSON
        json_src = self.tex_dir / f"{tex_name}-boxes.json"
        json_dst = ui_dir / f"{tex_name}-boxes.json"
        if json_src.exists():
            shutil.copy2(json_src, json_dst)
            self.log(f"Copied JSON to UI: {json_dst}")

        return True

    def build_all(self, tex_file, copy_to_ui=True, clean_first=True):
        """Complete build process"""
        self.log("=== Starting PDF + JSON Build Process ===")

        if not self.check_dependencies():
            return False

        tex_name = Path(tex_file).stem

        # Build PDF
        if not self.build_pdf(tex_file, clean_first):
            return False

        # Validate JSON
        json_file = f"{tex_name}-boxes.json"
        if not self.validate_json(json_file):
            return False

        # Copy to UI if requested
        if copy_to_ui:
            self.copy_to_ui(tex_name)

        # Create build report
        report = self.create_build_report(tex_name)

        self.log("=== Build Process Complete ===")
        self.log(f"PDF: {tex_name}.pdf")
        self.log(f"JSON: {json_file}")
        self.log(f"Coordinates: {report.get('coordinate_count', 'Unknown')} items")

        return True

def main():
    parser = argparse.ArgumentParser(description="Build PDF and JSON coordinates")
    parser.add_argument("tex_file", nargs="?", default="MultiColumn-CS-working-marked.tex",
                       help="LaTeX file to build (default: MultiColumn-CS-working-marked.tex)")
    parser.add_argument("--no-copy", action="store_true",
                       help="Don't copy files to UI directory")
    parser.add_argument("--no-clean", action="store_true",
                       help="Don't clean build files first")
    parser.add_argument("--tex-dir", default="TeX",
                       help="Directory containing TeX files (default: TeX)")

    args = parser.parse_args()

    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    builder = PDFJSONBuilder(args.tex_dir)

    success = builder.build_all(
        args.tex_file,
        copy_to_ui=not args.no_copy,
        clean_first=not args.no_clean
    )

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()