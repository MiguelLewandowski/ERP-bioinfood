'use client';
// Ponte de sessão para navegações de Server Component.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { refreshSession } from '@/lib/api';

/**
 * O access token dura 15min e seu cookie some junto (maxAge = exp). Numa
 * navegação RSC depois disso, o layout não acha o access token e — sem esta
 * ponte — mandaria o usuário pro login mesmo com refresh token (7d) válido.
 *
 * Aqui renovamos pelo mesmo caminho single-flight das chamadas de API e, no
 * sucesso, `router.refresh()` re-renderiza a árvore no servidor já com o cookie
 * novo (o layout passa a ver `authenticated`). Na falha, o /api/auth/refresh já
 * apagou os cookies, então recarregar em `/` cai no login sem laço.
 */
export function SessionRefreshGate() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    refreshSession().then((ok) => {
      if (!active) return;
      if (ok) router.refresh();
      else window.location.href = '/';
    });
    return () => { active = false; };
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Renovando sessão…</span>
      </div>
    </div>
  );
}
