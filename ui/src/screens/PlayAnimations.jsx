/**
 * PlayAnimations — broadcast-style event overlays for the live sim field.
 * Triggered by drive results, layered absolutely over the field container.
 * All animations are CSS-only (transforms/opacity), skippable, and reduced-motion safe.
 */
import { useEffect, useRef, useState } from 'react';

// ── Durations (ms) ────────────────────────────────────────────────
const DURATIONS = {
  touchdown:       2100,
  fieldGoal:       1600,
  safety:          1900,
  turnover:        1500,
  turnoverOnDowns: 1200,
  sack:            1100,
  bigPlay:          900,
};

// ── Classify a drive into an animation event ───────────────────────
function classify(drive) {
  if (!drive) return null;
  const r = drive.result;
  if (r === 'TD')                          return { type: 'touchdown',       label: 'TOUCHDOWN',        sub: `+${drive.points || 7}` };
  if (r === 'FG')                          return { type: 'fieldGoal',       label: 'FIELD GOAL',       sub: '+3' };
  if (r === 'SAF')                         return { type: 'safety',          label: 'SAFETY',           sub: '+2' };
  if (r === 'INT')                         return { type: 'turnover',        label: 'INTERCEPTION',     sub: '' };
  if (r === 'FUM')                         return { type: 'turnover',        label: 'FUMBLE',           sub: '' };
  if (r === 'TO')                          return { type: 'turnover',        label: 'TURNOVER',         sub: '' };
  if (r === 'TOD')                         return { type: 'turnoverOnDowns', label: 'TURNOVER ON DOWNS',sub: '' };
  if (r === 'SACK')                        return { type: 'sack',            label: 'SACK',             sub: `${drive.yards} YDS` };
  if (drive.yards >= 40 && drive.points === 0) return { type: 'bigPlay',    label: 'BIG PLAY',         sub: `+${drive.yards} YDS` };
  return null;
}

// ── Keyframe injection (once per app lifetime) ─────────────────────
const CSS = `
@keyframes afm-banner {
  0%   { transform: scaleY(0) translateY(-30%); opacity: 0; }
  14%  { transform: scaleY(1) translateY(0);    opacity: 1; }
  72%  { transform: scaleY(1) translateY(0);    opacity: 1; }
  100% { transform: scaleY(0) translateY(-30%); opacity: 0; }
}
@keyframes afm-sweep {
  0%   { transform: scaleX(0) translateZ(0); opacity: .7; }
  45%  { transform: scaleX(1) translateZ(0); opacity: .45; }
  100% { transform: scaleX(1) translateZ(0); opacity: 0;  }
}
@keyframes afm-logo {
  0%   { transform: scale(.55); opacity: 0; }
  22%  { transform: scale(1.1); opacity: 1; }
  62%  { transform: scale(1);   opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes afm-ring {
  0%   { transform: scale(.5);  opacity: .85; }
  100% { transform: scale(2.2); opacity: 0;   }
}
@keyframes afm-glitch {
  0%,100%{ clip-path:none; }
  18%    { clip-path:inset(20% 0 55% 0); transform:translateX(-5px); }
  36%    { clip-path:inset(52% 0 18% 0); transform:translateX(5px);  }
  54%    { clip-path:inset(8%  0 74% 0); transform:translateX(-3px); }
  72%    { clip-path:none; transform:translateX(0); }
}
@keyframes afm-endzone {
  0%   { opacity: .7; }
  100% { opacity: 0; }
}
@keyframes afm-streak {
  0%   { width:0;    opacity:.85; }
  55%  { width:100%; opacity:.65; }
  100% { width:100%; opacity:0;   }
}
@keyframes afm-sack-ring {
  0%   { transform:scale(.3);  opacity:.9; border-width:6px; }
  100% { transform:scale(1.8); opacity:0;  border-width:1px; }
}
@media (prefers-reduced-motion: reduce) {
  [data-afm-anim] { animation-duration: 0.1ms !important; }
}
`;
let _injected = false;
function injectCSS() {
  if (_injected) return;
  _injected = true;
  const el = document.createElement('style');
  el.dataset.afmAnim = '1';
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Primitive overlay pieces ───────────────────────────────────────

function ColorSweep({ primary, duration }) {
  return (
    <div data-afm-anim style={{
      position: 'absolute', inset: 0, transformOrigin: 'left center', pointerEvents: 'none', zIndex: 1,
      background: `linear-gradient(90deg, transparent 5%, ${primary}50 50%, transparent 95%)`,
      animation: `afm-sweep ${duration * .9}ms ease-out forwards`,
    }} />
  );
}

function Banner({ label, sub, primary, duration }) {
  return (
    <div data-afm-anim style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3,
    }}>
      <div data-afm-anim style={{
        animation: `afm-banner ${duration}ms cubic-bezier(.22,.9,.46,1) forwards`,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 'clamp(22px,4.5vw,44px)', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#fff', lineHeight: 1,
          padding: '10px 28px 8px',
          background: `linear-gradient(135deg, rgba(6,10,14,.92) 0%, ${primary}28 100%)`,
          border: `2px solid ${primary}`,
          textShadow: `0 0 32px ${primary}CC, 0 2px 10px rgba(0,0,0,.95)`,
          backdropFilter: 'blur(6px)',
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
            color: primary, letterSpacing: '0.1em', marginTop: 7,
            textShadow: `0 0 14px ${primary}`,
          }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function LogoFlash({ logo, primary, duration }) {
  if (!logo) return null;
  return (
    <div data-afm-anim style={{
      position: 'absolute', top: '12%', right: '10%',
      width: 60, height: 60, zIndex: 4, pointerEvents: 'none',
      animation: `afm-logo ${duration * .88}ms ease-in-out forwards`,
    }}>
      <img src={logo} alt="" style={{
        width: '100%', height: '100%', objectFit: 'contain',
        filter: `drop-shadow(0 0 18px ${primary}) drop-shadow(0 0 6px ${primary})`,
      }} />
    </div>
  );
}

function PulseRings({ color, count = 2 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-afm-anim style={{
          position: 'absolute',
          width: 72, height: 72, borderRadius: '50%',
          border: `3px solid ${color}`,
          animation: `afm-ring 1.2s ease-out ${i * 200}ms forwards`,
        }} />
      ))}
    </div>
  );
}

