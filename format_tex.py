#!/usr/bin/env python3
"""
Format TeX file to be more readable by adding line breaks and proper formatting.
"""

import re
import sys

def format_tex_content(content):
    """Format TeX content with proper line breaks and indentation."""

    # Replace } with }\n to add line breaks after closing braces
    content = content.replace('}', '}\n')

    # Replace \unhandledtag{ with \n\unhandledtag{ to start new commands on new lines
    content = content.replace('\\unhandledtag{', '\n\\unhandledtag{')

    # Clean up multiple newlines
    content = re.sub(r'\n+', '\n', content)

    # Split into lines for indentation
    lines = content.split('\n')
    formatted_lines = []
    indent_level = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Count opening and closing braces to determine indentation
        opening_braces = line.count('{')
        closing_braces = line.count('}')

        # Decrease indent for lines that start with closing braces
        if line.startswith('}'):
            indent_level = max(0, indent_level - 1)

        # Add indentation
        indented_line = '  ' * indent_level + line
        formatted_lines.append(indented_line)

        # Adjust indent level for next line
        indent_level += opening_braces - closing_braces
        indent_level = max(0, indent_level)  # Don't go below 0

    return '\n'.join(formatted_lines)

def main():
    input_file = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-working.tex'
    output_file = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-working-formatted.tex'

    try:
        # Read the input file
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"Read {len(content)} characters from {input_file}")

        # Format the content
        formatted_content = format_tex_content(content)

        # Write the formatted content
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(formatted_content)

        print(f"Formatted content written to {output_file}")
        print(f"Output has {len(formatted_content.split())} lines")

    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0

if __name__ == '__main__':
    sys.exit(main())