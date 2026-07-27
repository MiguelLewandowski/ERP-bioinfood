import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChangePasswordForm from '@/components/auth/change-password-form';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const cookieStore = await cookies();
  const forced = cookieStore.get('must_change_password')?.value === '1';

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Image
              src="/logo/bio.png"
              alt="Bioinfood"
              width={1529}
              height={1624}
              priority
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Trocar senha</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {forced
              ? 'Por segurança, você precisa definir uma nova senha antes de continuar.'
              : 'Defina uma nova senha para sua conta.'}
          </p>
        </div>
        <ChangePasswordForm forced={forced} />
      </div>
    </main>
  );
}
