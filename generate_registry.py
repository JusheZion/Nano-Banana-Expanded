import os
import re
import xml.etree.ElementTree as ET

# Configuration
SVG_DIR = "reference/Callouts Codes"
OUTPUT_FILE = "src/modes/comic/data/CalloutRegistry.ts"

# Existing manual entries (Copied from current file to preserve them)
EXISTING_ENTRIES = """    // --- OVALS (Standard Speech) ---
    // Professional Smooth Bezier
    'speech_oval_bl': {
        id: 'speech_oval_bl', name: 'Oval (Tail BL)',
        path: "M 50,10 Q 90,10 90,50 Q 90,90 50,90 Q 10,90 10,50 Q 10,10 50,10 Z M 20,80 Q 10,100 0,100 L 30,90",
        viewBox: { width: 100, height: 110, offsetX: 50, offsetY: 50 }
    },
    'speech_oval_br': {
        id: 'speech_oval_br', name: 'Oval (Tail BR)',
        path: "M 50,10 Q 90,10 90,50 Q 90,90 50,90 Q 10,90 10,50 Q 10,10 50,10 Z M 80,80 Q 90,100 100,100 L 70,90",
        viewBox: { width: 100, height: 110, offsetX: 50, offsetY: 50 }
    },
    'speech_oval_tl': {
        id: 'speech_oval_tl', name: 'Oval (Tail TL)',
        path: "M 50,90 Q 90,90 90,50 Q 90,10 50,10 Q 10,10 10,50 Q 10,90 50,90 Z M 20,20 Q 10,0 0,0 L 30,10",
        viewBox: { width: 100, height: 110, offsetX: 50, offsetY: 50 }
    },
    'speech_oval_tr': {
        id: 'speech_oval_tr', name: 'Oval (Tail TR)',
        path: "M 50,90 Q 90,90 90,50 Q 90,10 50,10 Q 10,10 10,50 Q 10,90 50,90 Z M 80,20 Q 90,0 100,0 L 70,10",
        viewBox: { width: 100, height: 110, offsetX: 50, offsetY: 50 }
    },

    // --- BOXES (Robotic / Stern) ---
    'speech_box_bl': {
        id: 'speech_box_bl', name: 'Box (Tail BL)',
        path: "M 10,10 L 130,10 L 130,90 L 40,90 L 10,120 L 20,90 L 10,90 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 65 }
    },
    'speech_box_br': {
        id: 'speech_box_br', name: 'Box (Tail BR)',
        path: "M 10,10 L 130,10 L 130,90 L 120,90 L 130,120 L 100,90 L 10,90 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 65 }
    },
    'speech_box_tl': {
        id: 'speech_box_tl', name: 'Box (Tail TL)',
        path: "M 10,100 L 130,100 L 130,20 L 40,20 L 10,-10 L 20,20 L 10,20 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 45 }
    },
    'speech_box_tr': {
        id: 'speech_box_tr', name: 'Box (Tail TR)',
        path: "M 10,100 L 130,100 L 130,20 L 120,20 L 130,-10 L 100,20 L 10,20 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 45 }
    },

    // --- CLOUDS (Thought) ---
    // Professional Rolling Arcs
    'thought_cloud_bl': { id: 'thought_cloud_bl', name: 'Cloud (Left)', path: "M 30,50 Q 10,50 10,30 Q 10,10 30,10 Q 50,0 70,10 Q 90,0 110,10 Q 130,10 130,30 Q 130,50 110,50 Q 90,60 70,50 Q 50,60 30,50 Z M 20,70 Q 15,65 20,60 M 10,85 Q 5,80 10,75", viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 } },
    'thought_cloud_br': { id: 'thought_cloud_br', name: 'Cloud (Right)', path: "M 30,50 Q 10,50 10,30 Q 10,10 30,10 Q 50,0 70,10 Q 90,0 110,10 Q 130,10 130,30 Q 130,50 110,50 Q 90,60 70,50 Q 50,60 30,50 Z M 120,70 Q 125,65 120,60 M 130,85 Q 135,80 130,75", viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 } }, // Mirrored tail logic roughly
    'thought_cloud_double': { id: 'thought_cloud_double', name: 'Double Cloud', path: "M 30,50 Q 10,50 10,30 Q 10,10 30,10 Q 50,0 70,10 Q 90,0 110,10 Q 130,10 130,30 Q 130,50 110,50 Q 90,60 70,50 Q 50,60 30,50 Z M 140,50 Q 160,50 160,30 Q 160,10 140,10 Q 120,10 100,30 Z", viewBox: { width: 170, height: 100, offsetX: 85, offsetY: 50 } },
    'thought_cloud_tl': { id: 'thought_cloud_tl', name: 'Cloud (Tail TL)', path: "M 30,50 Q 10,50 10,30 Q 10,10 30,10 Q 50,0 70,10 Q 90,0 110,10 Q 130,10 130,30 Q 130,50 110,50 Q 90,60 70,50 Q 50,60 30,50 Z M 20,40 Q 15,35 20,30 M 10,25 Q 5,20 10,15", viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 } },
    'thought_cloud_tr': { id: 'thought_cloud_tr', name: 'Cloud (Tail TR)', path: "M 30,50 Q 10,50 10,30 Q 10,10 30,10 Q 50,0 70,10 Q 90,0 110,10 Q 130,10 130,30 Q 130,50 110,50 Q 90,60 70,50 Q 50,60 30,50 Z M 120,40 Q 125,35 120,30 M 130,25 Q 135,20 130,15", viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 } },

    // --- BURSTS (Shout) ---
    'shout_burst_bl': { id: 'shout_burst_bl', name: 'Burst (Left)', path: "M 20,50 L 0,30 L 30,20 L 20,0 L 50,15 L 70,0 L 80,20 L 110,10 L 100,40 L 130,50 L 100,70 L 120,100 L 80,90 L 60,120 L 40,90 L 10,110 L 20,70 Z", viewBox: { width: 130, height: 120, offsetX: 65, offsetY: 60 } },
    'shout_burst_br': { id: 'shout_burst_br', name: 'Burst (Right)', path: "M 120,50 L 140,30 L 110,20 L 120,0 L 90,15 L 70,0 L 60,20 L 30,10 L 40,40 L 10,50 L 40,70 L 20,100 L 60,90 L 80,120 L 100,90 L 130,110 L 120,70 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } },
    'shout_burst_tl': { id: 'shout_burst_tl', name: 'Burst (Tail TL)', path: "M 20,60 L 0,40 L 30,30 L 20,10 L 50,25 L 70,10 L 80,30 L 110,20 L 100,50 L 130,60 L 100,80 L 120,110 L 80,100 L 60,130 L 40,100 L 10,120 L 20,80 Z", viewBox: { width: 130, height: 120, offsetX: 65, offsetY: 60 } },
    'shout_burst_tr': { id: 'shout_burst_tr', name: 'Burst (Tail TR)', path: "M 120,60 L 140,40 L 110,30 L 120,10 L 90,25 L 70,10 L 60,30 L 30,20 L 40,50 L 10,60 L 40,80 L 20,110 L 60,100 L 80,130 L 100,100 L 130,120 L 120,80 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } },
    'shout_star': { id: 'shout_star', name: 'Star', path: "M 70,10 L 85,40 L 120,40 L 95,60 L 105,90 L 70,75 L 35,90 L 45,60 L 20,40 L 55,40 Z", viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 } },

    // --- SPECIALTY ---
    'jagged_electric': {
        id: 'jagged_electric', name: 'Electric',
        path: "M 10,10 L 40,20 L 70,10 L 100,20 L 130,10 L 120,40 L 130,70 L 120,100 L 90,90 L 60,100 L 30,90 L 0,100 L 10,70 L 0,40 Z M 20,110 L 10,130 L 30,115 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 65 }
    },
    'wobbly_circle': {
        id: 'wobbly_circle', name: 'Wobbly',
        path: "M 70,10 Q 100,5 120,30 Q 140,60 110,90 Q 80,110 40,90 Q 0,70 20,30 Q 40,0 70,10 Z M 30,100 L 10,120 L 40,105 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 65 }
    },
    'scroll_ancient': {
        id: 'scroll_ancient', name: 'Scroll',
        path: "M 20,20 L 120,20 L 120,80 L 20,80 Z M 10,30 L 20,30 L 20,70 L 10,70 Q 0,70 0,60 L 0,40 Q 0,30 10,30 M 130,30 L 120,30 L 120,70 L 130,70 Q 140,70 140,60 L 140,40 Q 140,30 130,30",
        viewBox: { width: 140, height: 100, offsetX: 70, offsetY: 50 }
    },
    'cyber_tech': {
        id: 'cyber_tech', name: 'Cyber',
        path: "M 10,10 L 40,10 L 50,0 L 90,0 L 100,10 L 130,10 L 130,30 L 140,40 L 140,80 L 130,90 L 130,110 L 100,110 L 90,120 L 50,120 L 40,110 L 10,110 L 10,90 L 0,80 L 0,40 L 10,30 Z M 20,110 L 0,130 L 30,110 Z",
        viewBox: { width: 140, height: 130, offsetX: 70, offsetY: 60 }
    },
    'whisper_dashed': {
        id: 'whisper_dashed', name: 'Whisper (Dashed)',
        path: "M 70,10 Q 130,10 130,50 Q 130,90 70,90 Q 40,90 20,70 L 10,100 L 20,60 Q 10,50 10,50 Q 10,10 70,10 Z",
        viewBox: { width: 140, height: 110, offsetX: 70, offsetY: 55 }
        // Note: Dashing handled in renderer via style, but distinct ID allows defaults
    },

    // --- ROUNDED BOX VARIANTS ---
    // Professional Rounded Rect
    'speech_round_bl': { id: 'speech_round_bl', name: 'Round (Tail BL)', path: "M 20,10 L 120,10 Q 130,10 130,20 L 130,80 Q 130,90 120,90 L 50,90 L 10,110 L 20,90 L 20,90 Q 10,90 10,80 L 10,20 Q 10,10 20,10 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } },
    'speech_round_br': { id: 'speech_round_br', name: 'Round (Tail BR)', path: "M 20,10 L 120,10 Q 130,10 130,20 L 130,80 Q 130,90 120,90 L 90,90 L 130,110 L 120,90 Q 10,90 10,80 L 10,20 Q 10,10 20,10 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } },
    'speech_round_tl': { id: 'speech_round_tl', name: 'Round (Tail TL)', path: "M 20,110 L 20,90 L 10,80 L 10,20 Q 10,10 20,10 L 120,10 Q 130,10 130,20 L 130,80 Q 130,90 120,90 L 40,90 L 10,110 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } }, // Simplified logic for quick fix
    'speech_round_tr': { id: 'speech_round_tr', name: 'Round (Tail TR)', path: "M 20,110 L 120,110 L 130,90 L 120,80 Q 130,80 130,20 L 130,10 L 20,10 Z", viewBox: { width: 140, height: 120, offsetX: 70, offsetY: 60 } }, 

    // --- HOLLOW / BOLD ---
    'hollow_bold': {
        id: 'hollow_bold', name: 'Bold Outline',
        path: "M 70,10 Q 130,10 130,50 Q 130,90 70,90 Q 40,90 20,70 L 10,100 L 20,60 Q 10,50 10,50 Q 10,10 70,10 Z",
        viewBox: { width: 140, height: 110, offsetX: 70, offsetY: 55 }
        // Rendered with thick stroke likely
    }"""

