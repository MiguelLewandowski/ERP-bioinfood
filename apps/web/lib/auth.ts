import { cookies } from 'next/headers';
import type { SystemRole } from '@bioinfood/shared';

export type SessionPayload = { sub: string; email: string; role: SystemRole };

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const { sub, email, role } = JSON.parse(atob(token.split('.')[1]));
    return { sub, email, role };
  } catch {
    return null;
  }
}
