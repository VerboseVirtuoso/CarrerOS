import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { extractData } from '../utils/api';

const STOP_WORDS = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'of', 'from', 'as', 'by', 'it', 'this', 'that', 'which']);

const ResumeScorer = () => {
  const queryClient = useQueryClient();
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [results, setResults] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('');

  // Fetch jobs for the dropdown
  const { data: jobs = [], isError: jobsError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => extractData(await api.get('/jobs')),
  });

  const saveScoreMutation = useMutation({
    mutationFn: async ({ id, score }) => api.patch(`/jobs/${id}/score`, { score }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      alert('Score saved successfully.');
    },
    onError: (err) => {
      alert(`Failed to save score: ${err?.response?.data?.error || err.message}`);
    }
  });

  const tokenize = (text) => {
    return text.toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter(token => token && token.length > 2 && !STOP_WORDS.has(token));
  };

  const handleAnalyze = () => {
    const jdTokens = Array.from(new Set(tokenize(jd)));
    const resumeTokens = new Set(tokenize(resume));

    if (jdTokens.length === 0) return;

    const matched = jdTokens.filter(token => resumeTokens.has(token));
    const missing = jdTokens.filter(token => !resumeTokens.has(token));
    const score = Math.round((matched.length / jdTokens.length) * 100);

    setResults({ matched, missing, score, total: jdTokens.length });
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#00ff88'; // green
    if (score >= 40) return '#f0c040'; // yellow
    return '#ff5555'; // red
  };

  return (
    <div className="view-container">
      <h2 style={{ color: 'var(--primary)', marginBottom: '8px' }}>[ RESUME_MATCH_SCORER ]</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '32px' }}>Paste the job description on the left and your resume keywords or full text on the right to see how well you match.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div>
          <label style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>
            &gt; JOB_DESCRIPTION
          </label>
          <textarea 
            className="terminal-border"
            style={{ width: '100%', height: '200px', background: 'var(--bg-color)', color: 'var(--text-main)', padding: '12px', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste JD here..."
          />
        </div>
        <div>
          <label style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>
            &gt; RESUME_KEYWORDS_SKILLS
          </label>
          <textarea 
            className="terminal-border"
            style={{ width: '100%', height: '200px', background: 'var(--bg-color)', color: 'var(--text-main)', padding: '12px', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste skills or resume text here..."
          />
        </div>
      </div>

      <button className="btn" onClick={handleAnalyze} style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px' }}>
        [ RUN MATCH ANALYSIS ]
      </button>

      {results && (
        <div style={{ marginTop: '40px', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'center' }}>
            {/* SVG Ring */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#222" strokeWidth="8" />
                <circle 
                  cx="60" cy="60" r="54" fill="none" 
                  stroke={getScoreColor(results.score)} 
                  strokeWidth="8"
                  strokeDasharray="339.29"
                  strokeDashoffset={339.29 - (339.29 * results.score) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(results.score) }}>{results.score}%</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>MATCH</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <StatBox label="MATCHED" val={results.matched.length} color="#00ff88" />
              <StatBox label="MISSING" val={results.missing.length} color="#ff5555" />
              <StatBox label="TOTAL_JD" val={results.total} color="var(--text-dim)" />
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h4 style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '12px' }}>&gt; KEYWORD_DETAILS</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {results.matched.map(kw => <Chip key={kw} kw={kw} color="#00ff88" />)}
              {results.missing.map(kw => <Chip key={kw} kw={kw} color="#ff5555" />)}
            </div>
            
            {results.missing.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: '#1a1a1a', padding: '12px', borderLeft: '2px solid var(--warning)', borderRadius: '0 4px 4px 0' }}>
                <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>💡 TIP:</span> Try adding <strong>{results.missing.slice(0, 3).join(', ')}</strong> to your resume to improve your match score.
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(0,255,136,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '16px' }}>&gt; PERSIST_SCORE</h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                style={{ flex: 1, background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '8px', fontFamily: 'inherit', borderRadius: '4px' }}
              >
                <option value="">-- SELECT JOB --</option>
                {jobs.map(job => (
                  <option key={job._id} value={job._id}>{job.company} — {job.role}</option>
                ))}
              </select>
              <button 
                className="btn" 
                disabled={!selectedJobId}
                onClick={() => saveScoreMutation.mutate({ id: selectedJobId, score: results.score })}
              >
                [ SAVE SCORE ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, val, color }) => (
  <div style={{ textAlign: 'center', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '4px' }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color }}>{val}</div>
  </div>
);

const Chip = ({ kw, color }) => (
  <span style={{ 
    fontSize: '0.7rem', 
    color, 
    border: `1px solid ${color}`, 
    padding: '2px 8px', 
    borderRadius: '12px',
    background: `${color}11`
  }}>
    {kw}
  </span>
);

export default ResumeScorer;
