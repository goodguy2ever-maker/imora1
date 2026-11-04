import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Access } from '@/lib/types';

export type AuthValue = {
  session: Session | null;
  access: Access | null;
  accessError: boolean;
  loading: boolean;
  loadAccess: () => Promise<Access | null>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | undefined>(undefined);
