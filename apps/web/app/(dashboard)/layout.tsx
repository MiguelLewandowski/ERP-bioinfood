import { redirect } from 'next/navigation';
import { getSessionState } from '@/lib/auth';
import Sidebar from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { BreadcrumbProvider } from '@/components/layout/breadcrumb-context';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ConfirmProvider } from '@/components/providers/confirm-provider';
import { SessionRefreshGate } from '@/components/providers/session-refresh-gate';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  // Sem sessão nenhuma → login. Access token expirado mas refresh válido →
  // renova no cliente e re-renderiza, em vez de derrubar pro login.
  if (state.status === 'anonymous') redirect('/');
  if (state.status === 'refreshable') return <SessionRefreshGate />;
  const { session } = state;

  // O access token NÃO é injetado aqui de propósito: no navegador as chamadas
  // vão por /api/proxy, que lê o cookie httpOnly no servidor. Passar o token
  // para o provider o colocaria no payload RSC, legível por qualquer JS da
  // página — era exatamente o achado S3 de docs/analise-seguranca.md.
  return (
    <AuthProvider session={session}>
      <ConfirmProvider>
        <BreadcrumbProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar session={session} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 overflow-y-auto bg-muted/40">
                {children}
              </main>
            </div>
          </div>
        </BreadcrumbProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}
