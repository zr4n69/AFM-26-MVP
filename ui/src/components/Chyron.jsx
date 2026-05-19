import { useLeague } from '../context/LeagueContext.jsx';

const TICKER_ITEMS = [
  { tag: 'TRADE', text: 'Memphis Kings acquire WR depth before deadline' },
  { tag: 'INJURY', text: 'Portland Stags QB questionable for Week 9' },
  { tag: 'RECAP', text: 'Austin Founders defeat Omaha Steel 24-17 in OT thriller' },
  { tag: 'DRAFT', text: 'Top prospect Marcus Langford declares for 2027 draft' },
  { tag: 'FA', text: 'Free agent CB Devon Lawson drawing interest from 4 teams' },
  { tag: 'STATS', text: 'League rushing leaders through Week 8 updated' },
  { tag: 'AWARD', text: 'MVP race tightens as two QBs separate from the pack' },
  { tag: 'TRADE', text: 'Birmingham Vulcans exploring moves at EDGE position' },
  { tag: 'RECAP', text: 'Salt Lake Summit extend win streak to 5 games' },
  { tag: 'INJURY', text: 'Raleigh Redwoods RB placed on injured reserve' },
];

export function Chyron({ season, week }) {
  // Duplicate items for seamless marquee loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="chyron">
      <div className="chyron-brand">AFL</div>
      <div className="chyron-track-wrap">
        <div className="chyron-track">
          {items.map((item, i) => (
            <div key={i} className="chyron-item">
              <span className="chyron-tag">{item.tag}</span>
              <span className="chyron-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chyron-clock">
        S{season || 1} W{(week || 0) + 1}
      </div>
    </div>
  );
}
