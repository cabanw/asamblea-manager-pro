import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

export type AppRole = 'user' | 'admin' | 'assembly_sergeant';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isAssemblySergeant: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
