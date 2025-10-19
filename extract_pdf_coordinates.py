#!/usr/bin/env python3
"""
Extract element coordinates from PDF using PyMuPDF
"""

try:
    import fitz  # PyMuPDF
except ImportError:
    print("❌ PyMuPDF not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF"])
    import fitz

import json
import sys
from pathlib import Path

def extract_coordinates_from_pdf(pdf_path):
    """Extract text blocks and their coordinates from PDF"""
    
    try:
        doc = fitz.open(pdf_path)
        coordinates = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text blocks with positions
            text_blocks = page.get_text("dict")
            
            page_coordinates = {
                'page': page_num + 1,
                'page_size': {
                    'width': page.rect.width,
                    'height': page.rect.height
                },
                'blocks': []
            }
            
            for block_num, block in enumerate(text_blocks["blocks"]):
                if "lines" in block:  # Text block
                    block_info = {
                        'block_id': block_num,
                        'bbox': list(block["bbox"]),  # [x0, y0, x1, y1]
                        'lines': []
                    }
                    
                    for line_num, line in enumerate(block["lines"]):
                        line_info = {
                            'line_id': line_num,
                            'bbox': list(line["bbox"]),
                            'spans': []
                        }
                        
                        for span_num, span in enumerate(line["spans"]):
                            span_info = {
                                'span_id': span_num,
                                'bbox': list(span["bbox"]),
                                'text': span["text"],
                                'font': span["font"],
                                'size': span["size"],
                                'flags': span["flags"],  # Bold, italic, etc.
                                'color': span["color"]
                            }
                            line_info['spans'].append(span_info)
                        
                        block_info['lines'].append(line_info)
                    
                    page_coordinates['blocks'].append(block_info)
            
            coordinates.append(page_coordinates)
        
        doc.close()
        return coordinates
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None

def save_coordinates_json(coordinates, output_path):
    """Save coordinates to JSON file"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(coordinates, f, indent=2, ensure_ascii=False)
        print(f"✅ Coordinates saved to: {output_path}")
        return True
    except Exception as e:
        print(f"Error saving coordinates: {e}")
        return False

def extract_semantic_elements(coordinates):
    """Extract semantic elements like titles, headings, paragraphs"""
    semantic_elements = []
    
    for page in coordinates:
        page_elements = {
            'page': page['page'],
            'elements': []
        }
        
        for block in page['blocks']:
            for line in block['lines']:
                line_text = ''.join(span['text'] for span in line['spans'])
                
                if line_text.strip():
                    # Classify element type based on font properties
                    element_type = classify_element_type(line['spans'])
                    
                    element = {
                        'type': element_type,
                        'text': line_text.strip(),
                        'bbox': line['bbox'],
                        'font_info': {
                            'font': line['spans'][0]['font'] if line['spans'] else '',
                            'size': line['spans'][0]['size'] if line['spans'] else 0,
                            'flags': line['spans'][0]['flags'] if line['spans'] else 0
                        }
                    }
                    page_elements['elements'].append(element)
        
        semantic_elements.append(page_elements)
    
    return semantic_elements

def classify_element_type(spans):
    """Classify text element type based on font properties"""
    if not spans:
        return 'unknown'
    
    first_span = spans[0]
    font_size = first_span['size']
    flags = first_span['flags']
    
    # Font flags: 2^4 = bold, 2^1 = italic, etc.
    is_bold = flags & 2**4
    is_italic = flags & 2**1
    
    # Classify based on size and formatting
    if font_size > 16:
        return 'title'
    elif font_size > 12 and is_bold:
        return 'section_header'
    elif font_size > 10 and is_bold:
        return 'subsection_header'
    elif font_size < 9:
        return 'footnote'
    elif is_italic:
        return 'emphasis'
    else:
        return 'paragraph'

def main():
    pdf_path = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-simple.pdf'
    coords_output = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-simple-coordinates.json'
    semantic_output = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-simple-semantic.json'
    
    if not Path(pdf_path).exists():
        print(f"❌ PDF file not found: {pdf_path}")
        sys.exit(1)
    
    print(f"📄 Extracting coordinates from: {pdf_path}")
    
    # Extract coordinates
    coordinates = extract_coordinates_from_pdf(pdf_path)
    if not coordinates:
        print("❌ Failed to extract coordinates")
        sys.exit(1)
    
    # Save detailed coordinates
    if save_coordinates_json(coordinates, coords_output):
        print(f"📍 Detailed coordinates: {coords_output}")
    
    # Extract and save semantic elements
    semantic_elements = extract_semantic_elements(coordinates)
    if save_coordinates_json(semantic_elements, semantic_output):
        print(f"🎯 Semantic elements: {semantic_output}")
    
    # Print summary
    total_blocks = sum(len(page['blocks']) for page in coordinates)
    total_elements = sum(len(page['elements']) for page in semantic_elements)
    
    print(f"\n📊 Summary:")
    print(f"   Pages: {len(coordinates)}")
    print(f"   Text blocks: {total_blocks}")
    print(f"   Semantic elements: {total_elements}")
    
    print("\n🎉 PDF coordinate extraction completed!")

if __name__ == '__main__':
    main()