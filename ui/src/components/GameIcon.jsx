const ICONS = {
  shield: <><path d="M12 3 19 6v5c0 4.7-2.5 7.8-7 10-4.5-2.2-7-5.3-7-10V6z" /><path d="m9 12 2 2 4-5" /></>,
  bandage: <><path d="m7.2 18.8-2-2a3 3 0 0 1 0-4.2l7.4-7.4a3 3 0 0 1 4.2 0l2 2a3 3 0 0 1 0 4.2l-7.4 7.4a3 3 0 0 1-4.2 0Z" /><path d="m9 9 6 6M9.4 14.6h.01M14.6 9.4h.01" /></>,
  captain: <><path d="m4 8 4.5 3.5L12 5l3.5 6.5L20 8l-1.2 9H5.2z" /><path d="M6 20h12" /></>,
  warning: <><path d="M12 4 21 20H3z" /><path d="M12 9v5M12 17.5v.01" /></>,
  bolt: <path d="m13.5 2-8 12h6l-1 8 8-12h-6z" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  flame: <><path d="M13 2c1 5-3 5-1 9 1.5-1 2.5-2.5 2-4 3 2 5 5 5 8a7 7 0 0 1-14 0c0-3 2-6 5-8-.5 3 1 4 2 4" /><path d="M12 21c-2 0-3.5-1.5-3.5-3.3 0-1.4.9-2.8 2.4-4.2.1 2 1.1 2.4 1.7 3.4.6-.5 1-1.3.9-2.1 1.3 1 2 2 2 3.2 0 1.7-1.4 3-3.5 3Z" /></>,
  gauge: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="m12 17 4-5M5 17h14" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  diamond: <><path d="m4 8 4-5h8l4 5-8 13z" /><path d="M4 8h16M8 3l4 5 4-5M8 8l4 13 4-13" /></>,
  draftBoard: <><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" /><path d="m7.5 9 .5.5 1-1M7.5 13l.5.5 1-1M7.5 17l.5.5 1-1" /></>,
  trophy: <><path d="M8 4h8v4c0 4-1.5 6-4 6s-4-2-4-6z" /><path d="M8 6H4c0 4 1.5 6 5 6M16 6h4c0 4-1.5 6-5 6M12 14v4M8 21h8M9 18h6" /></>,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
};

export function GameIcon({ name, size = 16, className = '', title }) {
  return (
    <svg
      className={`game-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
    >
      {title && <title>{title}</title>}
      {ICONS[name] || ICONS.dot}
    </svg>
  );
}