def process_files():
    new_entries = []
    
    if not os.path.exists(SVG_DIR):
        print(f"Directory not found: {SVG_DIR}")
        return

    files = sorted(os.listdir(SVG_DIR))
    for filename in files:
        if not filename.endswith(".md"):
            continue
            
        filepath = os.path.join(SVG_DIR, filename)
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                
            # Extract SVG content
            svg_match = re.search(r'<svg.*?</svg>', content, re.DOTALL)
            if not svg_match:
                print(f"Skipping {filename}: No SVG tag found")
                continue
                
            svg_content = svg_match.group(0)
            
            # Check for raster image
            if "<image" in svg_content:
                print(f"Skipping {filename}: Contains raster image")
                continue
                
            # Parse SVG
            # Remove namespace prefixes for easier parsing if necessary, 
            # but ElementTree handles them with some friction. 
            # We'll just strip xmlns for simplicity in this script
            svg_content_clean = re.sub(r' xmlns="[^"]+"', '', svg_content)
            svg_content_clean = re.sub(r' xmlns:xlink="[^"]+"', '', svg_content_clean)
            
            try:
                root = ET.fromstring(svg_content_clean)
            except ET.ParseError as e:
                print(f"Skipping {filename}: XML Parse Error: {e}")
                continue

            # Extract Dimensions/ViewBox
            viewBox = root.get('viewBox')
            width = root.get('width')
            height = root.get('height')
            
            vb_width = 0
            vb_height = 0
            vb_x = 0
            vb_y = 0
            
            if viewBox:
                parts = [float(x) for x in viewBox.replace(',', ' ').split() if x.strip()]
                if len(parts) == 4:
                    vb_x, vb_y, vb_width, vb_height = parts
            
            if vb_width == 0 and width:
                vb_width = float(width.replace('px', ''))
            if vb_height == 0 and height:
                vb_height = float(height.replace('px', ''))
                
            # Extract Paths
            paths = []
            
            # Helper to recursively find paths
            def find_paths(element):
                if element.tag.endswith('path'):
                    d = element.get('d')
                    if d:
                        paths.append(d)
                for child in element:
                    find_paths(child)
                    
            find_paths(root)
            
            if not paths:
                print(f"Skipping {filename}: No paths found")
                continue
                
            # Combine paths
            full_path = " ".join(paths)
            
            # Create ID and Name
            base_name = os.path.splitext(filename)[0]
            # normalize id: svg16 -> svg_16 or just svg16
            callout_id = base_name.replace(' ', '_').lower()
            callout_name = f"Imported {base_name}"
            
            # Calculate Center Offset (Approximation)
            # Existing registry uses offset from top-left to "center" or "tail origin"?
            # Actually, `offsetX` and `offsetY` in the registry seem to be the center point of the bubble relative to the viewBox
            # effectively half width/height usually.
            
            offset_x = vb_width / 2
            offset_y = vb_height / 2
            
            entry = f"""    '{callout_id}': {{
        id: '{callout_id}', name: '{callout_name}',
        path: "{full_path}",
        viewBox: {{ width: {vb_width}, height: {vb_height}, offsetX: {offset_x}, offsetY: {offset_y} }}
    }}"""
            new_entries.append(entry)
            print(f"Processed {filename}: {callout_id}")
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    # Generate File Content
    final_content = f"""
export interface CalloutDef {{
    id: string;
    name: string;
    path: string;
    viewBox: {{ width: number; height: number; offsetX: number; offsetY: number }};
}}

// Generated Registry
export const CALLOUTS: Record<string, CalloutDef> = {{
{EXISTING_ENTRIES},

    // --- IMPORTED SVGS ---
{",\\n".join(new_entries)}
}};

export const DEFAULT_CALLOUT = CALLOUTS['speech_oval_bl'];
"""

    with open(OUTPUT_FILE, 'w') as f:
        f.write(final_content)
    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    process_files()
