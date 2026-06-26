'use client';
// Client Component: holds React Context, which requires runtime (no server equivalent).

import { createContext, useContext } from 'react';
import type { SessionPayload } from '@/lib/auth';

type Session = SessionPayload;

interface AuthContextValue {
  session: Session;
  token: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  session: Session;
  token: string;
  children: React.ReactNode;
}

export function AuthProvider({ session, token, children }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ session, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
