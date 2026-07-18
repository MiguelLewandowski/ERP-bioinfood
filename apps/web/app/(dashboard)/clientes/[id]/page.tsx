import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  contactsApi, interactionsApi, opportunitiesApi, organizationsApi, taxonomiesApi,
} from '@/lib/api-hooks';
import { ApiError } from '@/lib/errors';
import { RegisterBreadcrumbLabel } from '@/components/layout/breadcrumb-context';
import { FichaClient } from './_components/ficha-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientePage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role === 'CLIENTE') redirect('/projects');

  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const organization = await organizationsApi.get(id, token).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err; // outros erros borbulham para o error boundary
  });

  const [sectors, sources, contacts, interactions, opportunities] = await Promise.all([
    taxonomiesApi.list('sectors', token),
    taxonomiesApi.list('sources', token),
    contactsApi.list(token, { orgId: id }),
    interactionsApi.list(id, token),
    opportunitiesApi.listByOrg(id, token),
  ]);

  // Escrita do CRM é exclusiva do ADMIN (decisão do owner).
  const canEdit = session.role === 'ADMIN';
  const canManageRoles = session.role === 'ADMIN';

  return (
    <>
    <RegisterBreadcrumbLabel id={id} label={organization.tradeName ?? organization.legalName} />
    <FichaClient
      organizationId={id}
      organization={organization}
      sectors={sectors}
      sources={sources}
      contacts={contacts}
      interactions={interactions}
      opportunities={opportunities}
      canEdit={canEdit}
      canManageRoles={canManageRoles}
    />
    </>
  );
}
