'use client'; // error boundaries must be client components

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="text-destructive" size={24} />
      </div>
      <h1 className="text-lg font-bold text-foreground">Não foi possível carregar os clientes</h1>
      <Button onClick={reset} className="mt-5">Tentar novamente</Button>
    </div>
  );
}
