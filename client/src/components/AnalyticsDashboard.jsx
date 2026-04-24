import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

// ─── Colour palette (matches app design tokens) ───────────────────────────────
const C = {
  applied:   '#378ADD',
  screening: '#f0c040',
  interview: '#aa88ff',
  offer:     '#00ff88',
  rejected:  '#ff5555',
  primary:   '#00ff88',
  dim:       '#2a2a2a',
  textDim:   '#555',
};

const SOURCE_LABEL = {
  linkedin: 'LinkedIn',
  referral: 'Referral',
  cold:     'Cold Outreach',
  jobboard: 'Job Board',
  other:    'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.getTime();
}

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cpX = (x0 + x1) / 2;
    d += ` C ${cpX} ${y0}, ${cpX} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = C.primary, pulse = false }) => (
  <div style={{
    background: '#111',
    border: `1px solid ${C.dim}`,
    borderTop: `2px solid ${color}`,
    borderRadius: '4px',
    padding: '18px 20px',
    flex: 1,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  }}>
    {pulse && (
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top left, ${color}10 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
    )}
    <div style={{ fontSize: '0.68rem', color: C.textDim, letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.68rem', color: C.textDim, marginTop: 6 }}>{sub}</div>}
  </div>
);

// ─── Area Chart — Applications over time ─────────────────────────────────────
const AreaChart = ({ weeks }) => {
  const W = 480, H = 120, PAD = { t: 12, r: 16, b: 28, l: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...weeks.map(w => w.count), 1);
  const step   = chartW / Math.max(weeks.length - 1, 1);

  const pts = weeks.map((w, i) => [
    PAD.l + i * step,
    PAD.t + chartH - (w.count / maxVal) * chartH,
  ]);

  const linePath  = smoothPath(pts);
  const areaPath  = pts.length
    ? `${linePath} L ${pts[pts.length - 1][0]} ${PAD.t + chartH} L ${pts[0][0]} ${PAD.t + chartH} Z`
    : '';

  const yTicks = [0, Math.round(maxVal / 2), maxVal].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.primary} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map(v => {
        const y = PAD.t + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1e1e1e" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill={C.textDim}>{v}</text>
          </g>
        );
      })}

      {/* X labels */}
      {weeks.map((w, i) => {
        const x = PAD.l + i * step;
        const d = new Date(w.ts);
        const lbl = `${d.getMonth() + 1}/${d.getDate()}`;
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill={C.textDim}>{lbl}</text>
        );
      })}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

      {/* Line */}
      {linePath && (
        <path d={linePath} fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#0d0d0d" stroke={C.primary} strokeWidth="2" />
          {weeks[i].count > 0 && (
            <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={C.primary} fontWeight="600">
              {weeks[i].count}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ─── Donut Chart — Status distribution ───────────────────────────────────────
const DonutChart = ({ slices }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  return (
    <svg viewBox="0 0 130 130" style={{ width: '100%', maxWidth: 160, display: 'block', margin: '0 auto' }}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#1a1a1a" strokeWidth="16" />
      {slices.map(({ label, value, color }) => {
        const dash   = (value / total) * circ;
        const gap    = circ - dash;
        const thisCx = offset;
        offset += dash;
        return (
          <circle
            key={label}
            cx="65" cy="65" r={r}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-thisCx}
            transform="rotate(-90 65 65)"
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        );
      })}
      <text x="65" y="60" textAnchor="middle" fontSize="18" fontWeight="700" fill={C.primary} fontFamily="IBM Plex Mono, monospace">
        {total}
      </text>
      <text x="65" y="74" textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="IBM Plex Mono, monospace">
        TOTAL
      </text>
    </svg>
  );
};

// ─── Horizontal Bar Chart — Source breakdown ─────────────────────────────────
const SourceBar = ({ label, count, max }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{ color: C.primary, fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${C.primary}88, ${C.primary})`,
          borderRadius: 3,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const AnalyticsSkeleton = () => (
  <div className="view-container">
    <h2 style={{ color: C.primary, marginBottom: 28, fontSize: '1.1rem' }}>[ ANALYTICS ]</h2>
    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ flex: 1, height: 90, borderRadius: 4 }} />
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 24 }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 4 }} />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const { data: jobsData, isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await api.get('/jobs');
      return Array.isArray(res.data) ? res.data : [];
    },
  });
  const jobs = Array.isArray(jobsData) ? jobsData : [];

  const analytics = useMemo(() => {
    if (!jobs.length) return null;

    // ── KPIs ────────────────────────────────────────────────────────────────
    const total     = jobs.length;
    const active    = jobs.filter(j => !['offer', 'rejected'].includes(j.status)).length;
    const offers    = jobs.filter(j => j.status === 'offer').length;
    const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0;

    // Avg days from applied → last activity for resolved jobs
    const resolved = jobs.filter(j => ['offer', 'rejected'].includes(j.status) && j.appliedAt && j.lastActivityAt);
    const avgDays  = resolved.length > 0
      ? Math.round(resolved.reduce((s, j) => s + (new Date(j.lastActivityAt) - new Date(j.appliedAt)) / 86400000, 0) / resolved.length)
      : null;

    // ── Weekly bins (last 9 weeks) ───────────────────────────────────────────
    const now = Date.now();
    const WEEKS = 9;
    const weekBins = Array.from({ length: WEEKS }, (_, i) => {
      const ts = now - (WEEKS - 1 - i) * 7 * 86400000;
      return { ts: weekStart(ts), count: 0 };
    });
    jobs.forEach(j => {
      if (!j.appliedAt) return;
      const ws = weekStart(j.appliedAt);
      const bin = weekBins.find(b => b.ts === ws);
      if (bin) bin.count++;
    });

    // ── Status slices ────────────────────────────────────────────────────────
    const statusSlices = Object.entries(C)
      .filter(([k]) => ['applied', 'screening', 'interview', 'offer', 'rejected'].includes(k))
      .map(([status, color]) => ({
        label: status,
        value: jobs.filter(j => j.status === status).length,
        color,
      }))
      .filter(s => s.value > 0);

    // ── Source counts ────────────────────────────────────────────────────────
    const sourceCounts = {};
    jobs.forEach(j => { sourceCounts[j.source || 'other'] = (sourceCounts[j.source || 'other'] || 0) + 1; });
    const sourceBars = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([src, count]) => ({ label: SOURCE_LABEL[src] || src, count }));
    const maxSource = Math.max(...sourceBars.map(s => s.count), 1);

    // ── Recent applications ──────────────────────────────────────────────────
    const recent = [...jobs]
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 6);

    return { total, active, offerRate, avgDays, weekBins, statusSlices, sourceBars, maxSource, recent, offers };
  }, [jobs]);

  if (isLoading) return <AnalyticsSkeleton />;
  if (isError)   return <div style={{ color: 'var(--danger)', padding: 40 }}>Failed to load analytics.</div>;

  if (!analytics || jobs.length === 0) {
    return (
      <div className="view-container">
        <h2 style={{ color: C.primary, marginBottom: 28, fontSize: '1.1rem' }}>[ ANALYTICS ]</h2>
        <div className="empty-state" style={{ maxWidth: 460, margin: '60px auto', padding: '40px' }}>
          <span className="empty-icon" style={{ fontSize: '2rem', marginBottom: 16 }}>📊</span>
          <div style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1rem', marginBottom: 8 }}>DATA_REQUIRED</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.6 }}>
            Add your first job application to unlock real-time tracking, pipeline metrics, and response rate analytics.
          </div>
        </div>
      </div>
    );
  }

  const { total, active, offerRate, avgDays, weekBins, statusSlices, sourceBars, maxSource, recent, offers } = analytics;

  const panelStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '20px 24px',
    boxShadow: 'var(--shadow)',
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ color: C.primary, fontSize: '1.1rem' }}>[ ANALYTICS ]</h2>
        <span style={{ fontSize: '0.68rem', color: C.textDim, letterSpacing: '0.06em' }}>
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <KpiCard label="TOTAL_APPLICATIONS"  value={total}                      sub={`${active} still active`}         color={C.primary}            pulse />
        <KpiCard label="OFFER_RATE"          value={`${offerRate}%`}            sub={`${offers} offer${offers !== 1 ? 's' : ''} received`} color={C['offer']} />
        <KpiCard label="PIPELINE_HEALTH"     value={`${Math.round((active / total) * 100)}%`} sub="non-rejected ratio"      color={C['screening']}       />
        <KpiCard label="AVG_RESPONSE_TIME"   value={avgDays !== null ? `${avgDays}d` : '—'} sub="applied → last activity" color={C['interview']}       />
      </div>

      {/* ── Area chart + Donut ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 24 }}>
        {/* Area Chart */}
        <div style={panelStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 14 }}>
            &gt; APPLICATIONS_OVER_TIME (weekly)
          </div>
          <div style={{ height: 140 }}>
            <AreaChart weeks={weekBins} />
          </div>
        </div>

        {/* Donut */}
        <div style={panelStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 14 }}>
            &gt; STATUS_DISTRIBUTION
          </div>
          <DonutChart slices={statusSlices} />
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
            {statusSlices.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ color: '#888' }}>{s.label.toUpperCase()}</span>
                <span style={{ color: s.color, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Source bars + Recent applications ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Source Breakdown */}
        <div style={panelStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
            &gt; APPLICATION_SOURCES
          </div>
          {sourceBars.length > 0 ? (
            sourceBars.map(s => <SourceBar key={s.label} label={s.label} count={s.count} max={maxSource} />)
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No source data</span>
          )}
        </div>

        {/* Recent Activity */}
        <div style={panelStyle}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
            &gt; RECENT_ACTIVITY
          </div>
          {recent.map(job => {
            const statusColor = C[job.status] || C.primary;
            const daysAgo     = job.appliedAt
              ? Math.floor((Date.now() - new Date(job.appliedAt)) / 86400000)
              : '?';
            return (
              <div key={job._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid #1a1a1a',
                gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: statusColor, fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.company}
                  </div>
                  <div style={{ color: '#444', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.role}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: statusColor, border: `1px solid ${statusColor}44`, padding: '1px 6px', borderRadius: 3 }}>
                    {job.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#333', marginTop: 3 }}>{daysAgo}d ago</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
