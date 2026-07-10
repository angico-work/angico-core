interface PollingOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  online?: () => boolean;
}

export function startOnlinePolling(
  task: () => Promise<void>,
  options: PollingOptions = {}
): () => void {
  const initialDelay = options.initialDelayMs ?? 10_000;
  const maxDelay = options.maxDelayMs ?? 60_000;
  const isOnline = options.online ?? (() => navigator.onLine);
  let delay = initialDelay;
  let timer: number | undefined;
  let running = false;
  let active = true;

  const cancelTimer = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };

  const schedule = (wait: number) => {
    cancelTimer();
    if (!active || !isOnline()) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      void poll();
    }, wait);
  };

  const poll = async () => {
    if (!active || running || !isOnline()) return;
    running = true;
    try {
      await task();
      delay = initialDelay;
    } catch {
      delay = Math.min(maxDelay, delay * 2);
    } finally {
      running = false;
      schedule(delay);
    }
  };

  const handleOnline = () => schedule(0);
  const handleOffline = () => cancelTimer();
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  schedule(delay);

  return () => {
    active = false;
    cancelTimer();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
