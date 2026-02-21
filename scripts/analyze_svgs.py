import os
import re

directory = 'reference/Callouts Codes'
files = sorted([f for f in os.listdir(directory) if f.endswith('.md')], key=lambda x: int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 0)

for filename in files:
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()
        # More robust regex: dot matches newline, handle ' or "
        # We look for d=...
        
        # Try finding d="..." or d='...'
        # We use a pattern that captures the content until the matching quote
        # It handles newlines inside the quotes if any
        
        paths = []
        # Find all occurrences of d= followed by quote
        matches = re.finditer(r'd\s*=\s*(["\'])(.*?)\1', content, re.DOTALL)
        
        for m in matches:
            paths.append(m.group(2))
            
        print(f'{filename}: {len(paths)} paths detected')
        if len(paths) == 0:
            print(f"  NO PATHS FOUND! Content snippet:\n{content[:200]}")
        else:
            # Sort by length descending to find the "main" path usually
            paths.sort(key=len, reverse=True)
            for i, p in enumerate(paths):
                print(f'  Path {i+1} (Length {len(p)}): {p[:50]}...')
