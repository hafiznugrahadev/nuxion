'use client';

import { cn } from '@/lib/utils';
import { useRef, useState, type KeyboardEvent } from 'react';

export interface TabDef {
  value: string;
  label: string;
}

/**
 * MD3 primary tabs (port of the Nuxt variant's ui/Tabs.vue): active tab
 * colored primary with a 3dp bottom indicator and semibold label. Hand-rolled
 * tablist with arrow-key roving so no extra primitive dependency is needed
 * for a static code-sample switcher. Panel content per tab arrives as the
 * `panels` record (server-renderable nodes passed into this client island).
 */
export function Tabs({
  tabs,
  panels,
  className,
}: {
  tabs: TabDef[];
  panels: Record<string, React.ReactNode>;
  className?: string;
}) {
  const [value, setValue] = useState(tabs[0]!.value);
  const interacted = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );

  // Focus follows the selection only after a real user interaction — never
  // on first paint, which would steal focus from the page.
  function focusActive() {
    if (!interacted.current) return;
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[activeIndex]?.focus();
  }

  function select(next: string) {
    interacted.current = true;
    setValue(next);
    requestAnimationFrame(focusActive);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    select(
      tabs[(activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]!
        .value,
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        ref={listRef}
        role="tablist"
        className="flex gap-1 border-b border-outline-variant"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`tab-${tab.value}`}
              aria-selected={active}
              aria-controls={`tabpanel-${tab.value}`}
              tabIndex={active ? 0 : -1}
              className={cn(
                '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-[3px] border-transparent px-4 py-2.5 text-sm font-medium text-on-surface-variant outline-none transition-colors hover:text-on-surface focus-visible:ring-2 focus-visible:ring-ring',
                active && 'border-primary font-semibold text-primary',
              )}
              onClick={() => select(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.value}
          role="tabpanel"
          id={`tabpanel-${tab.value}`}
          aria-labelledby={`tab-${tab.value}`}
          hidden={index !== activeIndex}
          className="text-sm text-on-surface outline-none"
        >
          {index === activeIndex ? panels[tab.value] : null}
        </div>
      ))}
    </div>
  );
}
