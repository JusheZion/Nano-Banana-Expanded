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
    useStudioImportBridge.getState().requestOpenInStudio('studio', 'https://img', 'hint', {
      origin: {
        sourcePortal: 'lab',
        sourceLabel: 'Beat 3',
        selectedBeatId: 'beat-3',
      },
      returnToPortal: 'lab',
    });
    expect(useStudioImportBridge.getState().portalToOpen).toBe('studio');
    expect(useStudioImportBridge.getState().importPayload).toMatchObject({
      target: 'studio',
      imageUrl: 'https://img',
      promptHint: 'hint',
      returnToPortal: 'lab',
      origin: {
        sourcePortal: 'lab',
        sourceLabel: 'Beat 3',
        selectedBeatId: 'beat-3',
      },
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

  it('can request a return to the source portal after a studio save', () => {
    useStudioImportBridge.getState().requestOpenInStudio('studio', 'https://img', 'hint', {
      origin: {
        sourcePortal: 'lab',
        sourceLabel: 'Beat 2',
        selectedBeatId: 'beat-2',
      },
      returnToPortal: 'lab',
    });

    useStudioImportBridge.getState().consumeImportForTarget('studio');
    useStudioImportBridge.getState().requestReturnToSourceIfNeeded('studio', 'https://saved');

    expect(useStudioImportBridge.getState().portalToOpen).toBe('lab');
    const returned = useStudioImportBridge.getState().consumeReturnPayloadForPortal('lab');
    expect(returned).toMatchObject({
      target: 'studio',
      imageUrl: 'https://saved',
      origin: {
        selectedBeatId: 'beat-2',
      },
    });
  });
});
