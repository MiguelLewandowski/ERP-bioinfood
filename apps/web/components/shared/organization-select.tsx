'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { OrganizationDto } from '@bioinfood/shared';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface OrganizationSelectProps {
  token: string;
  value: string | null | undefined;
  onChange: (organizationId: string | undefined) => void;
  disabled?: boolean;
}

// Seletor de Organization (cliente) com opção de cadastro rápido inline —
// não existe ainda uma tela de CRM para cadastrar clientes fora daqui.
export function OrganizationSelect({ token, value, onChange, disabled }: OrganizationSelectProps) {
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    organizationsApi.list(token)
      .then(setOrganizations)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const org = await organizationsApi.create({ legalName: newName.trim() }, token);
      setOrganizations((prev) => [...prev, org].sort((a, b) => a.legalName.localeCompare(b.legalName)));
      onChange(org.id);
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
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreate())}
          placeholder="Nome do novo cliente"
          className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || !newName.trim()}
          className="shrink-0 px-2.5 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          {saving ? '...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => { setCreating(false); setNewName(''); }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value ?? ''}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full text-sm text-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <option value="">{loading ? 'Carregando…' : 'Sem cliente'}</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.tradeName ?? org.legalName}</option>
        ))}
      </select>
      {!disabled && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          title="Novo cliente"
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-muted-foreground hover:bg-gray-50"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}
