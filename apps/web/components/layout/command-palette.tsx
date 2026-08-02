'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { FolderKanban, Building2, Search, Briefcase, UserRound } from 'lucide-react';
import type { SearchResultDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { searchApi } from '@/lib/api-hooks';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { navItemsForRole } from './nav-items';

// A lista de navegação vem de `nav-items.ts`, fonte única compartilhada com a
// sidebar e o drawer mobile. Havia uma cópia local aqui, e ela já tinha
// divergido: POPs existia na sidebar e não no ⌘K. Módulo novo agora aparece nos
// três lugares de uma vez.

const TYPE_CONFIG = {
  project: { group: 'Projetos', icon: FolderKanban },
  organization: { group: 'Empresas', icon: Building2 },
  opportunity: { group: 'Oportunidades', icon: Briefcase },
  contact: { group: 'Pessoas', icon: UserRound },
} as const;

function resultHref(r: SearchResultDto): string {
  switch (r.type) {
    case 'project':
      return `/projects/${r.id}`;
    case 'organization':
      return `/crm/empresas/${r.id}`;
    case 'opportunity':
      return '/crm?tab=oportunidades';
    case 'contact':
      return r.refId ? `/crm/empresas/${r.refId}` : '/crm?tab=pessoas';
  }
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { session, token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultDto[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Busca no backend com debounce; a filtragem local do cmdk fica desligada
  // para os resultados remotos não serem re-filtrados pelo texto digitado.
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchApi.global(q, token));
      } catch {
        setResults([]); // busca é best-effort; navegação fixa continua funcionando
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, token]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResultDto[]>();
    for (const r of results) {
      const key = TYPE_CONFIG[r.type].group;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [results]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const navItems = navItemsForRole(session.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <Command shouldFilter={query.trim().length < 2} label="Busca global">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar projetos, parceiros, oportunidades, contatos…"
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado.
            </Command.Empty>

            {grouped.map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map((r) => {
                  const Icon = TYPE_CONFIG[r.type].icon;
                  return (
                    <Command.Item
                      key={`${r.type}-${r.id}`}
                      value={`${r.type}-${r.id}-${r.title}`}
                      onSelect={() => go(resultHref(r))}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                    >
                      <Icon size={15} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="ml-auto max-w-[40%] truncate text-xs text-muted-foreground">
                          {r.subtitle}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}

            <Command.Group
              heading="Ir para"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {navItems.map(({ href, label, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={`nav-${label}`}
                  onSelect={() => go(href)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
                >
                  <Icon size={15} className="shrink-0 text-muted-foreground" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
