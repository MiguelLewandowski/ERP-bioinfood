import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormWatch, UseFormReset } from 'react-hook-form';

/**
 * Preserva o rascunho de um formulário de modal em sessionStorage: fechar o
 * modal clicando fora (ou Esc) não deve apagar o que já foi digitado — ao
 * reabrir o mesmo modal, o rascunho volta. Some ao salvar com sucesso.
 */
export function useFormDraft<T extends FieldValues>(
  /** null desliga a persistência (ex.: edição de dado já real do servidor). */
  key: string | null,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
  defaultValues: T,
) {
  const restored = useRef(false);

  useEffect(() => {
    if (!key || restored.current) return;
    restored.current = true;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    try {
      reset({ ...defaultValues, ...JSON.parse(raw) });
    } catch {
      sessionStorage.removeItem(key);
    }
    // Só restaura uma vez, na montagem — defaultValues muda de referência a
    // cada render e não pode disparar o efeito de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const sub = watch((values) => {
      sessionStorage.setItem(key, JSON.stringify(values));
    });
    return () => sub.unsubscribe();
  }, [key, watch]);
}

export function clearFormDraft(key: string) {
  sessionStorage.removeItem(key);
}
