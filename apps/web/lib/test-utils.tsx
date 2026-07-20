import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import type { SystemRole } from '@bioinfood/shared';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ConfirmProvider } from '@/components/providers/confirm-provider';

export const TEST_TOKEN = 'test-token';

export const TEST_SESSION = {
  sub: 'user-1',
  email: 'tester@bioinfood.com',
  role: 'ADMIN' as SystemRole,
};

interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: { sub: string; email: string; role: SystemRole };
  token?: string;
}

/**
 * Renders with the real AuthProvider and ConfirmProvider rather than mocking the
 * hooks, so context wiring is exercised instead of stubbed.
 */
export function renderWithProviders(ui: ReactElement, options: WrapperOptions = {}) {
  const { session = TEST_SESSION, token = TEST_TOKEN, ...rest } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider session={session} token={token}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </AuthProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}

export * from '@testing-library/react';
