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
            <span className="text-3xl font-bold tracking-tight">
              <span style={{ color: '#147F23' }}>BIO</span>
              <span className="text-xs font-normal mx-0.5 relative" style={{ color: '#DD8005', top: '-2px' }}>in</span>
              <span style={{ color: '#147F23' }}>FOOD</span>
            </span>
          </div>
          <p className="text-sm text-gray-500">Sistema de Gestão Interno</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
