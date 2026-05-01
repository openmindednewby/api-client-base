import type { ApiEvent } from './apiEventTypes';

/** Listener signature for {@link ApiEventBus}. */
export type ApiEventListener = (event: ApiEvent) => void;

/**
 * Lightweight, typed pub/sub bus for bridging an HTTP interceptor layer to
 * UI components without coupling either side.
 *
 * Listener errors are silently caught so one broken listener cannot affect
 * others. The package exposes both the {@link ApiEventBus} class (for tests
 * or callers needing an isolated instance) and a singleton `apiEventBus`
 * for the typical case.
 */
export class ApiEventBus {
  private listeners = new Set<ApiEventListener>();

  /**
   * Subscribe to API events.
   * @returns An unsubscribe function.
   */
  subscribe(listener: ApiEventListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Emit an API event to all subscribers. Listener errors are swallowed. */
  emit(event: ApiEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently swallow listener errors to prevent cascading failures.
      }
    }
  }

  /** Remove all listeners. Useful for cleanup in tests. */
  clear(): void {
    this.listeners.clear();
  }
}

/** Singleton instance shared across a single application. */
export const apiEventBus = new ApiEventBus();
