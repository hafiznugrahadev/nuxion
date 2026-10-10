'use client';

import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { UserMenu } from '@/components/shell/user-menu';
import { toggleExpanded, toggleMobile, getSidebarState, subscribeSidebar } from '@/lib/use-sidebar';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

/**
 * MD3 top app bar (port of the Nuxt variant's AppHeader, minus the command
 * palette anchor — that ships with its own stage, and a dead search button
 * is worse than none). Surface at rest, tonal once the page scrolls under it.
 */
export function AdminHeader() {
  const t = useTranslations('a11y');
  const { isExpanded, isMobileOpen } = useSyncExternalStore(
    subscribeSidebar,
    getSidebarState,
    getSidebarState,
  );

  return (
    <header className="sticky top-0 z-30 bg-surface">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex flex-1 items-center gap-2">
          {/* Mobile: open off-canvas drawer · Desktop: collapse to icon rail */}
          <button
            type="button"
            className="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground lg:hidden"
            aria-label={isMobileOpen ? t('closeMenu') : t('openMenu')}
            onClick={toggleMobile}
          >
            {isMobileOpen ? (
              <PanelLeftClose size={22} aria-hidden="true" />
            ) : (
              <PanelLeft size={22} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="touch-target relative hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground lg:inline-flex"
            aria-label={isExpanded ? t('collapseSidebar') : t('expandSidebar')}
            onClick={toggleExpanded}
          >
            {isExpanded ? (
              <PanelLeftClose size={22} aria-hidden="true" />
            ) : (
              <PanelLeft size={22} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
