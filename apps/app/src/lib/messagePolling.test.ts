import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOnlinePolling } from './messagePolling';

describe('message polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not schedule or run requests while the browser is offline', async () => {
    let online = false;
    const task = vi.fn().mockResolvedValue(undefined);
    const stop = startOnlinePolling(task, { online: () => online, initialDelayMs: 1000 });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(task).not.toHaveBeenCalled();

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.runOnlyPendingTimersAsync();
    expect(task).toHaveBeenCalledTimes(1);
    stop();
  });

  it('backs off after a failed poll and resets after a success', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const stop = startOnlinePolling(task, {
      online: () => true,
      initialDelayMs: 1000,
      maxDelayMs: 8000
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(3);
    stop();
  });
});
