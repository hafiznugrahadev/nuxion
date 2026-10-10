'use client';

import { BrandLogo } from '@/components/common/brand-logo';
import { UserMenu } from '@/components/shell/user-menu';
import { closeMobile, getSidebarState, subscribeSidebar } from '@/lib/use-sidebar';
import { LayoutDashboard, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

/**
 * MD3 navigation drawer (256dp) / rail (80dp collapsed) — the port of the
 * Nuxt variant's AppSidebar. Nav lists only routes that exist in this
 * variant; roles/settings join with their stages. No divider: separation
 * comes from tonal surfaces.
 */
export function AppSidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const { isExpanded, isMobileOpen } = useSyncExternalStore(
    subscribeSidebar,
    getSidebarState,
    getSidebarState,
  );

  // The icon-only rail is a desktop concept; the mobile drawer is always full.
  const showFull = isMobileOpen || isExpanded;

  const items = [
    { label: t('nav.dashboard'), href: '/admin/dashboard', icon: LayoutDashboard },
    { label: t('nav.users'), href: '/admin/users', icon: Users },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* Mobile scrim (MD3 modal drawer) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-scrim lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-[width,transform] duration-300 ease-emphasized ${
          isExpanded ? 'lg:w-64' : 'lg:w-20'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div className={`flex h-16 items-center ${showFull ? 'px-4' : 'justify-center px-0'}`}>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 font-semibold"
            onClick={closeMobile}
          >
            <BrandLogo className="h-10" />
            {showFull && (
              <span className="text-base tracking-tight text-foreground">{t('app.name')}</span>
            )}
          </Link>
        </div>

        {/* Nav: active item is a tonal container with 12dp corners and a 4dp
             primary bar on the leading edge. */}
        <nav aria-label={t('nav.menu')} className="flex-1 overflow-y-auto px-3 py-2">
          <p
            className={`mb-2 px-4 text-xs font-medium text-muted-foreground ${showFull ? '' : 'text-center'}`}
          >
            {showFull ? t('nav.menu') : '•••'}
          </p>
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={showFull ? undefined : item.label}
                    className={`group relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                      showFull ? 'gap-3 px-4 py-3' : 'justify-center px-0 py-3'
                    } ${
                      isActive(item.href)
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-on-surface/8 hover:text-foreground'
                    }`}
                    onClick={closeMobile}
                  >
                    {isActive(item.href) && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <Icon size={22} className="shrink-0" aria-hidden="true" />
                    {showFull && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer — session card with sign-out */}
        <div
          className={`border-t border-sidebar-border ${showFull ? 'p-3' : 'flex justify-center p-2'}`}
        >
          <UserMenu showDetails={showFull} />
        </div>
      </aside>
    </>
  );
}
