'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { navItemsForRole } from './nav-items';
import { Dialog, DialogContent, DialogTitle, dialogDrawerLeftClass } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Drawer de navegação para telas < lg (a sidebar fixa fica oculta).
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { session } = useAuth();

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu size={18} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(dialogDrawerLeftClass, 'w-64 max-w-[80vw] sm:max-w-[16rem] bg-sidebar text-sidebar-foreground')}>
          <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
            {navItemsForRole(session.role).map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                  )}
                >
                  <Icon size={18} /> {label}
                </Link>
              );
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
