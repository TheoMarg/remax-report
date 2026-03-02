import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, UserProfile } from '../lib/types';

function extractProfile(user: User | null): UserProfile | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    role: (meta.role as UserRole) || 'anon',
    agentId: meta.agent_id ? Number(meta.agent_id) : null,
    email: user.email ?? '',
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setProfile(extractProfile(s?.user ?? null));
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setProfile(extractProfile(s?.user ?? null));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    profile,
    loading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  };
}
