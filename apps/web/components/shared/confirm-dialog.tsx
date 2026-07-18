'use client';
// Client Component: wraps Radix Dialog, which owns focus trap / portal / keyboard state at runtime.

import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'default' | 'destructive';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

// Confirmação genérica para ações destrutivas ou sensíveis — substitui window.confirm.
// Suporta onConfirm assíncrono: mostra spinner e só fecha se a promise resolver.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const busy = loading || confirming;
  const destructive = variant === 'destructive';

  async function handleConfirm() {
    const result = onConfirm();
    if (result instanceof Promise) {
      setConfirming(true);
      try {
        await result;
        onOpenChange(false);
      } catch {
        // Mantém o modal aberto para o usuário tentar de novo — o erro é tratado pelo chamador.
      } finally {
        setConfirming(false);
      }
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <Dialog.Portal>
        <DialogOverlay />
        <Dialog.Content
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
          onInteractOutside={(e) => busy && e.preventDefault()}
          onOpenAutoFocus={(e) => {
            // Ação destrutiva: foco inicial no Cancelar (evita excluir sem querer com Enter).
            e.preventDefault();
            (destructive ? cancelRef.current : confirmRef.current)?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                destructive ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent',
              )}
            >
              {destructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
            </div>
            <div className="flex-1 pt-1">
              <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                ref={cancelRef}
                type="button"
                disabled={busy}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              ref={confirmRef}
              type="button"
              disabled={busy}
              onClick={handleConfirm}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60',
                destructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
              )}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
