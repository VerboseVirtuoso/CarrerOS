import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { extractData } from '../utils/api';
import { useToast } from './Toast';

const RemindersPanel = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // 1. Fetch Reminders
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const res = await api.get('/reminders');
      return extractData(res);
    }
  });

  // 2. Mutations
  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }) => api.patch(`/jobs/${id}/snooze`, { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      addToast('Snoozed for 3 days.', 'info');
    },
    onError: () => addToast('Failed to snooze.', 'error'),
  });

  const wakeMutation = useMutation({
    mutationFn: async (id) => api.patch(`/jobs/${id}/unsnooze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      addToast('Reminder reactivated.', 'success');
    },
    onError: () => addToast('Failed to wake reminder.', 'error'),
  });

  if (isLoading) return (
    <div className="view-container" style={{ padding: '0' }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.1rem' }}>[ ACTIVE_REMINDERS ]</h2>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px', boxShadow: 'var(--shadow)' }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '4px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '60%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 10, width: '80%' }} />
          </div>
        </div>
      ))}
    </div>
  );
  if (isError) return <div style={{ color: 'var(--danger)', padding: '24px' }}>Failed to load reminders. Check server connection.</div>;

  const { activeReminders = [], snoozedReminders = [] } = (data && typeof data === 'object') ? data : {};

  const handleSendEmail = (job) => {
    const subject = encodeURIComponent(`Follow-up: ${job.role} position at ${job.company}`);
    const body = encodeURIComponent(`Hi [Hiring Manager Name],\n\nI hope you're having a great week.\n\nI'm writing to briefly follow up on my application for the ${job.role} position at ${job.company}. I am still very much interested in the opportunity and would love to hear if there are any updates.\n\nBest regards,\n[Your Name]`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="view-container">
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.1rem' }}>
          [ ACTIVE_REMINDERS ]
        </h2>
        
        {activeReminders.length === 0 ? (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderLeft: '3px solid var(--primary)',
            borderRadius: '4px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            boxShadow: 'var(--shadow)',
          }}>
            <span style={{ fontSize: '2rem', color: 'var(--primary)' }}>✓</span>
            <div>
              <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, letterSpacing: '0.05em' }}>
                ALL_CAUGHT_UP
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', lineHeight: 1.6 }}>
                No follow-ups needed right now. Applications without a response for 7+ days will appear here automatically.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeReminders.map(job => (
              <ReminderCard 
                key={job._id} 
                job={job} 
                onEmail={() => handleSendEmail(job)}
                onSnooze={() => snoozeMutation.mutate({ id: job._id, days: 3 })}
              />
            ))}
          </div>
        )}
      </div>

      {snoozedReminders.length > 0 && (
        <div>
          <h2 style={{ color: 'var(--text-dim)', marginBottom: '20px', fontSize: '1.1rem' }}>
            [ SNOOZED ]
          </h2>
          <div style={{ display: 'grid', gap: '16px', opacity: 0.6 }}>
            {snoozedReminders.map(job => (
              <ReminderCard 
                key={job._id} 
                job={job} 
                isSnoozed 
                onWake={() => wakeMutation.mutate(job._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ReminderCard = ({ job, onEmail, onSnooze, onWake, isSnoozed }) => {
  const isStalePlus = job.daysSinceActivity > 14;
  const icon = isStalePlus ? '?' : '!';
  const iconColor = isStalePlus ? '#ff8c00' : 'var(--warning)';

  return (
    <div className="terminal-border" style={{
      background: 'var(--card-bg)',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: iconColor,
          width: '32px',
          textAlign: 'center'
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
            {job.company}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {job.role} • Applied {new Date(job.appliedAt).toLocaleDateString()}
          </div>
          {!isSnoozed && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>
              {job.daysSinceActivity} days since application — no response. Follow up now.
            </div>
          )}
          {isSnoozed && (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '4px' }}>
              Snoozed until {new Date(job.snoozedUntil).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {!isSnoozed ? (
          <>
            <button
              className="btn"
              onClick={onEmail}
              data-tooltip="Open email client with a pre-filled follow-up message"
              aria-label="Send follow-up email"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              [ SEND EMAIL ]
            </button>
            <button
              className="btn"
              onClick={onSnooze}
              data-tooltip="Hide this reminder for 3 days"
              aria-label="Snooze reminder for 3 days"
            >
              [ SNOOZE 3D ]
            </button>
          </>
        ) : (
          <button
            className="btn"
            onClick={onWake}
            data-tooltip="Restore this reminder to the active list"
            aria-label="Wake up snoozed reminder"
            style={{ borderColor: 'var(--info)', color: 'var(--info)' }}
          >
            [ WAKE UP ]
          </button>
        )}
      </div>
    </div>
  );
};

export default RemindersPanel;
