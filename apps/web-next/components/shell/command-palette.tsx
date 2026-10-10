'use client';

import {
  closePalette,
  getPaletteOpen,
  openPalette,
  subscribePalette,
} from '@/lib/use-command-palette';
import {
  LayoutDashboard,
  Search,
  Settings,
  CircleUserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface Command {
  label: string;
  icon: LucideIcon;
  href: string;
}

/**
 * MD3 search view (port of the Nuxt variant's CommandPalette): 28dp top
 * corners, surface-container-high, elevation 3. Arrow keys + Enter navigate,
 * Escape closes, and the ⌘K / Ctrl+K global shortcut is bound here (the
 * Nuxt variant binds it in a client plugin).
 */
export function CommandPalette() {
  const t = useTranslations();
  const router = useRouter();
  const open = useSyncExternalStore(subscribePalette, getPaletteOpen, getPaletteOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCommands: Command[] = [
    { label: t('nav.dashboard'), icon: LayoutDashboard, href: '/admin/dashboard' },
    { label: t('nav.users'), icon: Users, href: '/admin/users' },
    { label: t('nav.settings'), icon: Settings, href: '/admin/settings' },
    { label: t('nav.profile'), icon: CircleUserRound, href: '/admin/profile' },
  ];

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter((command) => command.label.toLowerCase().includes(q));
  })();

  function execute(command: Command) {
    closePalette();
    router.push(command.href);
  }

  // Global shortcut + reset + focus on open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (getPaletteOpen()) closePalette();
        else {
          setQuery('');
          setActiveIndex(0);
          openPalette();
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  function onKeydown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((activeIndex + 1) % (filtered.length || 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((activeIndex - 1 + filtered.length) % (filtered.length || 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const command = filtered[activeIndex];
      if (command) execute(command);
    } else if (event.key === 'Escape') {
      closePalette();
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-scrim" onClick={closePalette} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette.placeholder')}
        className="fixed left-1/2 top-[20%] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-t-2xl rounded-b-lg bg-surface-container-high pb-2 shadow-theme-lg focus:outline-none"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            aria-label={t('commandPalette.placeholder')}
            type="text"
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-on-surface-variant/85 focus:outline-none"
            onKeyDown={onKeydown}
          />
          <kbd className="hidden rounded-sm border border-outline-variant bg-surface px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="pt-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t('commandPalette.noResults')}
            </p>
          ) : (
            <>
              <p className="px-4 pb-1 text-xs font-medium text-muted-foreground">
                {t('commandPalette.navigation')}
              </p>
              <ul>
                {filtered.map((command, index) => {
                  const Icon = command.icon;
                  return (
                    <li
                      key={command.label}
                      className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-colors ${
                        index === activeIndex
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'text-foreground hover:bg-on-surface-variant/8'
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => execute(command)}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 ${index === activeIndex ? '' : 'text-muted-foreground'}`}
                        aria-hidden="true"
                      />
                      {command.label}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
