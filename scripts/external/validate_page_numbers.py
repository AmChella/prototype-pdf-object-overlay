#!/usr/bin/env python3
"""
Page Number Validation Tool

This script helps validate the accuracy of page numbers in the coordinate
emission system by comparing different sources and identifying potential issues.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict, Counter

def analyze_page_sources(ndjson_file):
    """Analyze page number sources from NDJSON file"""
    
    records = []
    page_source_stats = Counter()
    page_distribution = defaultdict(lambda: defaultdict(int))
    
    print(f"📊 Analyzing page sources in {ndjson_file}")
    print("=" * 60)
    
    with open(ndjson_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
                
            try:
                record = json.loads(line)
                records.append(record)
                
                page = record.get('page', 'unknown')
                source = record.get('page_source', 'unknown')
                
                page_source_stats[source] += 1
                page_distribution[page][source] += 1
                
            except json.JSONDecodeError as e:
                print(f"⚠️  Warning: Invalid JSON on line {line_num}: {e}")
    
    print(f"Total records analyzed: {len(records)}")
    print()
    
    # Overall source statistics
    print("📈 Page Source Statistics:")
    total_records = len(records)
    for source, count in page_source_stats.most_common():
        percentage = (count / total_records) * 100
        status = get_source_status(source)
        print(f"  {status} {source:15} {count:4d} ({percentage:5.1f}%)")
    
    print()
    
    # Accuracy assessment
    assess_accuracy(page_source_stats, total_records)
    
    # Page-by-page breakdown
    print("\n📄 Page-by-Page Breakdown:")
    for page in sorted(page_distribution.keys()):
        if page == 'unknown':
            continue
        sources = page_distribution[page]
        total_on_page = sum(sources.values())
        print(f"  Page {page:2d}: {total_on_page:2d} elements")
        
        for source, count in sorted(sources.items()):
            status = get_source_status(source)
            print(f"    {status} {source:15} {count:2d}")
    
    # Identify problematic elements
    identify_issues(records)
    
    return records

def get_source_status(source):
    """Get status emoji for page source"""
    status_map = {
        'label': '✅',      # Most accurate
        'zref': '✅',       # Good accuracy  
        'counter': '⚠️',     # Potentially inaccurate
        'counter-fallback': '❌',  # Likely inaccurate
        'unknown': '❓',     # Unknown accuracy
    }
    return status_map.get(source, '❓')

def assess_accuracy(page_source_stats, total_records):
    """Assess overall page number accuracy"""
    
    accurate_sources = page_source_stats.get('label', 0) + page_source_stats.get('zref', 0)
    inaccurate_sources = page_source_stats.get('counter', 0) + page_source_stats.get('counter-fallback', 0)
    unknown_sources = page_source_stats.get('unknown', 0)
    
    accurate_pct = (accurate_sources / total_records) * 100
    inaccurate_pct = (inaccurate_sources / total_records) * 100
    unknown_pct = (unknown_sources / total_records) * 100
    
    print("🎯 Accuracy Assessment:")
    
    if accurate_pct >= 80:
        print(f"  ✅ GOOD: {accurate_pct:.1f}% accurate sources")
    elif accurate_pct >= 50:
        print(f"  ⚠️  FAIR: {accurate_pct:.1f}% accurate sources")
    else:
        print(f"  ❌ POOR: {accurate_pct:.1f}% accurate sources")
    
    if inaccurate_pct > 20:
        print(f"  ⚠️  HIGH: {inaccurate_pct:.1f}% potentially inaccurate sources")
    elif inaccurate_pct > 0:
        print(f"  ℹ️  SOME: {inaccurate_pct:.1f}% potentially inaccurate sources")
    
    if unknown_pct > 50:
        print(f"  ❓ UNKNOWN: {unknown_pct:.1f}% sources - consider updating TeX macros")
    
    # Recommendations
    print("\n💡 Recommendations:")
    
    if inaccurate_pct > 10:
        print("  • Run LaTeX 2-3 times to stabilize page references")
        print("  • Use \\geommarkfloat{} for floating elements")
    
    if unknown_pct > 20:
        print("  • Update to latest geom-marks.tex for better diagnostics")
        print("  • Regenerate document to get page source information")
    
    if accurate_pct < 70:
        print("  • Consider using zref-savepos package")
        print("  • Add \\label{} commands for critical elements")

def identify_issues(records):
    """Identify specific problematic elements"""
    
    print("\n🔍 Issue Detection:")
    
    # Group by ID to find start/end pairs
    grouped = defaultdict(list)
    for record in records:
        grouped[record['id']].append(record)
    
    issues_found = False
    
    for element_id, element_records in grouped.items():
        if len(element_records) != 2:
            print(f"  ⚠️  {element_id}: {len(element_records)} records (expected 2)")
            issues_found = True
            continue
            
        start_record = None
        end_record = None
        
        for record in element_records:
            if record['role'].endswith('-start'):
                start_record = record
            elif record['role'].endswith('-end'):
                end_record = record
        
        if not start_record or not end_record:
            print(f"  ⚠️  {element_id}: Missing start or end record")
            issues_found = True
            continue
        
        # Check for page mismatches
        if start_record['page'] != end_record['page']:
            print(f"  📄 {element_id}: Spans pages {start_record['page']}-{end_record['page']}")
        
        # Check for problematic sources
        start_source = start_record.get('page_source', 'unknown')
        end_source = end_record.get('page_source', 'unknown')
        
        if start_source in ['counter', 'counter-fallback'] or end_source in ['counter', 'counter-fallback']:
            print(f"  ⚠️  {element_id}: Uses page counter (page {start_record['page']})")
            issues_found = True
    
    if not issues_found:
        print("  ✅ No significant issues detected")

def compare_with_pdf_pages(ndjson_file, expected_pages_file=None):
    """Compare page numbers with expected values (if available)"""
    
    if not expected_pages_file or not Path(expected_pages_file).exists():
        print("\n📋 PDF Comparison: (manual verification needed)")
        print("  Compare figure page numbers in JSON output with actual PDF pages")
        return
    
    print(f"\n📋 Comparing with {expected_pages_file}")
    
    # This would load expected page numbers and compare
    # Implementation depends on format of expected_pages_file
    pass

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_page_numbers.py <texpos.ndjson> [expected_pages.json]")
        print()
        print("This tool analyzes page number accuracy in TeX coordinate output.")
        print()
        print("Examples:")
        print("  python3 validate_page_numbers.py document-texpos.ndjson")
        print("  python3 validate_page_numbers.py document-texpos.ndjson expected.json")
        sys.exit(1)
    
    ndjson_file = sys.argv[1]
    expected_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(ndjson_file).exists():
        print(f"❌ Error: {ndjson_file} not found")
        sys.exit(1)
    
    try:
        records = analyze_page_sources(ndjson_file)
        compare_with_pdf_pages(ndjson_file, expected_file)
        
        print(f"\n✅ Analysis complete for {len(records)} records")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()