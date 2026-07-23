import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { popsApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { PopCategoriesClient, type CategoryWithCount } from './_components/pop-categories-client';

export default async function PopConfigPage() {
  const session = await getSession();
  // Gerenciar categorias é exclusivo do ADMIN (mesma regra do backend).
  if (!session || session.role !== 'ADMIN') redirect('/pops');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [categories, pops] = await Promise.all([
    popsApi.listCategories(token),
    popsApi.list(token),
  ]);

  // Conta quantas POPs usam cada categoria — decide se o excluir é permitido.
  const counts = new Map<string, number>();
  for (const p of pops) {
    if (p.category) counts.set(p.category.id, (counts.get(p.category.id) ?? 0) + 1);
  }
  const withCount: CategoryWithCount[] = categories.map((c) => ({
    ...c,
    popCount: counts.get(c.id) ?? 0,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Categorias de POP"
        description="Organize os procedimentos por categoria. Toda POP pertence a uma."
        breadcrumb={
          <Link href="/pops" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft size={13} /> Voltar para POPs
          </Link>
        }
      />
      <PopCategoriesClient categories={withCount} />
    </div>
  );
}
