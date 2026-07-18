'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItemsForRole } from './nav-items';

interface SidebarProps {
  session: { sub: string; email: string; role: string };
}

const STORAGE_KEY = 'sidebar-collapsed';

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Restaura a preferência salva (sem causar mismatch de hidratação).
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const initials = session.email.slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-full shrink-0 bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-white/10 py-6',
          collapsed ? 'justify-center px-0' : 'justify-between px-6',
        )}
      >
        {collapsed ? (
          <Image
            src="/logo/logotipo-vertical.png"
            alt="Bioinfood"
            width={1801}
            height={1968}
            priority
            className="h-14 w-auto"
          />
        ) : (
          <Image
            src="/logo/logotipo-horizontal.png"
            alt="Bioinfood"
            width={2618}
            height={1084}
            priority
            className="h-14 w-auto"
          />
        )}
        {!collapsed && (
          <button
            onClick={toggle}
            className="text-gray-500 hover:text-gray-200 transition-colors"
            title="Recolher menu"
            aria-label="Recolher menu"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={toggle}
          className="mx-auto mt-2 text-gray-500 hover:text-gray-200 transition-colors"
          title="Expandir menu"
          aria-label="Expandir menu"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <nav className={cn('flex-1 py-4 flex flex-col gap-1', collapsed ? 'px-2' : 'px-3')}>
        {navItemsForRole(session.role)
          .map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group/nav relative flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  active ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
                )}
              >
                <Icon size={18} />
                {!collapsed && label}
                {collapsed && (
                  <span
                    className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md border border-white/10 bg-sidebar px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover/nav:opacity-100"
                  >
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div
        className={cn(
          'border-t border-white/10 py-4 flex border-white/10',
          collapsed ? 'flex-col items-center gap-3 px-0' : 'items-center gap-3 px-4',
        )}
      >
        <div
          className={cn(
            'group/avatar relative w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shrink-0',
            collapsed && 'cursor-default',
          )}
        >
          {initials}
          {collapsed && (
            <span
              className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md border border-white/10 bg-sidebar px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover/avatar:opacity-100"
            >
              {session.email} ({session.role})
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-300 truncate">{session.email}</p>
            <p className="text-xs text-gray-500">{session.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
