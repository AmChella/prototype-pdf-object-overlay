#!/usr/bin/env python3
"""
Fix TeX compilation issues in the generated file
"""

import re

def fix_tex_content(content):
    """Fix common TeX compilation issues"""
    
    # Fix Unicode characters
    fixes = [
        ('−', '-'),  # Unicode minus to ASCII minus
        ('α', r'$\alpha$'),  # Greek alpha
        ('β', r'$\beta$'),   # Greek beta
        ('κ', r'$\kappa$'),  # Greek kappa
        ('χ', r'$\chi$'),    # Greek chi
        ('×', r'$\times$'),  # Multiplication sign
    ]
    
    for unicode_char, latex_replacement in fixes:
        content = content.replace(unicode_char, latex_replacement)
    
    # Fix HTML entities
    html_fixes = [
        ('&lt;', '<'),
        ('&gt;', '>'),
        ('&amp;', '\\&'),
    ]
    
    for html_entity, latex_replacement in html_fixes:
        content = content.replace(html_entity, latex_replacement)
    
    # Fix unhandled tags - convert to simple text references
    content = re.sub(r'\\unhandledtag\{xref\}\{([^}]+)\}', r'(\1)', content)
    content = re.sub(r'\\unhandledtag\{[^}]*\}\{([^}]*)\}', r'\1', content)
    
    # Fix the @twocolumnfalse structure
    content = content.replace(
        r'\twocolumn[' + '\n' + r'    \begin{@twocolumnfalse}',
        r'\twocolumn[' + '\n' + r'    \begin{minipage}{\textwidth}'
    )
    content = content.replace(
        r'\end{@twocolumnfalse}' + '\n' + r'  ]',
        r'\end{minipage}' + '\n' + r'  ]'
    )
    
    # Fix empty citations
    content = re.sub(r'\\textsuperscript\{\\cite\{\}\}', '', content)
    content = re.sub(r'\\cite\{\}', '', content)
    
    return content

def main():
    input_file = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-sample-style.tex'
    output_file = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-sample-style-fixed.tex'
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("Applying fixes...")
    fixed_content = fix_tex_content(content)
    
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print("✅ TeX fixes applied successfully!")

if __name__ == '__main__':
    main()