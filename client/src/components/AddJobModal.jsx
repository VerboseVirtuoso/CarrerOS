import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useToast } from './Toast';

const AddJobModal = ({ isOpen, onClose, defaultStatus = 'applied' }) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    status: defaultStatus,
    source: 'linkedin',
    appliedAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Sync status when defaultStatus prop changes (clicking different column)
  useEffect(() => {
    setFormData(prev => ({ ...prev, status: defaultStatus }));
  }, [defaultStatus]);

  const mutation = useMutation({
    mutationFn: async (newJob) => {
      const response = await api.post('/jobs', newJob);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      addToast(`Added ${formData.company} to pipeline.`, 'success');
      onClose();
      setFormData({
        company: '',
        role: '',
        status: defaultStatus,
        source: 'linkedin',
        appliedAt: new Date().toISOString().split('T')[0],
        notes: '',
      });
    },
    onError: (err) => {
      addToast(err.message || 'Failed to add job.', 'error');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.role.trim()) return;
    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div onClick={handleOverlayClick} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(13, 13, 13, 0.88)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(3px)',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      <div style={{
        background: '#111', border: '1px solid #1e1e1e',
        width: '100%', maxWidth: '460px', borderRadius: '6px',
        padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px #00ff8811',
        animation: 'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '24px',
          borderBottom: '1px solid #1e1e1e', paddingBottom: '12px',
        }}>
          <h2 style={{ color: '#00ff88', fontSize: '1rem', margin: 0, letterSpacing: '0.06em' }}>
            &gt; ADD_NEW_APPLICATION
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#555',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >[X]</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="COMPANY_NAME">
            <Input name="company" value={formData.company} onChange={handleChange}
              placeholder="e.g. Google" required autoFocus />
          </Field>

          <Field label="ROLE / POSITION">
            <Input name="role" value={formData.role} onChange={handleChange}
              placeholder="e.g. Software Engineer" required />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="STATUS">
              <Select name="status" value={formData.status} onChange={handleChange}>
                <option value="applied">APPLIED</option>
                <option value="screening">SCREENING</option>
                <option value="interview">INTERVIEW</option>
                <option value="offer">OFFER</option>
                <option value="rejected">REJECTED</option>
              </Select>
            </Field>
            <Field label="SOURCE">
              <Select name="source" value={formData.source} onChange={handleChange}>
                <option value="linkedin">LINKEDIN</option>
                <option value="referral">REFERRAL</option>
                <option value="cold">COLD_OUTREACH</option>
                <option value="jobboard">JOB_BOARD</option>
                <option value="other">OTHER</option>
              </Select>
            </Field>
          </div>

          <Field label="APPLIED_DATE">
            <Input type="date" name="appliedAt" value={formData.appliedAt} onChange={handleChange} />
          </Field>

          <Field label="NOTES (OPTIONAL)">
            <textarea name="notes" value={formData.notes} onChange={handleChange}
              placeholder="Referral name, recruiter contact, initial thoughts..."
              style={{
                ...inputStyle, minHeight: '80px', resize: 'vertical',
              }} />
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: '1px solid #2a2a2a', color: '#666',
              padding: '10px 18px', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8rem', borderRadius: '4px', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#aaa'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#666'; }}
            >[ CANCEL ]</button>
            <button type="submit" disabled={mutation.isPending} style={{
              background: mutation.isPending ? 'transparent' : '#00ff8818',
              border: '1px solid #00ff88', color: '#00ff88',
              padding: '10px 20px', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 'bold',
              borderRadius: '4px', letterSpacing: '0.06em', transition: 'all 0.15s',
              opacity: mutation.isPending ? 0.6 : 1,
            }}
              onMouseEnter={e => { if (!mutation.isPending) { e.currentTarget.style.background = '#00ff88'; e.currentTarget.style.color = '#000'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#00ff8818'; e.currentTarget.style.color = '#00ff88'; }}
            >
              {mutation.isPending ? '[ ADDING... ]' : '[ ADD JOB ]'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

const inputStyle = {
  background: '#0d0d0d', border: '1px solid #1e1e1e', color: '#e0e0e0',
  padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.85rem', borderRadius: '4px', outline: 'none',
  width: '100%', transition: 'border-color 0.2s, box-shadow 0.2s',
};

const Input = ({ ...props }) => (
  <input
    style={inputStyle}
    {...props}
    onFocus={e => { e.target.style.borderColor = '#00ff88'; e.target.style.boxShadow = '0 0 6px rgba(0,255,136,0.15)'; }}
    onBlur={e => { e.target.style.borderColor = '#1e1e1e'; e.target.style.boxShadow = 'none'; }}
  />
);

const Select = ({ children, ...props }) => (
  <select
    style={{ ...inputStyle, cursor: 'pointer' }}
    {...props}
    onFocus={e => { e.target.style.borderColor = '#00ff88'; }}
    onBlur={e => { e.target.style.borderColor = '#1e1e1e'; }}
  >
    {children}
  </select>
);

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ color: '#555', fontSize: '0.68rem', letterSpacing: '0.1em' }}>{label}</label>
    {children}
  </div>
);

export default AddJobModal;
