#!/usr/bin/env python3
import re
import html

# Read the HTML content
with open('/Users/oren/Desktop/Oren_own/docs/homework/柯的note/Linux/_src/raw/F2127_Ch06.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# First, normalize the HTML - remove newlines within tags and normalize whitespace
html_content = re.sub(r'>\s+<', '><', html_content)
html_content = re.sub(r'\s+', ' ', html_content)

# Extract content using regex - find all li and p content
content_lines = []

# Find all page break sections
page_sections = re.split(r'<h1 style="page-break-before:always; ">\s*</h1>', html_content)

for section in page_sections:
    # Find all <li> content
    li_matches = re.findall(r'<li[^>]*>(.*?)</li>', section, re.DOTALL)
    for match in li_matches:
        clean_text = re.sub(r'<[^>]+>', '', match).strip()
        clean_text = html.unescape(clean_text)
        if clean_text:
            content_lines.append(clean_text)
    
    # Find all <p> content  
    p_matches = re.findall(r'<p[^>]*>(.*?)</p>', section, re.DOTALL)
    for match in p_matches:
        clean_text = re.sub(r'<[^>]+>', '', match).strip()
        clean_text = html.unescape(clean_text)
        if clean_text:
            content_lines.append(clean_text)

# Write content.txt
with open('/Users/oren/Desktop/Oren_own/docs/homework/柯的note/Linux/_src/CH06_01_editor/content.txt', 'w', encoding='utf-8') as f:
    for line in content_lines:
        f.write(line + '\n')

print(f"Created content.txt with {len(content_lines)} lines")