import React, { useEffect, useState } from 'react';
import { ComicEditor } from '@/modes/comic/pages/ComicEditor';
import { GuidedComicFlow } from '@/portals/guided-comic/GuidedComicFlow';
import type { GuidedComicStepId } from '@/portals/guided-comic/GuidedComicFlow';
import type { Portal } from '@/shared/portals';

type ComicPortalProps = {
  onNavigatePortal: (portal: Portal) => void;
  advancedStudioRequestKey?: number;
};

/**
 * Portal entry for Comic Mode. Starts with the beginner guided flow and keeps
 * the existing advanced ComicEditor available without adding a new portal route.
 */
export const ComicPortal: React.FC<ComicPortalProps> = ({ onNavigatePortal, advancedStudioRequestKey = 0 }) => {
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(advancedStudioRequestKey > 0);
  const [requestedGuidedStepId, setRequestedGuidedStepId] = useState<GuidedComicStepId | null>(null);

  useEffect(() => {
    if (advancedStudioRequestKey > 0) {
      setRequestedGuidedStepId(null);
      setShowAdvancedStudio(true);
    }
  }, [advancedStudioRequestKey]);

  const openGuidedStep = (stepId: GuidedComicStepId) => {
    setRequestedGuidedStepId(stepId);
    setShowAdvancedStudio(false);
  };

  if (showAdvancedStudio) {
    return <ComicEditor onOpenGuidedWorkflowStep={openGuidedStep} />;
  }

  return (
    <GuidedComicFlow
      onNavigatePortal={onNavigatePortal}
      onOpenAdvancedStudio={() => setShowAdvancedStudio(true)}
      requestedStepId={requestedGuidedStepId}
    />
  );
};
