'use client'; // error boundaries must be client components

import { AlertTriangle } from 'lucide-react';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="text-red-500" size={24} />
      </div>
      <h1 className="text-lg font-bold text-[#1D1D1B]">Não foi possível carregar o funil</h1>
      <button
        onClick={reset}
        className="mt-5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: '#147F23' }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