function EndZoneGlow({ primary }) {
  return (
    <div data-afm-anim style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: '22%', zIndex: 1, pointerEvents: 'none',
      background: `linear-gradient(to left, ${primary}70, transparent)`,
      animation: 'afm-endzone 2s ease-out forwards',
    }} />
  );
}

function GlitchLayer({ color }) {
  return (
    <div data-afm-anim style={{
      position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
      background: `repeating-linear-gradient(0deg, ${color}12 0 1px, transparent 1px 4px)`,
      animation: 'afm-glitch .45s steps(1) forwards',
    }} />
  );
}

function BigPlayStreak({ primary }) {
  return (
    <div data-afm-anim style={{
      position: 'absolute', top: '44%', left: 0, height: 5, zIndex: 2, pointerEvents: 'none',
      background: `linear-gradient(to right, ${primary}CC, ${primary}00)`,
      animation: 'afm-streak .9s ease-out forwards',
    }} />
  );
}

function SackRing() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
      <div data-afm-anim style={{
        position: 'absolute', width: 64, height: 64, borderRadius: '50%',
        border: '6px solid #E15A2A',
        animation: 'afm-sack-ring 1s ease-out forwards',
      }} />
    </div>
  );
}

// ── Main overlay ───────────────────────────────────────────────────
export function PlayAnimationOverlay({ currentDrive, team, opp, paused }) {
  const [anim, setAnim] = useState(null);
  const lastNumRef = useRef(-1);
  const timerRef = useRef(null);

  useEffect(() => { injectCSS(); }, []);

  useEffect(() => {
    if (!currentDrive || paused) return;
    if (currentDrive.num === lastNumRef.current) return;
    lastNumRef.current = currentDrive.num;

    const evt = classify(currentDrive);
    if (!evt) return;

    // Which team gets the color treatment
    const isDefensivePlay = evt.type === 'turnover' || evt.type === 'turnoverOnDowns' || evt.type === 'sack';
    let activeTeam;
    if (isDefensivePlay) {
      activeTeam = currentDrive.team === 'us' ? opp : team;
    } else if (currentDrive.scoringTeam) {
      activeTeam = currentDrive.scoringTeam === 'us' ? team : opp;
    } else {
      activeTeam = currentDrive.team === 'us' ? team : opp;
    }

    const duration = DURATIONS[evt.type] || 1400;
    setAnim({ ...evt, activeTeam, duration });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAnim(null), duration + 120);
    return () => clearTimeout(timerRef.current);
  }, [currentDrive, paused, team, opp]);

  if (!anim) return null;

  const { type, label, sub, activeTeam, duration } = anim;
  const primary = activeTeam?.primary || '#C7FF3E';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit' }}>
      <ColorSweep primary={primary} duration={duration} />

      {type === 'touchdown' && <EndZoneGlow primary={primary} />}
      {type === 'touchdown' && <PulseRings color={primary} count={2} />}
      {type === 'safety'    && <PulseRings color="#C0392B" count={2} />}
      {type === 'fieldGoal' && <PulseRings color={primary} count={1} />}
      {type === 'turnover'  && <GlitchLayer color={primary} />}
      {type === 'bigPlay'   && <BigPlayStreak primary={primary} />}
      {type === 'sack'      && <SackRing />}

      {(type === 'touchdown' || type === 'fieldGoal' || type === 'safety') && (
        <LogoFlash logo={activeTeam?.logo} primary={primary} duration={duration} />
      )}

      <Banner label={label} sub={sub} primary={primary} duration={duration} />
    </div>
  );
}
