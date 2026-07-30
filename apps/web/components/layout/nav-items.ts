import {
  LayoutDashboard, FolderKanban, CalendarDays, Users, Settings, Target, FileCheck,
  Package, NotebookPen,
  type LucideIcon,
} from 'lucide-react';

// Fonte única dos itens de navegação — consumida pela sidebar, pelo drawer
// mobile e pelo command palette. Novo módulo entra AQUI, uma vez.
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/activities', label: 'Atividades', icon: CalendarDays },
  // Sem `roles`: toda pessoa logada tem as PRÓPRIAS anotações, inclusive
  // CLIENTE. Ninguém vê as de ninguém — nem o ADMIN (ver CLAUDE.md).
  { href: '/anotacoes', label: 'Anotações', icon: NotebookPen },
  { href: '/crm', label: 'CRM', icon: Target, roles: ['ADMIN'] },
  { href: '/pops', label: 'POPs', icon: FileCheck, roles: ['ADMIN', 'PADRAO'] },
  { href: '/estoque', label: 'Estoque', icon: Package, roles: ['ADMIN', 'PADRAO'] },
  { href: '/users', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function navItemsForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
