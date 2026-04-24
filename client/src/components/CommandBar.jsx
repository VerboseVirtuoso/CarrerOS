import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api, { extractData } from '../utils/api';
import { useToast } from './Toast';

const CommandBar = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [overlay, setOverlay] = useState(null); // 'ls', 'help', null
  const inputRef = useRef(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => extractData(await api.get('/jobs')),
  });

  const mutations = {
    add:    useMutation({ mutationFn: (data)          => api.post('/jobs', data),                     onSuccess: () => refresh(), onError: () => flash('error') }),
    patch:  useMutation({ mutationFn: ({ id, data })  => api.patch(`/jobs/${id}/status`, data),       onSuccess: () => refresh(), onError: () => flash('error') }),
    snooze: useMutation({ mutationFn: ({ id, days })  => api.patch(`/jobs/${id}/snooze`, { days }),   onSuccess: () => refresh(), onError: () => flash('error') }),
    delete: useMutation({ mutationFn: (id)            => api.delete(`/jobs/${id}`),                   onSuccess: () => refresh(), onError: () => flash('error') }),
    score:  useMutation({ mutationFn: ({ id, score }) => api.patch(`/jobs/${id}/score`, { score }),   onSuccess: () => refresh(), onError: () => flash('error') }),
  };

  const refresh = (msg = 'done.') => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
    flash('success');
    addToast(msg, 'success');
  };

  const flash = (type) => {
    setStatus(type);
    setTimeout(() => setStatus('idle'), type === 'success' ? 1000 : 2000);
  };

  const executeCommand = async (cmdStr) => {
    // Guard: parse safely — handle null match result
    const rawParts = cmdStr.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
    if (!rawParts || rawParts.length === 0) {
      flash('error');
      return;
    }
    const parts = rawParts.map(p => p.replace(/['"]/g, ''));
    const [cmd, ...args] = parts;

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          setOverlay('help');
          break;
        case 'ls':
          setOverlay('ls');
          break;
        case 'add':
          if (args.length < 2) throw new Error('Usage: add <company> "<role>"');
          await mutations.add.mutateAsync({ company: args[0], role: args[1] });
          refresh(`Added ${args[0]} to pipeline.`);
          break;
        case 'move': {
          if (args.length < 2) throw new Error('Usage: move <company> <status>');
          if (jobs.length === 0) throw new Error('No jobs loaded yet');
          const job = jobs.find(j => j.company.toLowerCase().includes(args[0].toLowerCase()));
          if (!job) throw new Error(`No job matching "${args[0]}" found`);
          await mutations.patch.mutateAsync({ id: job._id, data: { status: args[1].toLowerCase() } });
          refresh(`Moved ${job.company} → ${args[1].toLowerCase()}.`);
          break;
        }
        case 'snooze': {
          if (args.length < 2) throw new Error('Usage: snooze <company> <days>');
          const days = parseInt(args[1], 10);
          if (isNaN(days) || days < 1) throw new Error('Days must be a positive integer');
          const job = jobs.find(j => j.company.toLowerCase().includes(args[0].toLowerCase()));
          if (!job) throw new Error(`No job matching "${args[0]}" found`);
          await mutations.snooze.mutateAsync({ id: job._id, days });
          refresh(`Snoozed ${job.company} for ${days}d.`);
          break;
        }
        case 'delete': {
          if (args.length < 1) throw new Error('Usage: delete <company>');
          const job = jobs.find(j => j.company.toLowerCase().includes(args[0].toLowerCase()));
          if (!job) throw new Error(`No job matching "${args[0]}" found`);
          if (window.confirm(`Delete application for ${job.company}?`)) {
            await mutations.delete.mutateAsync(job._id);
            refresh(`Deleted ${job.company}.`);
          }
          break;
        }
        case 'score': {
          if (args.length < 2) throw new Error('Usage: score <company> <0-100>');
          const score = parseInt(args[1], 10);
          if (isNaN(score) || score < 0 || score > 100) throw new Error('Score must be 0-100');
          const job = jobs.find(j => j.company.toLowerCase().includes(args[0].toLowerCase()));
          if (!job) throw new Error(`No job matching "${args[0]}" found`);
          await mutations.score.mutateAsync({ id: job._id, score });
          refresh(`Score set to ${score} for ${job.company}.`);
          break;
        }
        case 'clear':
          setOverlay(null);
          break;
        default:
          throw new Error(`Unknown command: "${cmd}"`);
      }
    } catch (err) {
      console.error('[CommandBar]', err.message);
      flash('error');
      addToast(err.message, 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmed = input.trim();
      if (trimmed) {
        setHistory(prev => [trimmed, ...prev]);
        setHistoryIdx(-1);
        executeCommand(trimmed);
        setInput('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = historyIdx + 1;
      if (nextIdx < history.length) {
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIdx - 1;
      if (nextIdx >= 0) {
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setOverlay(null);
    }
  };

  return (
    <>
      {overlay && (
        <div style={{
          position: 'fixed', top: '10%', left: '10%', right: '10%', bottom: '15%',
          background: 'var(--card-bg)', border: '1px solid var(--primary)',
          zIndex: 1000, padding: '40px', overflowY: 'auto', borderRadius: '6px',
          boxShadow: '0 0 30px rgba(0,255,136,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '20px' }}>
            <span>[ SYSTEM_OVERLAY: {overlay.toUpperCase()} ]</span>
            <span onClick={() => setOverlay(null)} style={{ cursor: 'pointer' }}>[ ESC to CLOSE ]</span>
          </div>
          {overlay === 'ls' ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {jobs.length === 0 ? (
                <span style={{ color: 'var(--text-dim)' }}>No jobs found.</span>
              ) : jobs.map(j => (
                <div key={j._id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', padding: '4px 0' }}>
                  <span style={{ color: 'var(--primary)', minWidth: '160px' }}>{j.company}</span>
                  <span style={{ color: 'var(--text-dim)', flex: 1 }}>{j.role}</span>
                  <span style={{ color: 'var(--warning)' }}>[{j.status.toUpperCase()}]</span>
                </div>
              ))}
            </div>
          ) : (
            <pre style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6' }}>{`
COMMANDS:
  add <company> "<role>"     -> Create new application
  move <company> <status>    -> Update status (applied, screening, interview, offer, rejected)
  snooze <company> <days>    -> Silence reminder for X days
  delete <company>           -> Remove application
  score <company> <0-100>    -> Manual match score update
  ls                         -> List all active applications
  clear                      -> Close this overlay
  help                       -> Show this list
            `}</pre>
          )}
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '40px',
        background: 'var(--card-bg)', borderTop: `1px solid ${status === 'error' ? 'var(--danger)' : status === 'success' ? 'var(--primary)' : 'var(--border-color)'}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 1100,
        transition: 'border-color 0.2s ease',
        boxShadow: '0 -1px 8px rgba(0,0,0,0.1)',
      }}>
        <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginRight: '10px' }}>&gt;</span>
        
        {/* Command Hint Bar */}
        <div style={{
          position: 'absolute', bottom: '100%', left: '20px', padding: '4px 12px',
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderBottom: 'none', borderRadius: '4px 4px 0 0',
          fontSize: '0.68rem', color: 'var(--text-dim)',
          opacity: inputRef.current === document.activeElement ? 1 : 0,
          transform: `translateY(${inputRef.current === document.activeElement ? '0' : '4px'})`,
          transition: 'all 0.2s ease', pointerEvents: 'none',
          display: 'flex', gap: '12px'
        }}>
          <span>try: <span style={{ color: 'var(--primary)' }}>add Google "SWE"</span></span>
          <span>|</span>
          <span><span style={{ color: 'var(--primary)' }}>ls</span></span>
          <span>|</span>
          <span><span style={{ color: 'var(--primary)' }}>help</span></span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setStatus('idle')} // Trigger re-render to show hint
          onBlur={() => setStatus('idle')}  // Trigger re-render to hide hint
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            background: 'transparent', border: 'none', color: 'var(--primary)',
            width: '100%', fontFamily: 'inherit', outline: 'none', fontSize: '0.9rem'
          }}
          placeholder={status === 'error' ? 'unknown command' : status === 'success' ? 'done.' : 'type command...'}
        />
        {status === 'success' && <span style={{ color: 'var(--primary)', fontSize: '0.7rem', marginLeft: '10px' }}>[OK]</span>}
        {status === 'error' && <span style={{ color: 'var(--danger)', fontSize: '0.7rem', marginLeft: '10px' }}>[ERR]</span>}
      </div>
    </>
  );
};

export default CommandBar;
