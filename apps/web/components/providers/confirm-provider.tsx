'use client';
// Client Component: holds React Context + state for the dialog, which requires runtime.

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog, type ConfirmDialogVariant } from '@/components/shared/confirm-dialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface ConfirmProviderProps {
  children: React.ReactNode;
}

// Expõe confirm() imperativo (substitui window.confirm) — resolve `true`/`false`
// conforme a escolha do usuário no ConfirmDialog. Um único dialog é reutilizado
// para todo o app, empilhado por cima da árvore de children.
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog
          open
          onOpenChange={(next) => { if (!next) settle(false); }}
          onConfirm={() => settle(true)}
          {...options}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
