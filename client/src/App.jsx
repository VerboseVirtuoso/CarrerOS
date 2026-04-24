import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, NavLink, Navigate, useLocation, BrowserRouter } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { extractData } from './utils/api';
import KanbanBoard from './components/KanbanBoard';
import RemindersPanel from './components/RemindersPanel';
import ResumeScorer from './components/ResumeScorer';
import CommandBar from './components/CommandBar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { ToastProvider } from './components/Toast';
import { ThemeProvider, useTheme } from './ThemeContext';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import JobDetailPanel from './components/JobDetailPanel';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});



const TitleBar = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div style={{
      height: '38px', background: 'var(--bg-secondary)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      borderBottom: '1px solid var(--border-color)', position: 'relative', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
      </div>
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        color: 'var(--primary)', fontSize: '0.78rem', letterSpacing: '0.12em', fontWeight: '600',
      }}>
        CareerOS v1.0.0
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
        </span>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀ LIGHT' : '☾ DARK'}
        </button>
        {localStorage.getItem('careeros-token') && (
          <button 
            className="theme-toggle" 
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => {
              localStorage.removeItem('careeros-token');
              localStorage.removeItem('careeros-user');
              window.location.href = '/login';
            }}
          >
            [ LOGOUT ]
          </button>
        )}
      </div>
    </div>
  );
};

const TopBar = ({ reminderCount }) => {
  const { theme } = useTheme();
  const inactiveColor  = theme === 'light' ? '#aaa' : '#555';
  const inactiveBorder = theme === 'light' ? '#ddd' : '#2a2a2a';
  return (
    <div style={{
      padding: '12px 20px', display: 'flex', gap: '12px',
      borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)', flexShrink: 0,
    }}>
      {[
        { to: '/kanban',    label: 'KANBAN',   sub: 'track jobs' },
        { to: '/reminders', label: 'REMINDERS', sub: reminderCount > 0 ? `${reminderCount} urgent` : 'follow ups' },
        { to: '/scorer',    label: 'SCORER',    sub: 'resume match' },
        { to: '/analytics', label: 'ANALYTICS', sub: 'stats' },
      ].map(({ to, label, sub }) => (
        <NavLink key={to} to={to} style={({ isActive }) => ({
          padding: '6px 16px',
          border: `1px solid ${isActive ? 'var(--primary)' : inactiveBorder}`,
          borderRadius: '4px',
          color: isActive ? 'var(--primary-text)' : inactiveColor,
          background: isActive ? 'var(--primary)' : 'transparent',
          textDecoration: 'none', fontSize: '0.72rem',
          letterSpacing: '0.08em', fontFamily: 'inherit',
          fontWeight: isActive ? '700' : '400', transition: 'all 0.15s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
        })}>
          <span>[ {label} ]</span>
          <span style={{ fontSize: '0.58rem', opacity: 0.6, fontWeight: 400 }}>{sub}</span>
        </NavLink>
      ))}
    </div>
  );
};

const StatsBar = ({ onReminderCount }) => {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => extractData(await api.get('/jobs')),
  });

  const stats = {
    applied:   jobs.filter(j => j.status === 'applied').length,
    screening: jobs.filter(j => j.status === 'screening').length,
    interview: jobs.filter(j => j.status === 'interview').length,
    offer:     jobs.filter(j => j.status === 'offer').length,
    rejected:  jobs.filter(j => j.status === 'rejected').length,
  };

  const stale = jobs.filter(j => {
    if (!['applied','screening'].includes(j.status)) return false;
    if (j.snoozedUntil && new Date(j.snoozedUntil) > new Date()) return false;
    return (Date.now() - new Date(j.lastActivityAt || j.appliedAt)) / 86400000 >= 7;
  }).length;

  React.useEffect(() => { if (onReminderCount) onReminderCount(stale); }, [stale, onReminderCount]);

  if (isLoading) return (
    <div style={{ display: 'flex', gap: '20px', padding: '7px 20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
      {[80,100,90,60,80,100].map((w,i) => <span key={i} className="skeleton" style={{ width: w, height: 14, display: 'inline-block' }} />)}
    </div>
  );

  const total = jobs.length;
  const interviewPct = total > 0 ? Math.round((stats.interview / total) * 100) : 0;
  const offerPct     = total > 0 ? Math.round((stats.offer / total) * 100) : 0;

  if (total === 0) return (
    <div style={{ padding: '8px 20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--primary)' }}>▶</span>
      <span style={{ color: 'var(--text-dim)' }}>No applications yet — switch to [ KANBAN ] and add your first job</span>
    </div>
  );

  const statItems = [
    { label: 'APPLIED',    value: stats.applied,   color: 'var(--info)' },
    { label: 'SCREENING',  value: stats.screening, color: 'var(--warning)' },
    { label: 'INTERVIEW',  value: stats.interview, color: 'var(--purple)' },
    { label: 'OFFER',      value: stats.offer,     color: 'var(--primary)' },
    { label: 'REJECTED',   value: stats.rejected,  color: 'var(--danger)' },
    { label: 'FOLLOW-UPS', value: stale,           color: stale > 0 ? 'var(--warning)' : 'var(--text-muted)' },
  ];

  return (
    <div style={{ padding: '7px 20px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {statItems.map(({ label, value, color }) => (
          <span key={label} style={{ letterSpacing: '0.06em' }}>
            <span style={{ color, fontWeight: '700', marginRight: '4px' }}>{value}</span>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="pipeline-bar-track"><div className="pipeline-bar-fill" style={{ width: `${interviewPct}%`, background: 'linear-gradient(90deg, var(--info), var(--purple))' }} /></div>
        <div className="pipeline-bar-track"><div className="pipeline-bar-fill" style={{ width: `${offerPct}%`, background: 'linear-gradient(90deg, var(--purple), var(--primary))' }} /></div>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{interviewPct}% interviewed · {offerPct}% offered</span>
      </div>
    </div>
  );
};

const AnimatedMain = () => {
  const location = useLocation();
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '60px', background: 'var(--bg-color)' }}>
      <Routes location={location}>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/kanban"    element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><RemindersPanel /></ProtectedRoute>} />
        <Route path="/scorer"    element={<ProtectedRoute><ResumeScorer /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
        
        <Route path="/"          element={<Navigate to="/kanban" replace />} />
        <Route path="*"          element={<Navigate to="/kanban" replace />} />
      </Routes>
    </main>
  );
};

const MainApp = () => {
  const [reminderCount, setReminderCount] = React.useState(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: 'var(--font-main)', overflow: 'hidden' }}>
      <TitleBar />
      <TopBar reminderCount={reminderCount} />
      <StatsBar onReminderCount={setReminderCount} />
      <AnimatedMain />
      <JobDetailPanel />
      <CommandBar />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <MainApp />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
