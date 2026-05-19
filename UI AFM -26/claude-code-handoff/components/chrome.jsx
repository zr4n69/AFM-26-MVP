// AFM-26 — Shared chrome: Sidebar, Topbar, helpers
// Exposes: Sidebar, Topbar, OvrPill, StarRow, FatigueBar, Stars, TeamBlock, ColorBlock, Avatar, formatM

const { useState, useEffect, useMemo, useRef } = React;

// ---------- Helpers ----------
function formatM(v) {
  if (v == null) return '—';
  if (Math.abs(v) >= 100) return `$${Math.round(v)}M`;
  return `$${(Math.round(v * 10) / 10).toFixed(1)}M`;
}
function ovrClass(o) {
  if (o >= 90) return 'elite';
  if (o >= 85) return 'gold';
  if (o >= 78) return 'silver';
  if (o >= 70) return 'bronze';
  return '';
}
function OvrPill({ ovr }) {
  return <span className={`ovr ${ovrClass(ovr)}`}>{ovr}</span>;
}
function Stars({ n, max = 5 }) {
  return (
    <span className="stars" aria-label={`${n} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < n ? 'on' : ''}`}>★</span>
      ))}
    </span>
  );
}
function ColorBlock({ team, size = 28 }) {
  if (!team) return null;
  if (team.logo) {
    return (
      <div
        className="team-color-block"
        style={{
          width: size, height: size, borderRadius: Math.max(4, size * 0.18),
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
        width: size, height: size,
        background: `linear-gradient(135deg, ${team.primary} 0%, ${team.primary} 60%, ${team.secondary} 60%, ${team.secondary} 100%)`,
      }}
    />
  );
}
function TeamBlock({ team, size = 28, showName = true, compact = false }) {
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
function Avatar({ player, team, size = 36 }) {
  // Initial-based avatar in team color
  const initials = `${player.first[0]}${player.last[0]}`;
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flex: '0 0 auto',
      background: `linear-gradient(135deg, ${team.primary} 0%, ${team.primary} 50%, ${team.secondary} 50%, ${team.secondary} 100%)`,
      display: 'grid', placeItems: 'center',
      color: 'white', font: `700 ${size * 0.36}px var(--font-display)`,
      letterSpacing: '0.02em',
    }}>{initials}</div>
  );
}
function FatigueBar({ value }) {
  return (
    <div className="bar fatigue" style={{ width: 64 }} title={`Fatigue ${value}`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
function InjBadge({ status }) {
  if (!status) return <span className="badge healthy">Healthy</span>;
  const map = { Q: 'Questionable', D: 'Doubtful', O: 'Out' };
  return <span className={`badge ${status.toLowerCase()}`}>{map[status]}</span>;
}

// ---------- Sidebar ----------
function Sidebar({ active, onNav, alerts }) {
  const team = window.AFL.userTeam;
  const sections = [
    {
      label: 'Team',
      items: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'roster', label: 'Roster', badge: '55' },
        { id: 'depth', label: 'Depth Chart' },
        { id: 'strategy', label: 'Strategy' },
        { id: 'contracts', label: 'Contracts & Cap' },
        { id: 'training', label: 'Training' },
      ],
    },
    {
      label: 'Game Week',
      items: [
        { id: 'gameweek', label: 'Game Week', badge: 'WK 9' },
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
          <div className="brand-sub">Season 2026 · Wk 9</div>
        </div>
      </div>

      <div className="team-card">
        <ColorBlock team={team} size={32} />
        <div className="team-card-text">
          <div className="city">{team.city}</div>
          <div className="name">{team.name}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ font: '700 14px var(--font-mono)' }}>{team.w}-{team.l}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>1st West</div>
        </div>
      </div>

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
                {it.badge && <span className="badge-x" />}
                {it.badge && <span className="badge-num" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: active === it.id ? 'rgba(255,255,255,0.15)' : 'var(--bg-3)', color: active === it.id ? 'white' : 'var(--ink-3)' }}>{it.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="footer">
        <span>Autosaved · just now</span>
        <span>v0.1</span>
      </div>
    </aside>
  );
}

// ---------- Topbar ----------
function Topbar({ crumb, title, actions }) {
  return (
    <div className="topbar">
      <div>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>
      <div className="spacer" />
      <div className="week-pill"><span className="dot" />Wk 9 · vs SD Surge · Sun 1:00</div>
      {actions}
    </div>
  );
}

// Field diagram
function FieldDiagram({ losYard = 35, possessionLeft = true }) {
  // losYard is 0-100, where 0 = own goalline, 100 = opp goalline
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

Object.assign(window, {
  formatM, ovrClass, OvrPill, Stars, ColorBlock, TeamBlock, Avatar, FatigueBar, InjBadge,
  Sidebar, Topbar, FieldDiagram,
});
