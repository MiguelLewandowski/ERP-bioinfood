import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { BreadcrumbProvider } from '@/components/layout/breadcrumb-context';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ConfirmProvider } from '@/components/providers/confirm-provider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');

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
