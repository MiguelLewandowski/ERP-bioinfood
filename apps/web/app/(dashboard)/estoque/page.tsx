import { cookies } from 'next/headers';
import { stockApi } from '@/lib/api-hooks';
import { StockClient } from './_components/stock-client';

export default async function EstoquePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [items, categories] = await Promise.all([
    stockApi.listItems(token),
    stockApi.listCategories(token),
  ]);

  return <StockClient initialItems={items} categories={categories} />;
}
