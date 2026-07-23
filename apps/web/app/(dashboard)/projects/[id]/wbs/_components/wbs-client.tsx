'use client'; // interactive tree

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, GitBranch, User, CheckSquare, Package, ListTree, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { WbsNodeDto } from '@bioinfood/shared';
import type { ProjectMember } from '@/lib/project-members';
import { wbsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, dialogDrawerRightClass } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type WbsNode = WbsNodeDto;

interface WbsNodeTree extends WbsNode {
  children: WbsNodeTree[];
}

function buildTree(nodes: WbsNode[]): WbsNodeTree[] {
  const map = new Map<string, WbsNodeTree>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: WbsNodeTree[] = [];
  for (const n of nodes) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (arr: WbsNodeTree[]) => arr.sort((a, b) => a.order - b.order);
  const sortDeep = (arr: WbsNodeTree[]): WbsNodeTree[] =>
    sort(arr).map((n) => ({ ...n, children: sortDeep(n.children) }));
  return sortDeep(roots);
}

interface WbsClientProps {
  projectId: string;
  token: string;
  initialNodes: WbsNode[];
  /** Equipe do TAP + acessos do projeto — as opções de dono do pacote. */
  members: ProjectMember[];
}

interface AddForm {
  parentId: string | null;
  parentCode: string;
}

interface EditingNode {
  id: string;
  owner: string;
  readyCriteria: string;
  outputs: string;
}

