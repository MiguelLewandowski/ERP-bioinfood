'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, CalendarDays, Users, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Building2, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  session: { sub: string; email: string; role: string };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/activities', label: 'Atividades', icon: CalendarDays },
  { href: '/clientes', label: 'Clientes', icon: Building2, roles: ['ADMIN', 'APROVA', 'INSERE', 'CONSULTA'] },
  { href: '/crm', label: 'CRM', icon: Target, roles: ['ADMIN', 'APROVA', 'INSERE', 'CONSULTA'] },
  { href: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN', 'APROVA'] },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

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
        'flex flex-col h-full shrink-0 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
      style={{ backgroundColor: '#1D1D1B' }}
    >
      <div
        className={cn(
          'flex items-center border-b border-white/10 py-6',
          collapsed ? 'justify-center px-0' : 'justify-between px-6',
        )}
      >
        {collapsed ? (
          <span className="text-xl font-bold" style={{ color: '#147F23' }}>B</span>
        ) : (
          <div>
            <span className="text-xl font-bold tracking-tight">
              <span style={{ color: '#147F23' }}>BIO</span>
              <span className="text-xs font-normal mx-0.5 relative" style={{ color: '#DD8005', top: '-1px' }}>in</span>
              <span style={{ color: '#147F23' }}>FOOD</span>
            </span>
            <p className="text-xs text-gray-500 mt-0.5">ERP</p>
          </div>
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
        {navItems
          .filter((item) => !item.roles || item.roles.includes(session.role))
          .map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  active ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
                )}
                style={active ? { backgroundColor: '#147F23' } : {}}
              >
                <Icon size={18} />
                {!collapsed && label}
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
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: '#147F23' }}
          title={collapsed ? `${session.email} (${session.role})` : undefined}
        >
          {initials}
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
