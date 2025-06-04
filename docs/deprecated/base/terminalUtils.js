/**
 * Utility functions for terminal output like progress bars and spinners.
 *
 * This module includes:
 * - `progressBar(current, total, barWidth)`: Displays a progress bar in the terminal.
 * - `Spinner`: A class to create and manage a spinner animation in the terminal.
 */

/**
 * Displays a progress bar in the terminal.
 *
 * @param {number} current - The current progress value.
 * @param {number} total - The total value representing 100% completion.
 * @param {number} [barWidth=30] - The width of the progress bar in characters.
 */
function progressBar(current, total, barWidth = 30) {
  const percent = current / total;
  const filled = Math.round(percent * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  let text = `${current}/${total}`;
  if (current === total) {
    text = "✅ Finished!\n";
  }

  process.stdout.write(`\r[${bar}] ${text}`);
}

/**
 * Class to display a terminal spinner animation.
 * Useful for indicating progress in long-running CLI operations.
 */
class Spinner {
  /**
   * Creates a new TerminalSpinner instance.
   *
   * @param {string[]} frames - An array of characters used to animate the spinner.
   * @param {number} intervalMs - The time in milliseconds between frame updates.
   */
  constructor(frames = ["-", "\\", "|", "/"], intervalMs = 100) {
    this.frames = frames; // Spinner animation frames
    this.intervalMs = intervalMs; // Time between frame updates
    this.index = 0; // Current frame index
    this.timer = null; // Reference to the active interval timer
  }

  /**
   * Starts the spinner animation.
   *
   * * @param {string} text - The text to display while the spinner is running.
   */
  start(text = "Loading...") {
    if (this.timer) return; // Avoid starting multiple spinners

    this.timer = setInterval(() => {
      // Print the current frame with the spinner text
      process.stdout.write(
        `\r${this.frames[this.index++ % this.frames.length]} ${text}`
      );
    }, this.intervalMs);
  }

  /**
   * Stops the spinner animation and displays a final message.
   *
   * @param {string} text - The text to display after the spinner stops.
   */
  stop(text = "Finished!") {
    if (!this.timer) return; // Spinner is not running

    clearInterval(this.timer); // Stop the animation interval
    this.timer = null; // Reset the timer reference
    process.stdout.write(`'\r\x1b[2K${text}\n`); // Clear the line and print the done message
  }
}

export { progressBar, Spinner };
