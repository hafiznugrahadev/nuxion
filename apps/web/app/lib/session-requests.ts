export class SessionRequests {
  private tail: Promise<void> = Promise.resolve();
  private closing: Promise<void> | null = null;

  run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.closing) return Promise.reject(new Error('Logout in progress'));
    const result = this.tail.then(() => this.perform(operation));
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  logout(operation: (signal: AbortSignal) => Promise<unknown>): Promise<void> {
    if (this.closing) return this.closing;
    const closing = this.tail
      .then(() => this.perform(operation))
      .then(() => undefined)
      .finally(() => {
        if (this.closing === closing) this.closing = null;
      });
    this.tail = closing.catch(() => undefined);
    this.closing = closing;
    return closing;
  }

  private perform<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error('Authentication request deadline exceeded');
        controller.abort(error);
        reject(error);
      }, 30_000);
    });
    const result = Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      timeout,
    ]).finally(() => {
      clearTimeout(timer);
    });
    return result;
  }
}
