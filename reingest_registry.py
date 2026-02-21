
import os
import re
import json

# Configuration
REFERENCE_DIR = '/Users/apoaaron/.gemini/antigravity/Nano Banana Expanded/reference/Callouts Codes'
OUTPUT_FILE = '/Users/apoaaron/.gemini/antigravity/Nano Banana Expanded/src/modes/comic/data/CalloutRegistry.ts'

# Placeholder path (Standard Oval) for fallbacks
PLACEHOLDER_PATH = "M 50,10 Q 90,10 90,50 Q 90,90 50,90 Q 10,90 10,50 Q 10,10 50,10 Z M 20,80 Q 10,100 0,100 L 30,90"
PLACEHOLDER_VIEWBOX = {"width": 100, "height": 110, "offsetX": 50, "offsetY": 50}

def parse_md_file(filepath):
    """
    Parses a Markdown file to find the SVG path and viewBox.
    Returns a dict with 'path' and 'viewBox' or None if invalid.
    """
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Regex to find <path d="...">
        path_match = re.search(r'<path[^>]*d="([^"]+)"', content)
        if not path_match:
            # Try single quotes
            path_match = re.search(r"<path[^>]*d='([^']+)'", content)
        
        if path_match:
            path_data = path_match.group(1).replace('\n', ' ').strip()
            
            # Try to find viewBox
            viewbox_match = re.search(r'viewBox="([^"]+)"', content)
            if not viewbox_match:
                viewbox_match = re.search(r"viewBox='([^']+)'", content)
            
            viewBox = PLACEHOLDER_VIEWBOX.copy() # Default
            
            if viewbox_match:
                vb_parts = [float(x) for x in viewbox_match.group(1).split()]
                if len(vb_parts) == 4:
                    # viewBox="min-x min-y width height"
                    # We want { width, height, offsetX, offsetY }
                    # Assuming offsetX/Y are essentially the center or origin offset.
                    # For simplicty in this fallback logic, let's map:
                    # width = vb[2], height = vb[3]
                    # offsetX = vb[2] / 2, offsetY = vb[3] / 2 (Center origin assumption)
                    viewBox = {
                        "width": vb_parts[2],
                        "height": vb_parts[3],
                        "offsetX": vb_parts[2] / 2,
                        "offsetY": vb_parts[3] / 2
                    }

            return {
                "path": path_data,
                "viewBox": viewBox
            }
            
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
    
    return None

def generate_registry():
    callouts = {}
    
    files = sorted([f for f in os.listdir(REFERENCE_DIR) if f.startswith('svg') and f.endswith('.md')])
    
    # Sort numerically (svg1, svg2, ... svg10) instead of lexicographically (svg1, svg10...)
    files.sort(key=lambda f: int(re.search(r'\d+', f).group()))

    print(f"Found {len(files)} SVG files.")

    for filename in files:
        svg_id = filename.replace('.md', '')
        filepath = os.path.join(REFERENCE_DIR, filename)
        
        data = parse_md_file(filepath)
        
        if data:
            print(f"✅ Loaded {svg_id}")
            callouts[svg_id] = {
                "id": svg_id,
                "name": f"Imported {svg_id}",
                "path": data['path'],
                "viewBox": data['viewBox']
            }
        else:
            print(f"⚠️ Invalid/Raster {svg_id}, using placeholder.")
            callouts[svg_id] = {
                "id": svg_id,
                "name": f"Imported {svg_id} (Placeholder)",
                "path": PLACEHOLDER_PATH,
                "viewBox": PLACEHOLDER_VIEWBOX
            }

    # Generate TypeScript File Content
    ts_content = """import { CalloutDef } from './CalloutRegistry';

export interface CalloutDef {
    id: string;
    name: string;
    path: string;
    viewBox: { width: number; height: number; offsetX: number; offsetY: number };
}

export const CALLOUTS: Record<string, CalloutDef> = {
"""
    
    for key, val in callouts.items():
        # JSON formatting for safety, but we want it as a JS object literal in TS
        # We manually construct the string to ensure clean indentation and no JSON quotes on keys if possible (totally fine to quote keys though)
        
        # VERY IMPORTANT: use json.dumps for the path string to handle escaping correctly!
        path_json = json.dumps(val['path'])
        
        ts_content += f"    '{key}': {{\n"
        ts_content += f"        id: '{val['id']}',\n"
        ts_content += f"        name: '{val['name']}',\n"
        ts_content += f"        path: {path_json},\n"
        ts_content += f"        viewBox: {{ width: {val['viewBox']['width']}, height: {val['viewBox']['height']}, offsetX: {val['viewBox']['offsetX']}, offsetY: {val['viewBox']['offsetY']} }}\n"
        ts_content += "    },\n"

    ts_content += "};\n"

    with open(OUTPUT_FILE, 'w') as f:
        f.write(ts_content)
    
    print(f"Successfully wrote registry to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_registry()
