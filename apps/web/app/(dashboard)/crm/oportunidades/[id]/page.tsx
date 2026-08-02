import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { contactsApi, opportunitiesApi, usersApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/errors';
import { RegisterBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { OpportunityDetailClient } from './_components/opportunity-detail-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OpportunityDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const opportunity = await opportunitiesApi.get(id, token).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err; // outros erros borbulham para o error boundary
  });

  const [contacts, users] = await Promise.all([
    contactsApi.list(token, { orgId: opportunity.organization.id }),
    usersApi.list(token),
  ]);

  // Escrita do CRM é exclusiva do ADMIN (decisão do owner).
  const canEdit = session.role === 'ADMIN';

  return (
    <>
      <RegisterBreadcrumbLabel id={id} label={opportunity.title} />
      <OpportunityDetailClient
        opportunity={opportunity}
        contacts={contacts}
        users={users}
        canEdit={canEdit}
      />
    </>
  );
}
