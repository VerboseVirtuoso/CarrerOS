import { create } from 'zustand';

/**
 * Global Zustand store for CareerOS.
 * Manages UI state, reminders, command history, and resume scorer data.
 */
const useAppStore = create((set, get) => ({
  // ─── UI State ──────────────────────────────────────────────────────────────
  ui: {
    activeTab: 'kanban',
    selectedJobId: null,
    isPanelOpen: false,
    isModalOpen: false,
    modalDefaultStatus: 'applied',
  },

  setTab: (tab) => 
    set((state) => ({ ui: { ...state.ui, activeTab: tab } })),

  openPanel: (jobId) => 
    set((state) => ({ 
      ui: { ...state.ui, selectedJobId: jobId, isPanelOpen: true } 
    })),

  closePanel: () => 
    set((state) => ({ 
      ui: { ...state.ui, isPanelOpen: false, selectedJobId: null } 
    })),

  openModal: (status = 'applied') => 
    set((state) => ({ 
      ui: { ...state.ui, isModalOpen: true, modalDefaultStatus: status } 
    })),

  closeModal: () => 
    set((state) => ({ 
      ui: { ...state.ui, isModalOpen: false } 
    })),

  // ─── Reminders ─────────────────────────────────────────────────────────────
  reminders: {
    count: 0,
    lastChecked: null,
  },

  setReminderCount: (n) => 
    set((state) => ({ reminders: { ...state.reminders, count: n } })),

  markRemindersChecked: () => 
    set((state) => ({ 
      reminders: { ...state.reminders, lastChecked: new Date() } 
    })),

  // ─── Command Bar History ──────────────────────────────────────────────────
  cmd: {
    history: [],
    historyIndex: -1,
  },

  pushCmd: (cmdText) => 
    set((state) => {
      const newHistory = [cmdText, ...state.cmd.history].slice(0, 50); // Keep last 50
      return { 
        cmd: { history: newHistory, historyIndex: -1 } 
      };
    }),

  navigateHistory: (direction) => {
    const { history, historyIndex } = get().cmd;
    if (history.length === 0) return '';

    let newIndex = historyIndex + direction;
    
    // Bounds checking
    if (newIndex < -1) newIndex = -1;
    if (newIndex >= history.length) newIndex = history.length - 1;

    set((state) => ({ cmd: { ...state.cmd, historyIndex: newIndex } }));

    return newIndex === -1 ? '' : history[newIndex];
  },

  // ─── Resume Scorer ────────────────────────────────────────────────────────
  scorer: {
    jdText: '',
    resumeText: '',
    results: null,
    linkedJobId: null,
  },

  setScorerText: (field, value) => 
    set((state) => ({ 
      scorer: { ...state.scorer, [field]: value } 
    })),

  setResults: (results) => 
    set((state) => ({ 
      scorer: { ...state.scorer, results } 
    })),

  linkScorerToJob: (jobId) => 
    set((state) => ({ 
      scorer: { ...state.scorer, linkedJobId: jobId } 
    })),
}));

export default useAppStore;
