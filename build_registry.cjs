const fs = require('fs');
const path = require('path');

const dir = 'reference/Callouts Codes';
let svg1Path = '';

let out = `export interface CalloutDef {
    id: string;
    name: string;
    path: string;
    viewBox: string;
}

export const CALLOUTS: Record<string, CalloutDef> = {
`;

for (let i = 1; i <= 25; i++) {
    const filePath = path.join(dir, `${i}.md`);
    let d = '';
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Match the first valid path data string, usually starting with M or m 
        // We'll search for d="M..." or d="m..."
        const match = content.match(/d="([Mm][^"]+)"/);
        if (match) {
            d = match[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }

    if (i === 1) {
        svg1Path = d;
    }

    let isFallback = false;
    if (!d || !/^[Mm]/.test(d)) {
        d = svg1Path;
        isFallback = true;
    }

    if (isFallback) {
        out += `  // TODO: Missing or invalid path, fallback to svg1\n`;
    }
    out += `  'svg${i}': { id: 'svg${i}', name: 'Callout ${i}', path: '${d}', viewBox: '0 0 1000 1000' },\n`;
}

out += `};\n`;

fs.writeFileSync('src/modes/comic/data/CalloutRegistry.ts', out);
console.log('Successfully wrote src/modes/comic/data/CalloutRegistry.ts');
