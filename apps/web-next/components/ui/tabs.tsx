'use client';

import { Tab, TabList } from '@astryxdesign/core';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface TabDef {
  value: string;
  label: string;
}

/*
 * Thin adaptor over the Astryx TabList: the data-driven uncontrolled contract
 * (tabs + panels records) is unchanged, the system owns the tablist role,
 * roving focus and the selected indicator. Panels stay owned by this adaptor
 * so their content keeps mounting only when active. The system moves focus
 * with the arrow keys and activates on click/Enter; the onFocus wiring keeps
 * the MD3-era selection-follows-focus behavior so arrows still switch panels
 * instantly.
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

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <TabList role="tablist" value={value} onChange={setValue}>
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            id={`tab-${tab.value}`}
            value={tab.value}
            label={tab.label}
            panelId={`tabpanel-${tab.value}`}
            onFocus={() => setValue(tab.value)}
          />
        ))}
      </TabList>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          role="tabpanel"
          id={`tabpanel-${tab.value}`}
          aria-labelledby={`tab-${tab.value}`}
          hidden={tab.value !== value}
          className="text-sm text-on-surface outline-none"
        >
          {tab.value === value ? panels[tab.value] : null}
        </div>
      ))}
    </div>
  );
}
