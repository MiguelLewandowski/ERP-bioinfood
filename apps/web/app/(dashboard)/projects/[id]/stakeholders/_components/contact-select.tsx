'use client';

import { useEffect, useState } from 'react';
import type { ContactListItemDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';

interface ContactSelectProps {
  token: string;
  value: string;
  onChange: (contactId: string) => void;
  disabled?: boolean;
}

// Lista todos os contatos do CRM (qualquer organização) — parte interessada
// pode ser gente do cliente ou da própria equipe (contatos vinculados à
// organização interna "Bioinfood Interno").
export function ContactSelect({ token, value, onChange, disabled }: ContactSelectProps) {
  const [contacts, setContacts] = useState<ContactListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contactsApi.list(token)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white disabled:opacity-60"
    >
      <option value="">{loading ? 'Carregando…' : 'Selecione um contato…'}</option>
      {contacts.map((c) => (
        <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ''}</option>
      ))}
    </select>
  );
}
