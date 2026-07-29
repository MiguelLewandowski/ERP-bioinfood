'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import type { ContactListItemDto } from '@bioinfood/shared';
import { contactsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';

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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    contactsApi.list(token)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [token]);

  /**
   * "Poder só escrever o nome do contato sem existir previamente".
   *
   * Das duas saídas possíveis, esta é a que **não muda o schema**:
   * `ProjectStakeholder.contactId` continua obrigatório e o contato passa a ser
   * criado na hora. A alternativa — deixar `contactId` nulo e guardar um nome
   * solto — tiraria a proteção da `@@unique([projectId, contactId, type])`
   * (unique com NULL não impede duplicata) e criaria gente sem ficha nenhuma.
   *
   * O preço é um contato "raso" no CRM, só com nome. Isso é reversível: basta
   * completar a ficha depois. O outro caminho não é.
   */
  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await contactsApi.create({ name }, token);
      setContacts((prev) => [...prev, created as ContactListItemDto]
        .sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setNewName('');
      setCreating(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
            if (e.key === 'Escape') { setCreating(false); setNewName(''); }
          }}
          autoFocus
          maxLength={200}
          placeholder="Nome da pessoa"
          aria-label="Nome do novo contato"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-ring focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || !newName.trim()}
          className="shrink-0 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? '…' : 'Criar'}
        </button>
        <button
          type="button"
          onClick={() => { setCreating(false); setNewName(''); }}
          className="shrink-0 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
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
      <button
        type="button"
        onClick={() => setCreating(true)}
        disabled={disabled || loading}
        title="Cadastrar alguém que ainda não está no CRM"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground disabled:opacity-60"
      >
        <UserPlus size={13} /> Novo
      </button>
    </div>
  );
}
