import { create } from 'zustand';

const useAppStore = create((set) => ({
  selectedJobId: null,
  isPanelOpen: false,

  openPanel: (jobId) => set({ selectedJobId: jobId, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  setSelectedJobId: (id) => set({ selectedJobId: id }),
}));

export default useAppStore;
