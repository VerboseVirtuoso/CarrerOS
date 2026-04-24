import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import useAppStore from '../store/useAppStore';

const JobCard = ({ job, index, accentColor }) => {
  const { _id, company, role, appliedAt, lastActivityAt, status, source } = job;
  const openPanel = useAppStore(state => state.openPanel);

  // Calculate days since activity
  const baseDate = lastActivityAt || appliedAt;
  const daysSilent = baseDate
    ? Math.floor((Date.now() - new Date(baseDate).getTime()) / 86_400_000)
    : 0;

  const isSilent = daysSilent >= 7;
  const isOffer = status === 'offer';
  const isRejected = status === 'rejected';

  const dateStr = appliedAt
    ? new Date(appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <Draggable draggableId={_id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`terminal-border job-card ${snapshot.isDragging ? 'dragging' : ''}`}
          style={{
            ...provided.draggableProps.style,
            background: 'var(--card-bg)',
            marginBottom: '12px',
            padding: '12px',
            position: 'relative',
            opacity: isRejected ? 0.6 : 1,
            borderLeft: `3px solid ${isSilent ? 'var(--warning)' : accentColor}`,
            border: isOffer ? `1px solid var(--primary)` : undefined,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => openPanel(_id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ color: accentColor, fontWeight: '700', fontSize: '1.05rem', margin: 0, letterSpacing: '-0.02em' }}>
              {company}
            </h4>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {source && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', border: '1px solid var(--text-muted)', padding: '0px 4px', borderRadius: '3px' }}>
                  {source.toUpperCase()}
                </span>
              )}
              <span style={{ 
                fontSize: '0.65rem', 
                color: isSilent ? 'var(--warning)' : 'var(--text-dim)', 
                fontWeight: isSilent ? 'bold' : '400'
              }}>
                {daysSilent}d
              </span>
            </div>
          </div>
          
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '4px 0 14px 0', fontWeight: '500' }}>
            {role}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {dateStr}
            </span>
            <div className="hover-hint" style={{ fontSize: '0.6rem', color: accentColor, opacity: 0, transition: 'opacity 0.2s' }}>
              details →
            </div>
          </div>

          <style>{`
            .job-card:hover {
              border-color: ${accentColor};
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .job-card:hover .hover-hint {
              opacity: 0.8;
            }
            .job-card.dragging {
              box-shadow: 0 8px 24px rgba(0,0,0,0.8);
              transform: scale(1.02);
            }
          `}</style>
        </div>
      )}
    </Draggable>
  );
};

export default JobCard;
