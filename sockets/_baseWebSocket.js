import { initCancellationToken } from "./_cancellationToken.js";

/**
 * BaseWebSocket provides a structured WebSocket interface with:
 * - Cancellation support
 * - Automatic message handling
 * - Progress reporting
 * - File/JSON data sending
 *
 * Subclasses must implement `handleAction(payload)` to define custom behavior.
 */
export class BaseWebSocket {
  /**
   * @param {WebSocket} ws - The underlying WebSocket instance
   */
  constructor(ws) {
    this.ws = ws;

    // Cancellation token to allow stopping ongoing tasks
    this.cancelToken = initCancellationToken();

    // Bind WebSocket events
    this.ws.on("message", this.onMessage.bind(this));
    this.ws.on("close", this.onClose.bind(this));
  }

  /**
   * Handles incoming messages from the WebSocket
   * @param {Buffer|string} message - Incoming message or file buffer
   * @param {boolean} isBinary - Whether the message is binary
   */
  async onMessage(message, isBinary) {
    let payload;

    // Try to parse/format the payload
    try {
      payload = this.formatPayload(message, isBinary);
    } catch (err) {
      this.sendIfActive(err.message);
      this.ws.close();
      return;
    }

    // Ignore empty/cancelled payloads
    if (!payload) return;

    // Attempt to handle the action and report completion
    try {
      await this.handleAction(payload);
      this.sendIfActive("✅ Search Complete.");
    } catch (err) {
      this.sendIfActive(`❌ Error: ${err.message || "Unknown error"}`);
    } finally {
      // Close the WebSocket after processing
      this.ws.close();
    }
  }

  /**
   * Triggered when the WebSocket closes
   * Cancels any ongoing tasks using the cancellation token
   */
  onClose() {
    this.cancelToken.cancel();
  }

  /**
   * Converts raw messages into structured payloads
   * Supports JSON messages and binary file buffers
   * @param {Buffer|string} message
   * @param {boolean} isBinary
   * @returns {Object|null} Parsed payload or null if action was "cancel"
   */
  formatPayload(message, isBinary) {
    if (isBinary) {
      // For file uploads, wrap the buffer in an object
      return { fileBuffer: message };
    } else {
      const payload = JSON.parse(message);

      // If the client requests cancellation, stop processing
      if (payload.action === "cancel") {
        this.cancelToken.cancel();
        return null;
      }
      return payload;
    }
  }

  /**
   * Abstract method to process a payload
   * Must be implemented in subclasses
   * @param {Object} payload
   */
  async handleAction() {
    throw new Error("handleAction(payload) must be implemented in subclass.");
  }

  /**
   * Sends raw data to the WebSocket if it is open
   * @param {any} data
   */
  sendData(data) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(data);
    }
  }

  /**
   * Sends a progress update to the client
   * Automatically closes WebSocket if update is "Cancelled"
   * @param {string} msg
   */
  progressUpdate(msg) {
    this.sendData(msg);
    if (msg === "Cancelled") this.ws.close();
  }

  /**
   * Sends a file (buffer) to the client
   * @param {Buffer} buffer
   */
  async returnFile(buffer) {
    this.sendIfActive(buffer);
  }

  /**
   * Sends a message only if the operation has not been cancelled
   * @param {any} msg
   */
  sendIfActive(msg) {
    if (!this.cancelToken.isCancelled()) {
      this.sendData(msg);
    }
  }
}
