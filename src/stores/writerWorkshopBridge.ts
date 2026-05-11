import { create } from 'zustand';

type WriterWorkshopBridgeState = {
  requestedIssueId: string | null;
  requestIssueOpen: (issueId: string) => void;
  consumeRequestedIssueOpen: () => string | null;
};

export const useWriterWorkshopBridge = create<WriterWorkshopBridgeState>((set, get) => ({
  requestedIssueId: null,
  requestIssueOpen: (issueId) => set({ requestedIssueId: issueId }),
  consumeRequestedIssueOpen: () => {
    const issueId = get().requestedIssueId;
    if (!issueId) return null;
    set({ requestedIssueId: null });
    return issueId;
  },
}));
