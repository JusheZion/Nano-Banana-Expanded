export interface TextureDef {
    id: string;
    name: string;
    url: string; // Base64 Data URI or path
}

export const TEXTURE_REGISTRY: TextureDef[] = [
    {
        id: 'halftone',
        name: 'Halftone Print',
        // A simple polka dot SVG pattern for halftone effect
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgoJPHJlY3Qgd2lkdGg9IjhweCIgaGVpZ2h0PSI4cHgiIGZpbGw9IiNmZmYiIC8+Cgk8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iMyIgZmlsbD0iIzAwMCIgLz4KPC9zdmc+'
    },
    {
        id: 'grit',
        name: 'Gritty Noise',
        // Noise or grit pattern, here using a small speckled SVG
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgoJPHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPgoJPHBhdGggZD0iTTAgMGgxTTEgMWgxTTAgMmgxbTEgMWgxIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMC41IiAvPgo8L3N2Zz4='
    },
    {
        id: 'hex',
        name: 'Hexagon Grid',
        // Simple hexagon grid pattern
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNy4zMiI+Cgk8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTcuMzIiIGZpbGw9IiNmZmYiIC8+Cgk8cGF0aCBkPSJNMCA4LjY2bDUtOC42Nmw1IDguNjZsLTUgOC42NnoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg=='
    },
    {
        id: 'lines-diag',
        name: 'Diagonal Lines',
        // Diagonal hatch pattern
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgoJPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2ZmZiIvPgoJPHBhdGggZD0iTTAgOGw4LThNLTQgNGw4LThNNCwxMmw4LTgiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4='
    }
];

export const getTextureUrl = (id: string): string | undefined => {
    return TEXTURE_REGISTRY.find(t => t.id === id)?.url;
};
