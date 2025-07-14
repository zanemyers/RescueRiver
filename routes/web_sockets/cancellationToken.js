export function initCancellationToken() {
  let cancelled = false;

  return {
    cancel() {
      cancelled = true;
    },
    throwIfCancelled() {
      if (cancelled) {
        const err = new Error("Cancelled");
        err.isCancelled = true;
        throw err;
      }
    },
    isCancelled() {
      return cancelled;
    },
  };
}
