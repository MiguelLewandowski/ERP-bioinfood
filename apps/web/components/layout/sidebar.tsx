'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Users, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  session: { sub: string; email: string; role: string };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN', 'APROVA'] },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const initials = session.email.slice(0, 2).toUpperCase();

  return (
    <aside
      className="w-60 flex flex-col h-full shrink-0"
      style={{ backgroundColor: '#1D1D1B' }}
    >
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">
          <span style={{ color: '#147F23' }}>BIO</span>
          <span className="text-xs font-normal mx-0.5 relative" style={{ color: '#DD8005', top: '-1px' }}>in</span>
          <span style={{ color: '#147F23' }}>FOOD</span>
        </span>
        <p className="text-xs text-gray-500 mt-0.5">ERP</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(session.role))
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
              )}
              style={pathname.startsWith(href) ? { backgroundColor: '#147F23' } : {}}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: '#147F23' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-300 truncate">{session.email}</p>
          <p className="text-xs text-gray-500">{session.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
