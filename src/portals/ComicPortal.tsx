import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { GuidedComicStepId } from '@/portals/guided-comic/GuidedComicFlow';
import type { Portal } from '@/shared/portals';

const ComicEditor = lazy(() => import('@/modes/comic/pages/ComicEditor').then((module) => ({ default: module.ComicEditor })));
const GuidedComicFlow = lazy(() => import('@/portals/guided-comic/GuidedComicFlow').then((module) => ({ default: module.GuidedComicFlow })));

const ComicWorkspaceFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-white/60">Loading comic workspace…</div>
);

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
    return (
      <Suspense fallback={<ComicWorkspaceFallback />}>
        <ComicEditor onOpenGuidedWorkflowStep={openGuidedStep} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ComicWorkspaceFallback />}>
      <GuidedComicFlow
        onNavigatePortal={onNavigatePortal}
        onOpenAdvancedStudio={() => setShowAdvancedStudio(true)}
        requestedStepId={requestedGuidedStepId}
      />
    </Suspense>
  );
};
