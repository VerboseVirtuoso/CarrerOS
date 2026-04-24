import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { extractData } from '../utils/api';
import useAppStore from '../store/useAppStore';
import { useToast } from './Toast';

const STATUS_OPTIONS = [
  { id: 'applied', label: 'APPLIED', color: '#378ADD' },
  { id: 'screening', label: 'SCREENING', color: '#f0c040' },
  { id: 'interview', label: 'INTERVIEW', color: '#aa88ff' },
  { id: 'offer', label: 'OFFER', color: '#00ff88' },
  { id: 'rejected', label: 'REJECTED', color: '#ff5555' },
];

const JobDetailPanel = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { selectedJobId, isPanelOpen, closePanel } = useAppStore();
  const [newNote, setNewNote] = useState('');

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', selectedJobId],
    queryFn: async () => extractData(await api.get(`/jobs/${selectedJobId}`)),
    enabled: !!selectedJobId && isPanelOpen,
  });

  const statusMutation = useMutation({
    mutationFn: async (status) => api.patch(`/jobs/${selectedJobId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      addToast('Status updated', 'success');
    },
  });

  const noteMutation = useMutation({
    mutationFn: async (text) => api.patch(`/jobs/${selectedJobId}`, { notes: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      setNewNote('');
      addToast('Note added', 'success');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/jobs/${selectedJobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      closePanel();
      addToast('Application deleted', 'success');
    },
  });

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={closePanel}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 998,
          backdropFilter: 'blur(1px)'
        }} 
      />

      {/* Panel */}
      <div 
        className="panel-slide-in"
        style={{
          position: 'fixed', right: 0, top: '38px', 
          height: 'calc(100vh - 38px - 40px)',
          width: '340px', background: 'var(--card-bg)',
          borderLeft: '1px solid var(--border-color)',
          zIndex: 999, display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.3)'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '20px' }}>
            <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 32 }} />
            <div className="skeleton" style={{ height: 100, width: '100%' }} />
          </div>
        ) : isError ? (
          <div style={{ padding: '20px', color: 'var(--danger)' }}>Failed to load job details.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h2 style={{ color: 'var(--primary)', fontSize: '1.2rem', margin: 0 }}>{job.company}</h2>
                <button 
                  onClick={closePanel}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  [×]
                </button>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{job.role}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Status Switcher */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.1em' }}>UPDATE_STATUS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => statusMutation.mutate(opt.id)}
                      style={{
                        padding: '6px 4px', fontSize: '0.6rem', border: `1px solid ${job.status === opt.id ? opt.color : 'var(--border-color)'}`,
                        background: job.status === opt.id ? `${opt.color}15` : 'transparent',
                        color: job.status === opt.id ? opt.color : 'var(--text-dim)',
                        borderRadius: '3px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <MetaItem label="APPLIED" value={new Date(job.appliedAt).toLocaleDateString()} />
                <MetaItem label="SOURCE" value={job.source?.toUpperCase() || 'OTHER'} />
                <MetaItem label="SCORE" value={job.resumeMatchScore ? `${job.resumeMatchScore}%` : '—'} />
                <MetaItem label="STALE" value={`${Math.floor((Date.now() - new Date(job.lastActivityAt || job.appliedAt))/86400000)}d`} />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.1em' }}>ACTIVITY_LOG</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {job.notes?.length === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet.</div>}
                  {job.notes?.map((note, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>{note.text}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 6 }}>{new Date(note.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a note..."
                  style={{
                    width: '100%', background: 'var(--bg-color)', color: 'var(--text-main)',
                    border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px',
                    fontFamily: 'inherit', fontSize: '0.8rem', resize: 'none', height: '60px', outline: 'none'
                  }}
                />
                <button 
                  disabled={!newNote.trim()}
                  onClick={() => noteMutation.mutate(newNote)}
                  className="btn" 
                  style={{ width: '100%', marginTop: 8, fontSize: '0.7rem' }}
                >
                  [ ADD_NOTE ]
                </button>
              </div>

              {/* Danger Zone */}
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed var(--danger)' }}>
                <button 
                  onClick={() => window.confirm('Delete this application permanently?') && deleteMutation.mutate()}
                  style={{
                    width: '100%', padding: '10px', background: 'transparent',
                    border: '1px solid var(--danger)', color: 'var(--danger)',
                    fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px'
                  }}
                >
                  [ DELETE_APPLICATION ]
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const MetaItem = ({ label, value }) => (
  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px' }}>
    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{value}</div>
  </div>
);

export default JobDetailPanel;
