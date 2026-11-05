import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../supabase.js';

const AuthContext = createContext(null);
const OFFLINE_KEY = 'afm26_offline_mode';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [offline, setOffline] = useState(() => localStorage.getItem(OFFLINE_KEY) === 'true');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }
    let active = true;
    let subscription;
    getSupabase().then(async (supabase) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      setSession(sessionData.session ?? null);
      setLoading(false);
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
        if (nextSession) {
          localStorage.removeItem(OFFLINE_KEY);
          setOffline(false);
        }
      });
      subscription = data.subscription;
    });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    offline,
    profileId: session?.user?.id ?? (offline ? 'offline' : null),
    async sendMagicLink(email) {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
      });
      if (error) throw error;
    },
    async signInWithGoogle() {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
      });
      if (error) throw error;
    },
    continueOffline() {
      localStorage.setItem(OFFLINE_KEY, 'true');
      setOffline(true);
    },
    async signOut() {
      const supabase = await getSupabase();
      if (supabase && session) await supabase.auth.signOut();
      localStorage.removeItem(OFFLINE_KEY);
      setOffline(false);
      setSession(null);
    },
  }), [loading, offline, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
