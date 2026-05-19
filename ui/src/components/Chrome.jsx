import { Component } from 'react';

// ── Error Boundary ──────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--ink-4)', maxWidth: 420, margin: '0 auto 16px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="btn primary" onClick={() => this.setState({ error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function formatM(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 100) return `$${Math.round(v)}M`;
  return `$${(Math.round(v * 10) / 10).toFixed(1)}M`;
}

function ovrClass(o) {
  if (o >= 90) return 'tier-90';
  if (o >= 80) return 'tier-80';
  if (o >= 70) return 'tier-70';
  if (o >= 60) return 'tier-60';
  if (o >= 50) return 'tier-50';
  return '';
}

export function OvrPill({ ovr }) {
  return <span className={`ovr ${ovrClass(ovr)}`}>{ovr}</span>;
}

export function Stars({ n, max = 5 }) {
  return (
    <span className="stars" aria-label={`${n} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < n ? 'on' : ''}`}>★</span>
      ))}
    </span>
  );
}

export function ColorBlock({ team, size = 28 }) {
  if (!team) return null;
  const radius = Math.max(4, size * 0.18);
  if (team.logo) {
    return (
      <div
        className="team-color-block"
        style={{
          width: size, height: size, borderRadius: radius,
          background: team.primary,
          display: 'grid', placeItems: 'center',
          flex: '0 0 auto', overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
      >
        <img src={team.logo} alt={team.name} style={{ width: '82%', height: '82%', display: 'block' }} />
      </div>
    );
  }
  return (
    <div
      className="team-color-block"
      style={{
        width: size, height: size, borderRadius: radius,
        background: `linear-gradient(135deg, ${team.primary} 0%, ${team.primary} 60%, ${team.secondary} 60%, ${team.secondary} 100%)`,
        flex: '0 0 auto',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
    />
  );
}

export function TeamBlock({ team, size = 28, showName = true, compact = false }) {
  if (!team) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ColorBlock team={team} size={size} />
      {showName && (
        compact
          ? <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{team.abbr}</span>
          : <span><span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{team.city}</span> <span style={{ fontWeight: 700 }}>{team.name}</span></span>
      )}
    </span>
  );
}

export function Avatar({ player, team, size = 36 }) {
  if (!player) return null;
  const initials = `${(player.first || player.firstName || '')[0] || ''}${(player.last || player.lastName || '')[0] || ''}`;
  const pri = team?.primary || '#333';
  const sec = team?.secondary || '#999';
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flex: '0 0 auto',
      background: `linear-gradient(135deg, ${pri} 0%, ${pri} 50%, ${sec} 50%, ${sec} 100%)`,
      display: 'grid', placeItems: 'center',
      color: 'white', font: `700 ${size * 0.36}px var(--font-display)`,
      letterSpacing: '0.02em',
    }}>{initials}</div>
  );
}

