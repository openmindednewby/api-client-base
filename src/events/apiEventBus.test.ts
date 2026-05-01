import { ApiEventBus, apiEventBus } from './apiEventBus';

import type { ApiEvent } from './apiEventTypes';

describe('ApiEventBus', () => {
  let bus: ApiEventBus;

  beforeEach(() => {
    bus = new ApiEventBus();
  });

  it('delivers events to subscribers', () => {
    const events: ApiEvent[] = [];
    bus.subscribe((e) => events.push(e));
    bus.emit({ type: 'session-expired' });
    expect(events).toEqual([{ type: 'session-expired' }]);
  });

  it('returns an unsubscribe function', () => {
    const events: ApiEvent[] = [];
    const unsubscribe = bus.subscribe((e) => events.push(e));
    unsubscribe();
    bus.emit({ type: 'session-expired' });
    expect(events).toHaveLength(0);
  });

  it('delivers to multiple subscribers', () => {
    const a: ApiEvent[] = [];
    const b: ApiEvent[] = [];
    bus.subscribe((e) => a.push(e));
    bus.subscribe((e) => b.push(e));
    bus.emit({ type: 'session-expired' });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it('isolates listener errors so others still receive', () => {
    const received: ApiEvent[] = [];
    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe((e) => received.push(e));
    bus.emit({ type: 'session-expired' });
    expect(received).toHaveLength(1);
  });

  it('clears all listeners', () => {
    const received: ApiEvent[] = [];
    bus.subscribe((e) => received.push(e));
    bus.clear();
    bus.emit({ type: 'session-expired' });
    expect(received).toHaveLength(0);
  });

  it('exposes a singleton instance', () => {
    expect(apiEventBus).toBeInstanceOf(ApiEventBus);
    const received: ApiEvent[] = [];
    const off = apiEventBus.subscribe((e) => received.push(e));
    apiEventBus.emit({ type: 'session-expired' });
    off();
    expect(received).toEqual([{ type: 'session-expired' }]);
  });
});
