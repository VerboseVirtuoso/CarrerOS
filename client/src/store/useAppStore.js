import { create } from 'zustand';

/**
 * useAppStore — Global state for UI components.
 * Manages the JobDetailPanel state and shared UI interactions.
 */
const useAppStore = create((set) => ({
  // Job Detail Panel State
  selectedJobId: null,
  isPanelOpen: false,

  // Actions
  openPanel: (jobId) => set({ selectedJobId: jobId, isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  
  // Toggle (for convenience)
  setSelectedJobId: (id) => set({ selectedJobId: id }),
}));

export default useAppStore;
