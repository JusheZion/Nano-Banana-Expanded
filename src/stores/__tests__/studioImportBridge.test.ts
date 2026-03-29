import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioImportBridge } from '@/stores/studioImportBridge';

beforeEach(() => {
  useStudioImportBridge.setState({
    portalToOpen: null,
    importPayload: null,
  });
});

describe('useStudioImportBridge', () => {
  it('requestOpenInStudio sets portal and payload', () => {
    useStudioImportBridge.getState().requestOpenInStudio('studio', 'https://img', 'hint');
    expect(useStudioImportBridge.getState().portalToOpen).toBe('studio');
    expect(useStudioImportBridge.getState().importPayload).toEqual({
      target: 'studio',
      imageUrl: 'https://img',
      promptHint: 'hint',
    });
  });

  it('consumeImportForTarget returns payload for matching target', () => {
    useStudioImportBridge.getState().requestOpenInStudio('assets', 'https://a');
    const out = useStudioImportBridge.getState().consumeImportForTarget('assets');
    expect(out?.imageUrl).toBe('https://a');
    expect(useStudioImportBridge.getState().importPayload).not.toBeNull();
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        expect(useStudioImportBridge.getState().importPayload).toBeNull();
        resolve();
      });
    });
  });

  it('consumeImportForTarget returns null for wrong target', () => {
    useStudioImportBridge.getState().requestOpenInStudio('studio', 'u');
    expect(useStudioImportBridge.getState().consumeImportForTarget('assets')).toBeNull();
  });

  it('clearPortalRequest clears portal only', () => {
    useStudioImportBridge.getState().requestOpenInStudio('studio', 'u');
    useStudioImportBridge.getState().clearPortalRequest();
    expect(useStudioImportBridge.getState().portalToOpen).toBeNull();
    expect(useStudioImportBridge.getState().importPayload).not.toBeNull();
  });
});
