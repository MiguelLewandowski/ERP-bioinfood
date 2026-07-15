import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from '@/components/auth/login-form';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/projects');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Image
              src="/logo/logotipo-horizontal.png"
              alt="Bioinfood"
              width={2618}
              height={1084}
              priority
              className="h-28 w-auto"
            />
          </div>
          <p className="text-sm text-gray-500">Sistema de Gestão Interno</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
