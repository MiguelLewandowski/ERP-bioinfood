'use client';
// Client Component: holds React Context, which requires runtime (no server equivalent).

import { createContext, useContext } from 'react';
import type { SessionPayload } from '@/lib/auth';

type Session = SessionPayload;

interface AuthContextValue {
  session: Session;
  /**
   * Sempre string vazia no navegador — mantido só para não reescrever as ~100
   * chamadas `api.get(path, token)` das telas.
   *
   * O access token não circula mais no client: o S3 de docs/analise-seguranca.md
   * foi fechado movendo as chamadas do navegador para `/api/proxy`, que lê o
   * cookie httpOnly no servidor. Se algum código passar a depender do valor
   * daqui, é sinal de que voltou a chamar a API direto — o que reabre o furo.
   */
  token: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  session: Session;
  /** Só os testes passam valor aqui. Em produção fica vazio — ver AuthContextValue. */
  token?: string;
  children: React.ReactNode;
}

export function AuthProvider({ session, token = '', children }: AuthProviderProps) {
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
