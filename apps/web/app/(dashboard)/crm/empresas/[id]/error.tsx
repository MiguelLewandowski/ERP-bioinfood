'use client'; // error boundaries must be client components

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="text-red-500" size={24} />
      </div>
      <h1 className="text-lg font-bold text-foreground">Não foi possível carregar o cliente</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">Tente novamente ou volte para a lista de clientes.</p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          Tentar novamente
        </button>
        <Link
          href="/crm?tab=empresas"
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-gray-200 hover:bg-gray-50"
        >
          Voltar para Empresas
        </Link>
      </div>
    </div>
  );
}
