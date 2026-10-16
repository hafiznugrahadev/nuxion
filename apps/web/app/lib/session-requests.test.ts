import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionRequests } from './session-requests';

afterEach(() => vi.useRealTimers());

describe('logout cookie ordering', () => {
  it('waits for in-flight session cookies before logout and rejects new session requests', async () => {
    const requests = new SessionRequests();
    const events: string[] = [];
    let complete!: () => void;
    const login = requests.run(
      () =>
        new Promise<void>((resolve) => {
          complete = () => {
            events.push('login cookie');
            resolve();
          };
        }),
    );
    await Promise.resolve();
    const logout = requests.logout(async () => {
      events.push('logout cookie');
    });
    await expect(requests.run(async () => 'refresh')).rejects.toThrow('Logout in progress');
    expect(events).toEqual([]);
    complete();
    await Promise.all([login, logout]);
    expect(events).toEqual(['login cookie', 'logout cookie']);
    await expect(requests.run(async () => 'new explicit login')).resolves.toBe(
      'new explicit login',
    );
  });

  it('bounds an unfinished session request so logout cannot wait forever', async () => {
    vi.useFakeTimers();
    const requests = new SessionRequests();
    let signal!: AbortSignal;
    const pending = requests.run((incoming) => {
      signal = incoming;
      return new Promise(() => {});
    });
    const rejection = expect(pending).rejects.toThrow('deadline');
    const revoke = vi.fn(async () => undefined);
    const logout = requests.logout(revoke);
    await vi.advanceTimersByTimeAsync(30_000);
    await rejection;
    await logout;
    expect(signal.aborted).toBe(true);
    expect(revoke).toHaveBeenCalledOnce();
  });
});

it('dispatches cookie-producing operations in FIFO order', async () => {
  const requests = new SessionRequests();
  const dispatched: string[] = [];
  let finishA!: () => void;
  const first = requests.run(() => {
    dispatched.push('login A');
    return new Promise<void>((resolve) => {
      finishA = resolve;
    });
  });
  const second = requests.run(async () => {
    dispatched.push('login B');
  });
  await vi.waitFor(() => expect(dispatched).toEqual(['login A']));
  expect(dispatched).not.toContain('login B');
  finishA();
  await Promise.all([first, second]);
  expect(dispatched).toEqual(['login A', 'login B']);
});
