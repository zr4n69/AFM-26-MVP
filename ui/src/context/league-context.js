import { createContext, useContext } from 'react';

export const LeagueContext = createContext(null);

export function useLeague() {
  const context = useContext(LeagueContext);
  if (!context) throw new Error('useLeague must be used within LeagueProvider');
  return context;
}
