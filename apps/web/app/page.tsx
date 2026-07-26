import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from '@/components/auth/login-form';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/projects');

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-muted px-6">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-success/10 blur-[130px]" />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo/bio.png"
            alt="Bioinfood"
            width={1529}
            height={1624}
            priority
            className="h-16 w-auto"
          />
          <h1 className="mt-4 text-xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre com suas credenciais para continuar.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
