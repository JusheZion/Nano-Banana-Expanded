import { useCallback, useState } from 'react';
import type {
  ImageshopPromptSectionKey,
  ImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';

export function useImageshopPromptDraft(initialWorkspace: ImageshopPromptWorkspace) {
  const [promptWorkspace, setPromptWorkspace] = useState<ImageshopPromptWorkspace>(() => ({
    ...initialWorkspace,
  }));

  const updatePromptSection = useCallback((section: ImageshopPromptSectionKey, value: string) => {
    setPromptWorkspace((current) => ({
      ...current,
      [section]: value,
    }));
  }, []);

  const replacePromptWorkspace = useCallback((workspace: Partial<ImageshopPromptWorkspace>) => {
    setPromptWorkspace((current) => ({
      ...current,
      ...workspace,
    }));
  }, []);

  return {
    promptWorkspace,
    updatePromptSection,
    replacePromptWorkspace,
  };
}
