import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import Sidebar from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { BreadcrumbProvider } from '@/components/layout/breadcrumb-context';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ConfirmProvider } from '@/components/providers/confirm-provider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  return (
    <AuthProvider session={session} token={token}>
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
