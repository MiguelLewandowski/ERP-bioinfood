'use client'; // interactive tree

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, GitBranch, User, CheckSquare, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WbsNodeDto } from '@bioinfood/shared';

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

export function WbsClient({ projectId, token, initialNodes }: WbsClientProps) {
  const [nodes, setNodes] = useState<WbsNode[]>(initialNodes);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<AddForm | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingNode | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const tree = buildTree(nodes);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!newTitle.trim() || !addForm) return;
    setSaving(true);
    try {
      const siblings = nodes.filter((n) => n.parentId === addForm.parentId);
      const nextNum  = siblings.length + 1;
      const code     = addForm.parentId ? `${addForm.parentCode}.${nextNum}` : `${nextNum}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/wbs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle.trim(), code, parentId: addForm.parentId ?? undefined, order: siblings.length }),
      });
      if (res.ok) {
        const node = await res.json();
        setNodes((prev) => [...prev, node]);
        setNewTitle('');
        setAddForm(null);
      }
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/wbs/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          owner: editing.owner || null,
          readyCriteria: editing.readyCriteria || null,
          outputs: editing.outputs || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
        setEditing(null);
      }
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1B]">EAP / WBS</h2>
          <p className="text-sm text-[#706F6F] mt-0.5">Estrutura Analítica do Projeto — {nodes.length} entregáveis</p>
        </div>
        <button
          onClick={() => setAddForm({ parentId: null, parentCode: '' })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={16} /> Novo Entregável
        </button>
      </div>

      {nodes.length === 0 && !addForm && (
        <div className="bg-white rounded-xl border border-gray-200 py-20 flex flex-col items-center gap-3">
          <GitBranch size={36} style={{ color: '#878787' }} />
          <p className="text-sm font-medium text-[#575756]">Nenhum entregável ainda.</p>
          <button onClick={() => setAddForm({ parentId: null, parentCode: '' })} className="text-sm text-[#147F23] font-semibold hover:underline">
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
            onToggle={toggleCollapse}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-[#52B552] rounded-xl shadow-xl px-5 py-4 flex items-center gap-3 w-full max-w-md">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddForm(null); }}
            placeholder={`Sub-entregável de ${addForm.parentCode}…`}
            className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
          />
          <button onClick={handleAdd} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#147F23' }}>
            {saving ? '…' : 'Adicionar'}
          </button>
          <button onClick={() => setAddForm(null)} className="text-xs text-[#706F6F]">✕</button>
        </div>
      )}

      {/* Edit panel — slide-in from right */}
      {editing && (
        <div className="fixed inset-0 z-50 flex">
          <button className="flex-1 bg-black/30" onClick={() => setEditing(null)} />
          <div className="w-96 bg-white shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1D1D1B]">Detalhes do Pacote de Trabalho</h3>
              <button onClick={() => setEditing(null)} className="text-[#706F6F] hover:text-[#1D1D1B] text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#575756] mb-1.5">
                  <User size={12} /> Dono
                </label>
                <input
                  value={editing.owner}
                  onChange={(e) => setEditing({ ...editing, owner: e.target.value })}
                  placeholder="Nome do responsável…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#575756] mb-1.5">
                  <CheckSquare size={12} /> Critério de Pronto
                </label>
                <textarea
                  value={editing.readyCriteria}
                  onChange={(e) => setEditing({ ...editing, readyCriteria: e.target.value })}
                  rows={4}
                  placeholder="Como sabemos que este entregável está concluído?…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#575756] mb-1.5">
                  <Package size={12} /> Saídas
                </label>
                <textarea
                  value={editing.outputs}
                  onChange={(e) => setEditing({ ...editing, outputs: e.target.value })}
                  rows={4}
                  placeholder="Documentos, artefatos ou resultados gerados…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-[#575756] hover:text-[#1D1D1B]">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#147F23' }}>
                {savingEdit ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WbsTreeNodeProps {
  node: WbsNodeTree;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (parentId: string, parentCode: string) => void;
  onEdit: (node: WbsNode) => void;
}

function WbsTreeNode({ node, depth, collapsed, onToggle, onAdd, onEdit }: WbsTreeNodeProps) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const isLeaf      = !hasChildren;

  const depthColors = ['#147F23', '#46AD48', '#86C175', '#706F6F'];
  const color = depthColors[Math.min(depth, depthColors.length - 1)];

  const hasDetails = node.owner || node.readyCriteria || node.outputs;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 group"
        style={{ paddingLeft: `${16 + depth * 24}px`, paddingRight: '16px' }}
      >
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn('w-5 h-5 flex items-center justify-center shrink-0', !hasChildren && 'invisible')}
        >
          {isCollapsed ? <ChevronRight size={14} style={{ color }} /> : <ChevronDown size={14} style={{ color }} />}
        </button>

        <span className="text-xs font-bold shrink-0 w-12" style={{ color }}>{node.code}</span>
        <span className="flex-1 text-sm text-[#1D1D1B] font-medium">{node.title}</span>

        {/* Metadata chips */}
        {node.owner && (
          <span className="hidden group-hover:flex items-center gap-1 text-[10px] text-[#575756] bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
            <User size={9} /> {node.owner}
          </span>
        )}

        {isLeaf && (
          <button
            onClick={() => onEdit(node)}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-[#706F6F] hover:text-[#147F23] transition-all ml-1"
            title="Editar dono, pronto e saídas"
          >
            {hasDetails
              ? <span className="text-[#147F23]">✓ detalhes</span>
              : <span>+ detalhes</span>}
          </button>
        )}

        <button
          onClick={() => onAdd(node.id, node.code)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[10px] text-[#147F23] font-semibold hover:underline transition-opacity"
        >
          <Plus size={11} /> sub
        </button>
      </div>

      {!isCollapsed && node.children.map((child) => (
        <WbsTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function AddInlineRow({ placeholder, value, onChange, onAdd, onCancel, saving, indent }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  onAdd: () => void; onCancel: () => void; saving: boolean; indent: number;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-[#86C175]/10" style={{ paddingLeft: `${16 + indent * 24}px` }}>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 text-sm px-3 py-1.5 border border-[#52B552] rounded-lg focus:outline-none"
      />
      <button onClick={onAdd} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#147F23' }}>
        {saving ? '…' : 'Adicionar'}
      </button>
      <button onClick={onCancel} className="text-xs text-[#706F6F] hover:text-[#1D1D1B]">Cancelar</button>
    </div>
  );
}
