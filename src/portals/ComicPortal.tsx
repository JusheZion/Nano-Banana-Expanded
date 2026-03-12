import React from 'react';
import { ComicEditor } from '@/modes/comic/pages/ComicEditor';

/**
 * Portal entry for Comic Mode. Renders ComicEditor so all portals live under src/portals/.
 */
export const ComicPortal: React.FC = () => <ComicEditor />;