export function WbsClient({ projectId, token, initialNodes, members }: WbsClientProps) {
  const [nodes, setNodes] = useState<WbsNode[]>(initialNodes);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Pacotes de trabalho com o painel de detalhes aberto. Começa vazio: o resumo
  // na própria linha já diz o que está preenchido, e abrir tudo de uma vez
  // transformaria a árvore num muro de texto.
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<AddForm | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingNode | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const tree = buildTree(nodes);

  // `WbsNode.owner` é texto livre no banco: nós antigos (ou o seed) podem ter um
  // nome que não corresponde a ninguém da equipe. Ele entra na lista para o
  // select conseguir exibi-lo — senão abrir o drawer zeraria o dono em silêncio.
  const legacyOwner =
    editing?.owner && !members.some((m) => m.name === editing.owner) ? editing.owner : null;
  const ownerOptions = legacyOwner
    ? [...members.map((m) => m.name), legacyOwner]
    : members.map((m) => m.name);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleDetails(id: string) {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAllDetails() {
    setOpenDetails((prev) => prev.size > 0 ? new Set() : new Set(nodes.map((n) => n.id)));
  }

  async function handleAdd() {
    if (!newTitle.trim() || !addForm) return;
    setSaving(true);
    try {
      const siblings = nodes.filter((n) => n.parentId === addForm.parentId);
      const nextNum  = siblings.length + 1;
      const code     = addForm.parentId ? `${addForm.parentCode}.${nextNum}` : `${nextNum}`;

      const node = await wbsApi.create(
        projectId,
        { title: newTitle.trim(), code, parentId: addForm.parentId ?? undefined, order: siblings.length },
        token,
      );
      setNodes((prev) => [...prev, node]);
      setNewTitle('');
      setAddForm(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(node: WbsNode) {
    setEditing({
      id: node.id,
      owner: node.owner ?? '',
      readyCriteria: node.readyCriteria ?? '',
      outputs: node.outputs ?? '',
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const updated = await wbsApi.update(
        projectId,
        editing.id,
        {
          owner: editing.owner || null,
          readyCriteria: editing.readyCriteria || null,
          outputs: editing.outputs || null,
        },
        token,
      );
      setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">EAP / WBS</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Estrutura Analítica do Projeto — {nodes.length} entregáveis</p>
        </div>
        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <button
              onClick={expandAllDetails}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors"
            >
              <ListTree size={14} />
              {openDetails.size > 0 ? 'Recolher detalhes' : 'Expandir detalhes'}
            </button>
          )}
          <button
            onClick={() => setAddForm({ parentId: null, parentCode: '' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <Plus size={16} /> Novo Entregável
          </button>
        </div>
      </div>

      {nodes.length === 0 && !addForm && (
        <div className="bg-white rounded-xl border border-gray-200 py-20 flex flex-col items-center gap-3">
          <GitBranch size={36} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <p className="text-sm font-medium text-muted-foreground">Nenhum entregável ainda.</p>
          <button onClick={() => setAddForm({ parentId: null, parentCode: '' })} className="text-sm text-primary font-semibold hover:underline">
            Criar primeiro entregável →
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tree.map((node) => (
          <WbsTreeNode
            key={node.id}
            node={node}
            depth={0}
            collapsed={collapsed}
            openDetails={openDetails}
            onToggle={toggleCollapse}
            onToggleDetails={toggleDetails}
            onAdd={(parentId, parentCode) => setAddForm({ parentId, parentCode })}
            onEdit={startEdit}
          />
        ))}

        {addForm?.parentId === null && (
          <AddInlineRow
            placeholder="Nome do entregável de nível 1…"
            value={newTitle}
            onChange={setNewTitle}
            onAdd={handleAdd}
            onCancel={() => setAddForm(null)}
            saving={saving}
            indent={0}
          />
        )}
      </div>

      {/* Add form for children — appears as floating bar */}
      {addForm?.parentId !== null && addForm && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-ring rounded-xl shadow-xl px-5 py-4 flex items-center gap-3 w-full max-w-md">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddForm(null); }}
            placeholder={`Sub-entregável de ${addForm.parentCode}…`}
            className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:border-ring focus:outline-none"
          />
          <button onClick={handleAdd} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--primary))' }}>
            {saving ? '…' : 'Adicionar'}
          </button>
          <button onClick={() => setAddForm(null)} className="text-xs text-muted-foreground">✕</button>
        </div>
      )}

      {/* Edit panel — drawer lateral sobre o DialogContent */}
      {editing && (
        <Dialog open onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className={cn(dialogDrawerRightClass, 'w-96 max-w-full sm:max-w-sm')}>
            <DialogHeader className="border-b border-border px-5 py-4">
              <DialogTitle className="text-sm">Detalhes do Pacote de Trabalho</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label htmlFor="wbs-owner" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <User size={12} /> Dono
                </label>
                <select
                  id="wbs-owner"
                  value={editing.owner}
                  onChange={(e) => setEditing({ ...editing, owner: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white"
                >
                  <option value="">— Sem responsável —</option>
                  {ownerOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {members.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Nenhuma pessoa na equipe ainda — monte a equipe em{' '}
                    <Link href={`/projects/${projectId}/charter`} className="font-medium text-primary hover:underline">
                      Termo de Abertura
                    </Link>.
                  </p>
                ) : legacyOwner ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    &quot;{legacyOwner}&quot; foi digitado à mão e não está na equipe do projeto.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <CheckSquare size={12} /> Critério de Pronto
                </label>
                <textarea
                  value={editing.readyCriteria}
                  onChange={(e) => setEditing({ ...editing, readyCriteria: e.target.value })}
                  rows={4}
                  placeholder="Como sabemos que este entregável está concluído?…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
                  <Package size={12} /> Saídas
                </label>
                <textarea
                  value={editing.outputs}
                  onChange={(e) => setEditing({ ...editing, outputs: e.target.value })}
                  rows={4}
                  placeholder="Documentos, artefatos ou resultados gerados…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-ring focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface WbsTreeNodeProps {
  node: WbsNodeTree;
  depth: number;
  collapsed: Set<string>;
  openDetails: Set<string>;
  onToggle: (id: string) => void;
  onToggleDetails: (id: string) => void;
  onAdd: (parentId: string, parentCode: string) => void;
  onEdit: (node: WbsNode) => void;
}

function WbsTreeNode({ node, depth, collapsed, openDetails, onToggle, onToggleDetails, onAdd, onEdit }: WbsTreeNodeProps) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;

  const depthColors = ['#147F23', '#46AD48', '#86C175', '#706F6F'];
  const color = depthColors[Math.min(depth, depthColors.length - 1)];

  const hasDetails  = !!(node.owner || node.readyCriteria || node.outputs);
  const detailsOpen = openDetails.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 group"
        style={{ paddingLeft: `${16 + depth * 24}px`, paddingRight: '16px' }}
      >
        <button
          onClick={() => hasChildren ? onToggle(node.id) : onToggleDetails(node.id)}
          className="w-5 h-5 flex items-center justify-center shrink-0"
          title={hasChildren ? 'Expandir sub-entregáveis' : 'Ver detalhes do pacote'}
        >
          {(hasChildren ? isCollapsed : !detailsOpen)
            ? <ChevronRight size={14} style={{ color }} />
            : <ChevronDown size={14} style={{ color }} />}
        </button>

        <span className="text-xs font-bold shrink-0 w-12" style={{ color }}>{node.code}</span>

        {/* Título sempre abre os detalhes; o chevron cuida da navegação da árvore. */}
        <button
          onClick={() => onToggleDetails(node.id)}
          className="flex-1 text-left text-sm text-foreground font-medium hover:text-primary transition-colors"
          title="Ver detalhes"
        >
          {node.title}
        </button>

        {/* Resumo sempre visível: diz o que já está documentado sem exigir clique. */}
        <div className="flex items-center gap-1.5 shrink-0">
            {node.owner && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                <User size={9} /> {node.owner}
              </span>
            )}
            {node.readyCriteria && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-primary-dark" title="Tem critério de pronto">
                <CheckSquare size={9} /> pronto
              </span>
            )}
            {node.outputs && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-primary-dark" title="Tem saídas definidas">
                <Package size={9} /> saídas
              </span>
            )}
            {!hasDetails && (
              <button
                onClick={() => onEdit(node)}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                + detalhes
              </button>
            )}
        </div>

        <button
          onClick={() => onAdd(node.id, node.code)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[10px] text-primary font-semibold hover:underline transition-opacity shrink-0"
        >
          <Plus size={11} /> sub
        </button>
      </div>

      {detailsOpen && (
        <WbsDetailPanel node={node} indent={16 + depth * 24} onEdit={() => onEdit(node)} />
      )}

      {!isCollapsed && node.children.map((child) => (
        <WbsTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          collapsed={collapsed}
          openDetails={openDetails}
          onToggle={onToggle}
          onToggleDetails={onToggleDetails}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function WbsDetailPanel({ node, indent, onEdit }: { node: WbsNode; indent: number; onEdit: () => void }) {
  const fields = [
    { icon: User,        label: 'Dono',              value: node.owner },
    { icon: CheckSquare, label: 'Critério de pronto', value: node.readyCriteria },
    { icon: Package,     label: 'Saídas',             value: node.outputs },
  ];

  return (
    <div
      className="border-b border-gray-50 bg-gray-50/60 py-3 pr-4"
      style={{ paddingLeft: `${indent + 28}px` }}
    >
      <div className="flex items-start justify-between gap-4">
        <dl className="flex-1 space-y-2.5">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <Icon size={10} /> {label}
              </dt>
              <dd className={cn('text-xs mt-0.5 whitespace-pre-wrap', value ? 'text-foreground' : 'text-muted-foreground italic')}>
                {value || 'Não preenchido'}
              </dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onEdit}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
        >
          <Pencil size={11} /> Editar
        </button>
      </div>
    </div>
  );
}

function AddInlineRow({ placeholder, value, onChange, onAdd, onCancel, saving, indent }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  onAdd: () => void; onCancel: () => void; saving: boolean; indent: number;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-success/10" style={{ paddingLeft: `${16 + indent * 24}px` }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 text-sm px-3 py-1.5 border border-ring rounded-lg focus:outline-none"
      />
      <button onClick={onAdd} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--primary))' }}>
        {saving ? '…' : 'Adicionar'}
      </button>
      <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
    </div>
  );
}
