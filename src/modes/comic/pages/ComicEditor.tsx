import React, { useEffect } from 'react';
import { ComicLayout } from '../layouts/ComicLayout';
import { ComicCanvas } from '../engine/ComicCanvas';
import { useComicStore } from '@/stores/comicStore';
import { useGuidedComicLayoutBridge } from '@/stores/guidedComicLayoutBridge';
import type { GuidedComicStepId } from '@/portals/guided-comic/GuidedComicFlow';

type ComicEditorProps = {
    onOpenGuidedWorkflowStep?: (stepId: GuidedComicStepId) => void;
};

export const GUIDED_WORKFLOW_STEPS: Array<{ id: GuidedComicStepId; label: string }> = [
    { id: 'setup', label: 'Setup' },
    { id: 'story', label: 'Story' },
    { id: 'pages', label: 'Pages' },
    { id: 'visual-prep', label: 'Visual Prep' },
    { id: 'art', label: 'Art' },
    { id: 'layout', label: 'Layout' },
    { id: 'export', label: 'Export' },
];

export const ComicEditor: React.FC<ComicEditorProps> = ({ onOpenGuidedWorkflowStep }) => {
    const replaceCurrentPageWithGuidedLayout = useComicStore((s) => s.replaceCurrentPageWithGuidedLayout);
    const consumeLayoutHandoff = useGuidedComicLayoutBridge((s) => s.consumeLayoutHandoff);

    useEffect(() => {
        const payload = consumeLayoutHandoff();
        if (!payload) return;
        replaceCurrentPageWithGuidedLayout(payload);
    }, [consumeLayoutHandoff, replaceCurrentPageWithGuidedLayout]);

    return (
        <ComicLayout
            guidedWorkflowSteps={onOpenGuidedWorkflowStep ? GUIDED_WORKFLOW_STEPS : undefined}
            onOpenGuidedWorkflowStep={
                onOpenGuidedWorkflowStep
                    ? (stepId) => onOpenGuidedWorkflowStep(stepId as GuidedComicStepId)
                    : undefined
            }
        >
            <ComicCanvas />
        </ComicLayout>
    );
};
