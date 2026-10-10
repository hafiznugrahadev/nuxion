'use client';

import { CommandPalette } from '@/components/shell/command-palette';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { NotificationPanel } from '@/components/shell/notification-panel';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { UserMenu } from '@/components/shell/user-menu';
import { toggleExpanded, toggleMobile, getSidebarState, subscribeSidebar } from '@/lib/use-sidebar';
import { openPalette } from '@/lib/use-command-palette';
import { PanelLeft, PanelLeftClose, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

/**
 * MD3 top app bar (port of the Nuxt variant's AppHeader): sidebar toggles,
 * the command-palette search anchor (⌘K), language/theme, notifications, and
 * the session menu.
 */
export function AdminHeader() {
  const t = useTranslations('a11y');
  const tp = useTranslations('commandPalette');
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

          {/* MD3 search bar anchor: full pill on surface-container-high */}
          <button
            type="button"
            className="relative hidden max-w-md flex-1 cursor-text items-center sm:flex"
            onClick={openPalette}
          >
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="flex h-10 w-full items-center rounded-full bg-surface-container-high pl-12 pr-16 text-sm text-muted-foreground">
              {tp('placeholder')}
            </span>
            <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-sm border border-outline-variant bg-surface px-1.5 py-0.5 text-xs text-muted-foreground md:inline-flex">
              ⌘ K
            </span>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationPanel />
          <UserMenu />
        </div>
      </div>

      <CommandPalette />
    </header>
  );
}