export function FatigueBar({ value }) {
  return (
    <div className="bar fatigue" style={{ width: 64 }} title={`Fatigue ${value}`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function InjBadge({ status, weeksRemaining }) {
  if (!status || status === 'Healthy') return <span className="badge healthy">Healthy</span>;
  const map = { Q: 'Questionable', D: 'Doubtful', O: 'Out', Questionable: 'Questionable', Doubtful: 'Doubtful', Out: 'Out' };
  const cls = (status[0] || '').toLowerCase();
  const label = map[status] || status;
  const weeks = weeksRemaining ? ` (${weeksRemaining}wk)` : '';
  return <span className={`badge ${cls}`}>{label}{weeks}</span>;
}

const TRAIT_ICONS = {
  'clutch': '🎯', 'leader': '👑', 'bigPlaySpark': '⚡', 'ironMan': '🛡️',
  'durable': '🛡️', 'fragile': '🩹', 'motorRelentless': '🔥', 'filmJunkie': '📽️',
  'conservative': '🧊', 'speedster': '💨', 'powerBack': '💪', 'passRusher': '🌪️',
  'shutdown': '🔒', 'ballHawk': '🦅', 'routeTechnician': '✂️', 'fieldGeneral': '🎖️',
  'deepThreat': '🚀', 'possessionReceiver': '🧲', 'runStuffer': '🧱', 'zoneCoverage': '📡',
  'manCoverage': '🪞', 'blitzer': '💥', 'versatile': '🔄', 'rawTalent': '💎',
  'hardWorker': '🏋️', 'lazyPractice': '😴', 'teamPlayer': '🤝', 'locker room cancer': '⚠️',
  'streaky': '📈', 'consistent': '📊', 'mentor': '🎓', 'prankster': '🃏',
};

export function TraitBadge({ trait }) {
  const icon = TRAIT_ICONS[trait] || '•';
  const label = trait.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: 'var(--bg-3)', color: 'var(--ink-2)', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span> {label}
    </span>
  );
}

export function FieldDiagram({ losYard = 35, possessionLeft = true }) {
  const x = possessionLeft ? (10 + losYard * 0.8) : (10 + (100 - losYard) * 0.8);
  return (
    <div className="field" style={{ width: '100%' }}>
      <div className="endzone left" />
      <div className="endzone right" />
      {[20, 30, 40, 50, 60, 70, 80].map(p => (
        <div key={p} className="yardline" style={{ left: `${10 + (p / 100) * 80}%` }} />
      ))}
      {[20, 40, 50, 40, 20].map((label, i) => (
        <div key={i} className="yardlabel" style={{ left: `${18 + i * 16}%` }}>{label}</div>
      ))}
      <div className="ball" style={{ left: `${x}%` }} />
    </div>
  );
}

export function Sidebar({ active, onNav, team, season, week, lastSaved, onSave, onExit }) {
  const sections = [
    {
      label: 'Team',
      items: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'roster', label: 'Roster', badge: team ? `${team.roster?.length || 55}` : '55' },
        { id: 'depth', label: 'Depth Chart' },
        { id: 'strategy', label: 'Strategy' },
        { id: 'contracts', label: 'Contracts & Cap' },
        { id: 'training', label: 'Training' },
      ],
    },
    {
      label: 'Game Week',
      items: [
        { id: 'gameweek', label: 'Game Week', badge: `WK ${(week || 0) + 1}` },
        { id: 'standings', label: 'Standings' },
        { id: 'leaders', label: 'League Leaders' },
      ],
    },
    {
      label: 'Front Office',
      items: [
        { id: 'scouting', label: 'Scouting' },
        { id: 'draft', label: 'Draft' },
        { id: 'fa', label: 'Free Agency' },
        { id: 'trades', label: 'Trade Center' },
      ],
    },
    {
      label: 'League',
      items: [
        { id: 'awards', label: 'Awards' },
        { id: 'hof', label: 'Hall of Fame' },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">AFL</div>
        <div>
          <div className="brand-text">AFM-26</div>
          <div className="brand-sub">Season {season || 1} · Wk {(week || 0) + 1}</div>
        </div>
      </div>

      {team && (
        <div className="team-card">
          <ColorBlock team={team} size={32} />
          <div className="team-card-text">
            <div className="city">{team.city}</div>
            <div className="name">{team.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ font: '700 14px var(--font-mono)' }}>{team.w ?? 0}-{team.l ?? 0}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{team.confRank ? `${team.confRank} ${team.conf}` : team.conf}</div>
          </div>
        </div>
      )}

      <nav>
        {sections.map(sec => (
          <div className="nav-section" key={sec.label}>
            <div className="nav-section-label">{sec.label}</div>
            {sec.items.map(it => (
              <div
                key={it.id}
                className={`nav-item ${active === it.id ? 'active' : ''}`}
                onClick={() => onNav(it.id)}
              >
                <span>{it.label}</span>
                {it.badge && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 99,
                    background: active === it.id ? 'rgba(255,255,255,0.15)' : 'var(--bg-3)',
                    color: active === it.id ? 'white' : 'var(--ink-3)',
                  }}>{it.badge}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="footer">
        {onSave && onExit ? (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>Save</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onExit}>Exit</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{lastSaved ? `Saved · ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}</span>
              <span>v0.1</span>
            </div>
          </>
        ) : (
          <>
            <span>Autosaved · just now</span>
            <span>v0.1</span>
          </>
        )}
      </div>
    </aside>
  );
}

export function TradeChip({ name, detail, highlight, onRemove }) {
  return (
    <div style={{
      padding: '10px 12px', marginBottom: 8,
      background: highlight ? 'var(--accent-soft, #EEF0FF)' : 'var(--bg-2)',
      border: '1px solid ' + (highlight ? 'var(--accent, #5B6CF0)' : 'var(--line)'),
      borderRadius: 4, fontSize: 13,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <strong>{name}</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>{detail}</span>
        {onRemove && <span style={{ cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16 }} onClick={onRemove}>&times;</span>}
      </div>
    </div>
  );
}

export function Topbar({ crumb, title, pill, actions }) {
  return (
    <div className="topbar">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>
      <div className="spacer" />
      {pill && (
        <div className="week-pill"><span className="dot" />{pill}</div>
      )}
      {actions}
    </div>
  );
}
