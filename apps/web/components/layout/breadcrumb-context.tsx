'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Segmentos dinâmicos da URL (ids) não têm nome legível — as páginas de detalhe
// registram "id → nome da entidade" aqui e o breadcrumb da topbar consome.

interface BreadcrumbContextValue {
  labels: Record<string, string>;
  register: (id: string, label: string) => void;
  unregister: (id: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const register = useCallback((id: string, label: string) => {
    setLabels((prev) => (prev[id] === label ? prev : { ...prev, [id]: label }));
  }, []);

  const unregister = useCallback((id: string) => {
    setLabels((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const value = useMemo(() => ({ labels, register, unregister }), [labels, register, unregister]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbLabels(): Record<string, string> {
  return useContext(BreadcrumbContext)?.labels ?? {};
}

/** Componente utilitário: páginas server renderizam para nomear um segmento dinâmico. */
export function RegisterBreadcrumbLabel({ id, label }: { id: string; label: string }) {
  const ctx = useContext(BreadcrumbContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, label);
    return () => ctx.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label]);
  return null;
}
