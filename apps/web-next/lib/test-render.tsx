import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

// React 19 act() needs this flag outside react-dom/test-utils.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Minimal renderHook harness (no @testing-library in this workspace): mounts
 * the hook in a host, captures its value on every render, exposes rerender.
 * `wrapper` supplies providers (e.g. QueryClientProvider).
 */
export function renderHook<T>(
  fn: () => T,
  wrapper?: (props: { children: ReactNode }) => ReactNode,
): { result: { current: T }; rerender: () => void; unmount: () => void } {
  const result = { current: undefined as unknown as T };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);

  function Probe() {
    result.current = fn();
    return null;
  }

  const render = () => {
    const tree = wrapper ? wrapper({ children: <Probe /> }) : <Probe />;
    act(() => {
      root.render(tree);
    });
  };
  render();

  return {
    result,
    rerender: render,
    unmount: () =>
      act(() => {
        root.unmount();
        host.remove();
      }),
  };
}

/** Renders arbitrary JSX with the same act() harness; returns the host. */
export function renderJsx(node: ReactNode): { host: HTMLElement; unmount: () => void } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    unmount: () =>
      act(() => {
        root.unmount();
        host.remove();
      }),
  };
}

/** A JSON fetch Response stub. */
export function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
