'use client';
// Client Component: holds React Context, which requires runtime (no server equivalent).

import { createContext, useContext } from 'react';
import type { SessionPayload } from '@/lib/auth';

type Session = SessionPayload;

interface AuthContextValue {
  session: Session;
  // TRADEOFF DE SEGURANÇA DELIBERADO (ver docs/analise-seguranca.md S3):
  // o access token é lido do cookie httpOnly no server (layout.tsx) e injetado
  // aqui para o client chamar a API :3001 direto com `Bearer`. Isso torna o
  // token legível pelo JS da página (viaja no payload RSC) — o httpOnly do
  // cookie NÃO protege contra XSS neste caminho. É aceito por ser app interno
  // (~12 usuários), mas: (1) nunca colocar dado sensível de cliente externo a
  // um XSS de distância disto; (2) se a superfície crescer, mover as chamadas
  // do client para um proxy BFF e manter o token só em cookie.
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
