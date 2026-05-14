import React, { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { extractData } from '../utils/api';
import JobCard from './JobCard';
import AddJobModal from './AddJobModal';
import { useToast } from './Toast';

const COLUMNS = [
  { id: 'applied',   label: 'APPLIED',   color: '#378ADD' },
  { id: 'screening', label: 'SCREENING', color: '#f0c040' },
  { id: 'interview', label: 'INTERVIEW', color: '#aa88ff' },
  { id: 'offer',     label: 'OFFER',     color: '#00ff88' },
  { id: 'rejected',  label: 'REJECTED',  color: '#ff5555' },
];

const SkeletonCard = () => (
  <div style={{
    background: 'var(--card-bg)', border: '1px solid var(--border-color)',
    borderRadius: '4px', padding: '12px', marginBottom: '10px',
  }}>
    <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
    <div className="skeleton" style={{ height: 11, width: '50%', marginBottom: 12 }} />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div className="skeleton" style={{ height: 10, width: '30%' }} />
      <div className="skeleton" style={{ height: 10, width: '20%' }} />
    </div>
  </div>
);

const KanbanSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', minWidth: '1000px' }}>
    {COLUMNS.map(col => (
      <div key={col.id}>
        <div style={{
          padding: '12px', background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)', borderBottom: `2px solid ${col.color}`,
          borderRadius: '4px', marginBottom: '16px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ color: col.color, fontSize: '0.8rem', fontWeight: 'bold' }}>{col.label}</span>
          <div className="skeleton" style={{ width: 16, height: 14 }} />
        </div>
        {[1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    ))}
  </div>
);

const EmptyColumn = ({ color, status, onAdd }) => (
  <div
    className="empty-state"
    style={{ cursor: 'pointer' }}
    onClick={onAdd}
    title={`Add a job to ${status}`}
  >
    <span className="empty-icon" style={{ color }}>[ ]</span>
    <span>no applications</span>
    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>click to add one</span>
  </div>
);

const QUICK_STEPS = [
  { n: '01', title: 'Add Job', desc: 'Click [ + ADD JOB ] or use the command bar to log your first application.' },
  { n: '02', title: 'Track', desc: 'Drag cards as you move from Screening to Interviews and Offers.' },
  { n: '03', title: 'Follow Up', desc: 'Check [ REMINDERS ] for applications that haven\'t responded in 7 days.' },
];

const WelcomeBanner = ({ onAdd }) => (
  <div className="view-container" style={{ maxWidth: 840, margin: '0 auto', padding: '60px 0' }}>
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <div style={{
        display: 'inline-block', fontSize: '0.65rem', letterSpacing: '0.25em',
        color: 'var(--primary)', border: '1px solid var(--primary)',
        padding: '4px 16px', borderRadius: '4px', marginBottom: 24, fontWeight: 'bold'
      }}>WELCOME_TO_CAREEROS</div>

      <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, marginBottom: 16 }}>
        Your Job Search,<br/><span style={{ color: 'var(--primary)' }}>Commanded.</span>
      </h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: 500, margin: '0 auto 40px' }}>
        Track every application, automate follow-ups, and optimize your resume in one unified terminal interface.
      </p>

      <button
        onClick={() => onAdd('applied')}
        style={{
          background: 'var(--primary)', color: 'var(--primary-text)',
          border: 'none', padding: '16px 48px',
          fontFamily: 'var(--font-main)', fontSize: '0.9rem',
          fontWeight: 700, letterSpacing: '0.12em', borderRadius: '4px',
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.2)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 255, 136, 0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.2)'; }}
      >
        [ + ADD FIRST APPLICATION ]
      </button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
      {QUICK_STEPS.map(step => (
        <div key={step.n} className="onboarding-step" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ 
              background: 'var(--primary)', color: 'var(--primary-text)', 
              width: 28, height: 28, borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 'bold'
            }}>{step.n}</span>
            <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>{step.title}</span>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: 1.6, margin: 0 }}>
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const KanbanBoard = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('applied');

  const openModal = (status) => {
    setModalStatus(status);
    setModalOpen(true);
  };

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => extractData(await api.get('/jobs')),
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }) => api.patch(`/jobs/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData(['jobs']);
      queryClient.setQueryData(['jobs'], old =>
        Array.isArray(old) ? old.map(job => job._id === id ? { ...job, status } : job) : old
      );
      return { previousJobs };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['jobs'], context.previousJobs);
      addToast('Failed to move job.', 'error');
    },
    onSuccess: (_data, { status }) => {
      addToast(`Moved to ${status.toUpperCase()}`, 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    mutation.mutate({ id: draggableId, status: destination.droppableId });
  };

  if (isLoading) return <div className="view-container"><KanbanSkeleton /></div>;
  if (isError) return <div className="view-container" style={{ color: 'var(--danger)', padding: '40px' }}>Failed to load jobs.</div>;

  if (jobs.length === 0) {
    return (
      <>
        <AddJobModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultStatus={modalStatus} />
        <WelcomeBanner onAdd={openModal} />
      </>
    );
  }

  return (
    <div className="view-container" style={{ padding: 0 }}>
      <AddJobModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultStatus={modalStatus} />

      <div className="kanban-scroll-wrapper">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-grid">
            {COLUMNS.map(column => {
              const columnJobs = jobs.filter(j => j.status === column.id);
              return (
                <div key={column.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    padding: '12px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)', borderBottom: `2px solid ${column.color}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '16px', borderRadius: '4px'
                  }}>
                    <span style={{ fontWeight: 'bold', color: column.color, fontSize: '0.8rem' }}>{column.label}</span>
                    <span style={{ color: columnJobs.length > 0 ? column.color : 'var(--text-dim)', fontSize: '0.75rem' }}>{columnJobs.length}</span>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1, minHeight: '300px', padding: '4px',
                          background: snapshot.isDraggingOver ? `${column.color}08` : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {columnJobs.length === 0 && !snapshot.isDraggingOver && (
                          <EmptyColumn color={column.color} status={column.label} onAdd={() => openModal(column.id)} />
                        )}

                        {columnJobs.map((job, index) => (
                          <JobCard key={job._id} job={job} index={index} accentColor={column.color} />
                        ))}
                        {provided.placeholder}

                        <button
                          className="btn"
                          style={{ width: '100%', marginTop: '8px', fontSize: '0.75rem', borderStyle: 'dashed', opacity: 0.5 }}
                          onClick={() => openModal(column.id)}
                        >
                          + ADD JOB
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
