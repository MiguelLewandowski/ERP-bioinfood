'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import { CommandPalette } from './command-palette';
import { MobileNav } from './mobile-nav';
import { QuickAdd } from './quick-add';

export function Topbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          aria-label="Abrir busca global"
        >
          <Search size={14} />
          <span className="hidden flex-1 text-left sm:block">Buscar…</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:block">
            Ctrl K
          </kbd>
        </button>
        <QuickAdd />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
