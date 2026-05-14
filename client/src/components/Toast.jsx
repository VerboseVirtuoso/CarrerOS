import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const COLORS = {
  success: { border: '#00ff88', text: '#00ff88', icon: '✓' },
  error:   { border: '#ff5555', text: '#ff5555', icon: '✗' },
  info:    { border: '#378ADD', text: '#378ADD', icon: 'i' },
  warning: { border: '#f0c040', text: '#f0c040', icon: '!' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'success', duration = 2800) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, duration);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 200);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '56px', right: '20px',
        zIndex: 9000, display: 'flex', flexDirection: 'column',
        gap: '8px', pointerEvents: 'none',
        maxWidth: '340px', width: 'calc(100vw - 40px)',
      }}>
        {toasts.map(toast => {
          const c = COLORS[toast.type] || COLORS.success;
          return (
            <div
              key={toast.id}
              className={toast.exiting ? 'toast-exit' : 'toast-enter'}
              style={{
                background: '#111',
                border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${c.border}`,
                borderRadius: '4px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8rem', color: '#e0e0e0',
                boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${c.border}22`,
                pointerEvents: 'auto',
              }}
            >
              <span style={{ color: c.text, fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                [{c.icon}]
              </span>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
