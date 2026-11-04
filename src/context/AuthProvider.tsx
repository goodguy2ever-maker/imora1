import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  const loadAccess = useCallback(async () => {
    try {
      const next = await fetchAccess();
      setAccess(next);
      setAccessError(false);
      return next;
    } catch {
      setAccess(null);
      setAccessError(true);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      (async () => {
        if (!active) return;
        setSession(data.session);
        if (data.session) await loadAccess();
        if (active) setLoading(false);
      })();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      (async () => {
        setSession(next);
        if (next) {
          await loadAccess();
        } else {
          setAccess(null);
          setAccessError(false);
        }
      })();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadAccess]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccess(null);
    setAccessError(false);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, access, accessError, loading, loadAccess, signOut }),
    [session, access, accessError, loading, loadAccess, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
