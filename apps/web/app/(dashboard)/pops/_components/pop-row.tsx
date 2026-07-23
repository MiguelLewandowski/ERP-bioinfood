'use client'; // expande histórico de versões e envia nova versão sob demanda

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ExternalLink, History, Plus, Trash2 } from 'lucide-react';
import type { PopDto, PopVersionDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { popsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface PopRowProps {
  pop: PopDto;
  onDeleted: (id: string) => void;
  onVersionCreated: (id: string, latestVersion: PopVersionDto) => void;
}

export function PopRow({ pop, onDeleted, onVersionCreated }: PopRowProps) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [versions, setVersions] = useState<PopVersionDto[] | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [addingVersion, setAddingVersion] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && versions === null) {
      setLoadingVersions(true);
      try {
        const detail = await popsApi.get(pop.id, token);
        setVersions(detail.versions);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoadingVersions(false);
      }
    }
  }

  async function handleAddVersion() {
    setSavingVersion(true);
    try {
      const detail = await popsApi.createVersion(
        pop.id,
        { changeNotes: changeNotes.trim() || undefined },
        token,
      );
      setVersions(detail.versions);
      onVersionCreated(pop.id, detail.latestVersion);
      setChangeNotes('');
      setAddingVersion(false);
      toast.success('Nova versão criada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingVersion(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await popsApi.remove(pop.id, token);
      onDeleted(pop.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={toggleExpand}
          aria-label={expanded ? 'Recolher histórico de versões' : 'Expandir histórico de versões'}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{pop.title}</p>
          {pop.description && (
            <p className="text-xs text-muted-foreground truncate">{pop.description}</p>
          )}
        </div>

        {pop.category && (
          <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            {pop.category.name}
          </span>
        )}

        {/* Link externo (Drive). rel=noreferrer: o destino não recebe a URL do ERP. */}
        {pop.latestVersion.fileUrl && (
          <a
            href={pop.latestVersion.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Abrir documento da POP ${pop.title}`}
            className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink size={14} />
          </a>
        )}

        <span className="shrink-0 text-xs font-semibold text-primary bg-success/10 rounded-full px-2 py-0.5">
          v{pop.latestVersion.versionNumber}
        </span>

        <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
          {pop.latestVersion.createdBy.name} · {fmt(pop.latestVersion.createdAt)}
        </span>

        {confirmingDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded font-semibold disabled:opacity-50"
            >
              {deleting ? '…' : 'Sim'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Excluir POP ${pop.title}`}
            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
          <div className="flex items-center gap-1.5 mb-2">
            <History size={12} className="text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Histórico de versões
            </span>
          </div>

          {loadingVersions ? (
            <p className="text-xs text-muted-foreground py-2">Carregando…</p>
          ) : (
            <div className="space-y-1.5">
              {(versions ?? []).map((v) => (
                <div key={v.id} className="flex items-start gap-2 text-xs bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <span className="shrink-0 font-semibold text-foreground">v{v.versionNumber}</span>
                  <div className="flex-1 min-w-0">
                    {v.changeNotes && <p className="text-foreground">{v.changeNotes}</p>}
                    <p className="text-muted-foreground">{v.createdBy.name} · {fmt(v.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addingVersion ? (
            <div className="mt-2 flex gap-2 items-center">
              <input
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="O que mudou nesta revisão? (opcional)"
                className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddVersion()}
              />
              <Button size="sm" onClick={handleAddVersion} disabled={savingVersion}>
                {savingVersion ? '…' : 'Criar versão'}
              </Button>
              <button
                onClick={() => { setAddingVersion(false); setChangeNotes(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingVersion(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
            >
              <Plus size={12} /> Nova versão
            </button>
          )}
        </div>
      )}
    </div>
  );
}
