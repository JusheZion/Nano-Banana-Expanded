import React, { useState } from 'react';
import { ComicEditor } from '@/modes/comic/pages/ComicEditor';
import { GuidedComicFlow } from '@/portals/guided-comic/GuidedComicFlow';

/**
 * Portal entry for Comic Mode. Starts with the beginner guided flow and keeps
 * the existing advanced ComicEditor available without adding a new portal route.
 */
export const ComicPortal: React.FC = () => {
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);

  if (showAdvancedStudio) return <ComicEditor />;

  return <GuidedComicFlow onOpenAdvancedStudio={() => setShowAdvancedStudio(true)} />;
};
