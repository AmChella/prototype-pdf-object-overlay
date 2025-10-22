#!/usr/bin/env python3
"""
Convert TeX position ndjson file to marked-boxes.json format
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

def parse_ndjson(file_path):
    """Parse ndjson file and return list of position records"""
    records = []
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

def sp_to_pt(sp_value):
    """Convert scaled points to points (1 pt = 65536 sp)"""
    return float(sp_value) / 65536.0

def pt_to_mm(pt_value):
    """Convert points to millimeters (1 pt = 0.352778 mm)"""
    return pt_value * 0.352778

def pt_to_px(pt_value, dpi=72):
    """Convert points to pixels (default 72 DPI, 1 pt = 1 px at 72 DPI)"""
    return pt_value * (dpi / 72.0)

def group_records_by_id(records):
    """Group start/end records by ID and page (to handle figures appearing on multiple pages)"""
    grouped = defaultdict(list)
    seen_records = set()  # Track unique (id, page, role) to avoid duplicates
    
    for record in records:
        # Create a unique key for deduplication (id, page, role)
        dedup_key = (record['id'], record['page'], record['role'])
        
        # Skip if we've already seen this exact record
        if dedup_key in seen_records:
            print(f"Info: Skipping duplicate record for {record['id']} on page {record['page']} (role: {record['role']})")
            continue
        
        seen_records.add(dedup_key)
        
        # Group by both ID and page to handle same figure on different pages
        key = (record['id'], record['page'])
        grouped[key].append(record)
    
    return grouped

def calculate_bounding_box(records):
    """Calculate bounding box from start/end records"""
    if len(records) != 2:
        print(f"Warning: Expected 2 records (start/end), got {len(records)} for ID")
        return None
    
    # Find start and end records
    start_record = None
    end_record = None
    
    for record in records:
        if record['role'].endswith('-start'):
            start_record = record
        elif record['role'].endswith('-end'):
            end_record = record
    
    if not start_record or not end_record:
        print(f"Warning: Missing start or end record")
        return None
    
    # Check for page number consistency and warn about potential issues
    if start_record['page'] != end_record['page']:
        print(f"Warning: {start_record['id']} spans multiple pages ({start_record['page']} to {end_record['page']})")
    
    # Check page source for accuracy warnings
    start_source = start_record.get('page_source', 'unknown')
    end_source = end_record.get('page_source', 'unknown')
    
    if start_source == 'counter' or end_source == 'counter':
        print(f"Info: {start_record['id']} uses page counter (may be inaccurate for floats)")
    elif start_source == 'counter-fallback' or end_source == 'counter-fallback':
        print(f"Warning: {start_record['id']} fell back to page counter - consider running LaTeX again")
    
    # Convert coordinates from sp to pt
    x1_pt = sp_to_pt(start_record['xsp'])
    y1_pt = sp_to_pt(start_record['ysp'])
    x2_pt = sp_to_pt(end_record['xsp'])
    y2_pt = sp_to_pt(end_record['ysp'])
    
    # Calculate bounding box (min/max coordinates)
    x_pt = min(x1_pt, x2_pt)
    y_pt = min(y1_pt, y2_pt)
    w_pt = abs(x2_pt - x1_pt)
    h_pt = abs(y2_pt - y1_pt)
    
    # If width is 0, use a default width based on content type
    if w_pt == 0:
        # For same-column content, use column width
        if start_record['col'] == end_record['col']:
            w_pt = sp_to_pt(start_record['cwsp'])  # column width
        else:
            # For multi-column content, calculate from column positions
            w_pt = x2_pt - x1_pt if x2_pt > x1_pt else sp_to_pt(start_record['twsp'])
    
    # Convert to other units
    x_mm = pt_to_mm(x_pt)
    y_mm = pt_to_mm(y_pt)
    w_mm = pt_to_mm(w_pt)
    h_mm = pt_to_mm(h_pt)
    
    x_px = pt_to_px(x_pt)
    y_px = pt_to_px(y_pt)
    w_px = pt_to_px(w_pt)
    h_px = pt_to_px(h_pt)
    
    return {
        'id': start_record['id'],
        'page': start_record['page'],
        'page_source': start_source,
        'x_pt': round(x_pt, 2),
        'y_pt': round(y_pt, 2),
        'w_pt': round(w_pt, 2),
        'h_pt': round(h_pt, 2),
        'x_mm': round(x_mm, 2),
        'y_mm': round(y_mm, 2),
        'w_mm': round(w_mm, 2),
        'h_mm': round(h_mm, 2),
        'x_px': round(x_px, 2),
        'y_px': round(y_px, 2),
        'w_px': round(w_px, 2),
        'h_px': round(h_px, 2)
    }

def convert_ndjson_to_marked_boxes(input_file, output_file=None):
    """Convert ndjson file to marked-boxes.json format"""
    
    # Parse the ndjson file
    records = parse_ndjson(input_file)
    print(f"Parsed {len(records)} records from {input_file}")
    
    # Analyze page source accuracy
    page_sources = {}
    for record in records:
        source = record.get('page_source', 'unknown')
        page_sources[source] = page_sources.get(source, 0) + 1
    
    print("\nPage number source analysis:")
    for source, count in page_sources.items():
        print(f"  {source}: {count} records")
    
    if 'counter' in page_sources or 'counter-fallback' in page_sources:
        print("\n⚠️  WARNING: Some records use page counter instead of accurate positioning.")
        print("   For floats, this may result in incorrect page numbers.")
        print("   Recommendation: Run LaTeX 2-3 times to stabilize page references.")
    
    # Group records by ID and page
    grouped_records = group_records_by_id(records)
    print(f"\nFound {len(grouped_records)} unique ID-page combinations")
    
    # Convert to marked boxes format
    marked_boxes = []
    
    for (item_id, page_num), item_records in grouped_records.items():
        bbox = calculate_bounding_box(item_records)
        if bbox:
            marked_boxes.append(bbox)
        else:
            print(f"Skipping {item_id} (page {page_num}) due to calculation error")
    
    # Sort by page and then by ID for consistent output
    marked_boxes.sort(key=lambda x: (x['page'], x['id']))
    
    # Determine output file
    if output_file is None:
        input_path = Path(input_file)
        output_file = input_path.parent / f"{input_path.stem}-marked-boxes.json"
    
    # Write the result
    with open(output_file, 'w') as f:
        json.dump(marked_boxes, f, indent=2)
    
    print(f"\nConverted to {output_file}")
    print(f"Generated {len(marked_boxes)} marked boxes")
    
    # Generate summary by page
    page_summary = {}
    for box in marked_boxes:
        page = box['page']
        source = box.get('page_source', 'unknown')
        if page not in page_summary:
            page_summary[page] = {'total': 0, 'sources': {}}
        page_summary[page]['total'] += 1
        page_summary[page]['sources'][source] = page_summary[page]['sources'].get(source, 0) + 1
    
    print(f"\nPage summary:")
    for page in sorted(page_summary.keys()):
        info = page_summary[page]
        print(f"  Page {page}: {info['total']} elements")
        for source, count in info['sources'].items():
            print(f"    {source}: {count}")
    
    return output_file

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_ndjson_to_marked_boxes.py <input.ndjson> [output.json]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(input_file).exists():
        print(f"Error: Input file {input_file} does not exist")
        sys.exit(1)
    
    try:
        result_file = convert_ndjson_to_marked_boxes(input_file, output_file)
        print(f"Success! Converted {input_file} to {result_file}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()