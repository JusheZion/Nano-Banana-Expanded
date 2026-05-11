import { describe, expect, it } from 'vitest';
import { useWriterWorkshopBridge } from '../writerWorkshopBridge';

describe('writer workshop bridge store', () => {
  it('stores and consumes a requested writer issue handoff once', () => {
    useWriterWorkshopBridge.setState({ requestedIssueId: null });

    useWriterWorkshopBridge.getState().requestIssueOpen('writer-issue-1');

    expect(useWriterWorkshopBridge.getState().requestedIssueId).toBe('writer-issue-1');
    expect(useWriterWorkshopBridge.getState().consumeRequestedIssueOpen()).toBe('writer-issue-1');
    expect(useWriterWorkshopBridge.getState().requestedIssueId).toBeNull();
    expect(useWriterWorkshopBridge.getState().consumeRequestedIssueOpen()).toBeNull();
  });
});
