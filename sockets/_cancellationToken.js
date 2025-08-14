/**
 * Creates a simple cancellation token object to manage task cancellation.
 * Useful for stopping long-running async operations gracefully.
 *
 * @returns {Object} Cancellation token with methods:
 *   - cancel(): marks the token as cancelled
 *   - throwIfCancelled(): throws an error if cancelled
 *   - isCancelled(): returns boolean indicating cancellation status
 */
export function initCancellationToken() {
  // Internal flag to track cancellation state
  let cancelled = false;

  return {
    /**
     * Marks this token as cancelled.
     * Any future calls to throwIfCancelled() will throw an error.
     */
    cancel() {
      cancelled = true;
    },

    /**
     * Throws an error if this token has been cancelled.
     * Can be used inside async loops or operations to abort early.
     *
     * @throws {Error} "Cancelled" if token is cancelled
     */
    throwIfCancelled() {
      if (cancelled) {
        const err = new Error("Cancelled");
        // Attach a flag to identify cancellation errors
        err.isCancelled = true;
        throw err;
      }
    },

    /**
     * Checks whether this token has been cancelled.
     *
     * @returns {boolean} true if cancelled, false otherwise
     */
    isCancelled() {
      return cancelled;
    },
  };
}
