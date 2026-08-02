import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { stockApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { StockCategoriesClient, type CategoryWithCount } from './_components/stock-categories-client';

export default async function EstoqueConfigPage() {
  const session = await getSession();
  // Gerenciar categorias é exclusivo do ADMIN (mesma regra do backend).
  if (!session || session.role !== 'ADMIN') redirect('/estoque');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [categories, items] = await Promise.all([
    stockApi.listCategories(token),
    stockApi.listItems(token),
  ]);

  // Conta quantos itens usam cada categoria — decide se o excluir é permitido.
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.category.id, (counts.get(i.category.id) ?? 0) + 1);

  const withCount: CategoryWithCount[] = categories.map((c) => ({
    ...c,
    itemCount: counts.get(c.id) ?? 0,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Categorias de estoque"
        description="Organize o cadastro por categoria. Todo item pertence a uma. O sistema nasce só com Equipamento — crie Insumo, Vidraria e o que mais precisar."
        breadcrumb={
          <Link
            href="/estoque"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} /> Voltar para Estoque
          </Link>
        }
      />
      <StockCategoriesClient categories={withCount} />
    </div>
  );
}
