import { Component } from 'react';
import { GameIcon } from './GameIcon.jsx';
import { TRAIT_ICONS } from './trait-data.js';

const PORTRAIT_ATLAS = `${import.meta.env.BASE_URL}portraits/personnel-atlas-v2.png`;
const PORTRAIT_COLUMNS = 8;
const PORTRAIT_ROWS = 8;
const PLAYER_PORTRAITS = 56;
const COACH_PORTRAITS = 8;
const BRAND_MARK = `${import.meta.env.BASE_URL}brand/afm-mark.svg`;

function stableIndex(value, count) {
  const text = String(value || 'afm26');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % count;
}

function atlasPosition(index) {
  const column = index % PORTRAIT_COLUMNS;
  const row = Math.floor(index / PORTRAIT_COLUMNS);
  return `${column * (100 / (PORTRAIT_COLUMNS - 1))}% ${row * (100 / (PORTRAIT_ROWS - 1))}%`;
}

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
          <div className="game-error-icon"><GameIcon name="warning" size={36} /></div>
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

function ovrClass(o) {
  if (o >= 90) return 'elite';
  if (o >= 85) return 'gold';
  if (o >= 78) return 'silver';
  if (o >= 70) return 'bronze';
  return '';
}

export function OvrPill({ ovr, className = '' }) {
  return <span className={`ovr ${ovrClass(ovr)} ${className}`.trim()} aria-label={`Overall rating ${ovr}`}>{ovr}</span>;
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
          background: 'transparent',
          display: 'grid', placeItems: 'center',
          flex: '0 0 auto', overflow: 'visible',
        }}
      >
        <img src={team.logo} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 1px 1px rgba(36,42,40,.24))' }} />
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
  const portrait = stableIndex(player.id || player.name, PLAYER_PORTRAITS);
  return (
    <div
      className="portrait-avatar"
      role="img"
      aria-label={`${player.name || 'Player'} portrait`}
      style={{
        width: size,
        height: size,
        '--portrait-image': `url(${PORTRAIT_ATLAS})`,
        '--portrait-position': atlasPosition(portrait),
        '--portrait-accent': team?.primary || '#404845',
      }}
    />
  );
}

export function CoachPortrait({ team, coach, size = 42, portraitIndex }) {
  if (!team) return null;
  const selected = Number.isFinite(portraitIndex) ? portraitIndex : coach?.portraitIndex;
  const portrait = Number.isFinite(selected)
    ? 48 + (Math.max(0, Math.min(15, selected)) % 16)
    : PLAYER_PORTRAITS + stableIndex(team.id || team.name, COACH_PORTRAITS);
  return (
    <div
      className="portrait-avatar coach-portrait"
      role="img"
      aria-label={`${coach?.firstName || team.city} ${coach?.lastName || team.name} coach portrait`}
      style={{
        width: size,
        height: size,
        '--portrait-image': `url(${PORTRAIT_ATLAS})`,
        '--portrait-position': atlasPosition(portrait),
        '--portrait-accent': team.primary || '#404845',
      }}
    />
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

export function TraitBadge({ trait }) {
  const icon = TRAIT_ICONS[trait] || '•';
  const label = trait.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-stamp)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      background: 'var(--turf-2)', color: 'var(--ink-2)',
      border: '1px solid var(--line-1)',
      whiteSpace: 'nowrap',
    }}>
      <GameIcon name={icon} size={13} /> {label}
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

export function Sidebar({ active, onNav, team, coach, onCoachOpen, season, week, lastSaved, onSave, onExit }) {
  const sections = [
    {
      label: 'Team',
      items: [
        { id: 'dashboard', label: 'HQ' },
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
    <aside
      className="sidebar"
      style={{ '--team-primary': team?.primary || '#404845', '--team-secondary': team?.secondary || '#E9E2D2' }}
    >
      <div className="brand">
        <div className="brand-mark"><img src={BRAND_MARK} alt="" /></div>
        <div>
          <div className="brand-text">AFM</div>
          <div className="brand-sub">Season {season || 1} · Wk {(week || 0) + 1}</div>
        </div>
      </div>

      {team && (
        <button type="button" className="team-card" onClick={onCoachOpen} aria-label="Open coach career profile">
          <CoachPortrait team={team} coach={coach} size={38} />
          <div className="team-card-text">
            <div className="city">{coach ? `${coach.firstName} ${coach.lastName}` : team.city}</div>
            <div className="name">{team.city} {team.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ font: '700 14px var(--font-mono)' }}>{team.w ?? 0}-{team.l ?? 0}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{team.confRank ? `${team.confRank} ${team.conf}` : team.conf}</div>
          </div>
        </button>
      )}

      <nav>
        {sections.map(sec => (
          <div className="nav-section" key={sec.label}>
            <div className="nav-section-label">{sec.label}</div>
            {sec.items.map(it => (
              <button
                key={it.id}
                className={`nav-item ${active === it.id ? 'active' : ''}`}
                onClick={() => onNav(it.id)}
                type="button"
              >
                <span>{it.label}</span>
                {it.badge && (
                  <span className="nav-badge">{it.badge}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="footer">
        {onSave && onExit ? (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>Save</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onExit}>Exit</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{lastSaved ? `Saved · ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}</span>
              <span>v0.1</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Autosaved · just now</span>
            <span>v0.1</span>
          </div>
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

export function Topbar({ crumb, title, pill, actions, className = '' }) {
  return (
    <div className={`topbar ${className}`.trim()}>
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
