import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Access } from '@/lib/types';
import { AuthContext, type AuthValue } from '@/context/auth-context';

async function fetchAccess(): Promise<Access | null> {
  const { data, error } = await supabase.rpc('get_my_access');
  if (error) throw error;
  return (data as Access | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [accessError, setAccessError] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentSession = useRef<Session | null>(null);
  const revision = useRef(0);
  const mounted = useRef(false);

  const loadAccess = useCallback(async () => {
    if (!mounted.current || !currentSession.current) return null;
    const request = ++revision.current;
    setAccess(null);
    setAccessError(false);
    setLoading(true);
    try {
      const next = await fetchAccess();
      if (!mounted.current || request !== revision.current) return null;
      setAccess(next);
      return next;
    } catch {
      if (mounted.current && request === revision.current) {
        setAccess(null);
        setAccessError(true);
      }
      return null;
    } finally {
      if (mounted.current && request === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    mounted.current = true;

    function invalidateAccess() { revision.current++; }

    function applySession(next: Session | null) {
      if (!active) return;
      // Invalidate outstanding rights immediately, including on user switches.
      invalidateAccess();
      currentSession.current = next;
      setSession(next);
      setAccess(null);
      setAccessError(false);
      setLoading(!!next);
      if (timer !== undefined) clearTimeout(timer);
      // Never make a Supabase request while its Auth event lock is held.
      if (next) timer = setTimeout(() => { void loadAccess(); }, 0);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedAuthEvent = true;
      applySession(next);
    });

    // An Auth event always wins over an older initial-session response.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) throw error;
      applySession(data.session);
    }).catch(() => {
      if (!active || receivedAuthEvent) return;
      applySession(null);
      setAccessError(true);
    });

    return () => {
      active = false;
      mounted.current = false;
      invalidateAccess();
      if (timer !== undefined) clearTimeout(timer);
      subscription.subscription.unsubscribe();
    };
  }, [loadAccess]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    revision.current++;
    currentSession.current = null;
    setSession(null);
    setAccess(null);
    setAccessError(false);
    setLoading(false);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, access, accessError, loading, loadAccess, signOut }),
    [session, access, accessError, loading, loadAccess, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
