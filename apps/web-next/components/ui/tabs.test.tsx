import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { renderJsx } from '../../lib/test-render';

const TABS = [
  { value: 'shared', label: 'shared-types' },
  { value: 'env', label: '.env' },
  { value: 'turbo', label: 'turbo.json' },
];

function mount() {
  return renderJsx(
    <Tabs
      tabs={TABS}
      panels={{
        shared: <p data-testid="panel-shared">SHARED</p>,
        env: <p data-testid="panel-env">ENV</p>,
        turbo: <p data-testid="panel-turbo">TURBO</p>,
      }}
    />,
  );
}

describe('Tabs', () => {
  it('renders the first tab active with only its panel visible', () => {
    const { host, unmount } = mount();
    const tabs = [...host.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    expect(tabs).toHaveLength(3);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    // The active panel renders its content; inactive tabpanels stay as
    // hidden containers (content unmounted — state is not preserved across
    // tabs by design, matching reka-ui's default).
    const panels = [...host.querySelectorAll('[role="tabpanel"]')] as HTMLElement[];
    expect(panels).toHaveLength(3);
    expect(panels[0]!.hidden).toBe(false);
    expect(panels[1]!.hidden).toBe(true);
    expect(panels[0]!.querySelector('[data-testid="panel-shared"]')).not.toBeNull();
    expect(panels[1]!.querySelector('[data-testid="panel-env"]')).toBeNull();
    unmount();
  });

  it('clicking a tab switches the visible panel', async () => {
    const { host, unmount } = mount();
    await act(async () => {
      (host.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    });
    const panels = [...host.querySelectorAll('[role="tabpanel"]')] as HTMLElement[];
    expect(panels[1]!.hidden).toBe(false);
    expect(panels[1]!.querySelector('[data-testid="panel-env"]')).not.toBeNull();
    expect(panels[0]!.querySelector('[data-testid="panel-shared"]')).toBeNull();
    unmount();
  });

  it('ArrowRight/ArrowLeft move the selection with roving tabindex', async () => {
    const { host, unmount } = mount();
    const list = host.querySelector('[role="tablist"]') as HTMLElement;
    const tabs = [...host.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];

    await act(async () => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');

    // wrapping: ArrowLeft from the first tab lands on the last
    await act(async () => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]!.tabIndex).toBe(-1);
    expect(tabs[2]!.tabIndex).toBe(0);
    unmount();
  });

  it('wires aria-controls/aria-labelledby between tabs and panels', () => {
    const { host, unmount } = mount();
    const tab = host.querySelector('[role="tab"]') as HTMLElement;
    const panel = host.querySelector('[role="tabpanel"]') as HTMLElement;
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    unmount();
  });
});
