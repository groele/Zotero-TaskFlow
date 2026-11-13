/**
 * Zotero TaskFlow - Declarative AbortController Lifecycle Helpers
 */

export interface TimerHostLike {
  setTimeout?: (cb: () => void, ms?: number) => ReturnType<typeof setTimeout>;
  clearTimeout?: (id: ReturnType<typeof setTimeout>) => void;
}

export interface ListenerTargetLike {
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) => void;
  ownerDocument?: Document | null;
  document?: Document | null;
}

function createFallbackController(): AbortController {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  let aborted = false;
  const signal = {
    get aborted() { return aborted; },
    reason: undefined,
    onabort: null,
    throwIfAborted() {},
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject) { listeners.add(listener); },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) { listeners.delete(listener); },
    dispatchEvent() { return true; }
  } as unknown as AbortSignal;
  return {
    signal,
    abort(reason?: unknown) {
      if (aborted) return;
      aborted = true;
      (signal as { reason?: unknown }).reason = reason;
      const evt = { type: 'abort', target: signal } as unknown as Event;
      for (const listener of [...listeners]) {
        listeners.delete(listener);
        if (typeof listener === 'function') listener(evt);
        else listener.handleEvent(evt);
      }
    }
  } as AbortController;
}

export function createScopedController(
  win?: { AbortController?: typeof AbortController } | null
): AbortController {
  const Ctor = win?.AbortController || (typeof AbortController !== 'undefined' ? AbortController : null);
  return Ctor ? new Ctor() : createFallbackController();
}

export function linkParentSignal(child: AbortController, parent?: AbortSignal | null): void {
  if (!parent) return;
  if (parent.aborted) {
    child.abort();
    return;
  }
  parent.addEventListener('abort', () => child.abort(), { once: true });
}

export function addAbortableListener(
  target: ListenerTargetLike | null | undefined,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
  signal?: AbortSignal | null
): void {
  if (!target?.addEventListener) return;
  if (signal?.aborted) return;
  const opts: AddEventListenerOptions =
    typeof options === 'boolean' ? { capture: options } : { ...(options || {}) };
  if (!signal) {
    target.addEventListener(type, listener, opts);
    return;
  }
  const ownerDoc = target.ownerDocument || target.document;
  const targetWin = ownerDoc?.defaultView || (target as { AbortSignal?: typeof AbortSignal });
  const TargetAbortSignal = (targetWin as { AbortSignal?: typeof AbortSignal } | null | undefined)?.AbortSignal;
  if (TargetAbortSignal && signal instanceof TargetAbortSignal) {
    target.addEventListener(type, listener, { ...opts, signal });
    return;
  }
  if (!TargetAbortSignal) {
    try {
      target.addEventListener(type, listener, { ...opts, signal });
      return;
    } catch (_) {}
  }
  target.addEventListener(type, listener, opts);
  signal.addEventListener(
    'abort',
    () => {
      try {
        target.removeEventListener?.(type, listener, Boolean(opts.capture));
      } catch (_) {}
    },
    { once: true }
  );
}

export function setAbortableTimeout(
  callback: () => void,
  delayMs: number,
  signal?: AbortSignal | null,
  timerHost?: TimerHostLike | null,
  tracker?: Set<ReturnType<typeof setTimeout>> | null
): ReturnType<typeof setTimeout> | null {
  if (signal?.aborted) return null;
  const schedule = timerHost?.setTimeout ? timerHost.setTimeout.bind(timerHost) : setTimeout;
  const cancel = timerHost?.clearTimeout ? timerHost.clearTimeout.bind(timerHost) : clearTimeout;
  let cleared = false;
  let timerId!: ReturnType<typeof setTimeout>;
  const onAbort = (): void => {
    if (cleared) return;
    cleared = true;
    tracker?.delete(timerId);
    try {
      cancel(timerId);
    } catch (_) {}
  };
  timerId = schedule(() => {
    if (cleared || signal?.aborted) return;
    cleared = true;
    tracker?.delete(timerId);
    signal?.removeEventListener('abort', onAbort);
    callback();
  }, delayMs);
  tracker?.add(timerId);
  signal?.addEventListener('abort', onAbort, { once: true });
  return timerId;
}

export function getErrorInfo(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || String(error), stack: error.stack };
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const record = error as { message?: unknown; stack?: unknown };
    return {
      message: record.message != null ? String(record.message) : String(error),
      stack: typeof record.stack === 'string' ? record.stack : undefined
    };
  }
  return { message: String(error) };
}
