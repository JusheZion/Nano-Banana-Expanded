import React, { useState } from 'react';
import { ComicEditor } from '@/modes/comic/pages/ComicEditor';
import { GuidedComicFlow } from '@/portals/guided-comic/GuidedComicFlow';
import type { Portal } from '@/shared/portals';

type ComicPortalProps = {
  onNavigatePortal: (portal: Portal) => void;
};

/**
 * Portal entry for Comic Mode. Starts with the beginner guided flow and keeps
 * the existing advanced ComicEditor available without adding a new portal route.
 */
export const ComicPortal: React.FC<ComicPortalProps> = ({ onNavigatePortal }) => {
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);

  if (showAdvancedStudio) return <ComicEditor />;

  return (
    <GuidedComicFlow
      onNavigatePortal={onNavigatePortal}
      onOpenAdvancedStudio={() => setShowAdvancedStudio(true)}
    />
  );
};
