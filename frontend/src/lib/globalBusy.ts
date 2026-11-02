type Listener = (count: number) => void;

let pending = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn(pending));
}

/** Start tracking an in-flight action (usually an API call). */
export function beginGlobalBusy() {
  pending += 1;
  emit();
}

/** Finish one tracked action. */
export function endGlobalBusy() {
  pending = Math.max(0, pending - 1);
  emit();
}

export function getGlobalBusyCount() {
  return pending;
}

export function subscribeGlobalBusy(listener: Listener) {
  listeners.add(listener);
  listener(pending);
  return () => {
    listeners.delete(listener);
  };
}
