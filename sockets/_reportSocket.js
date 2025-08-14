import { BaseWebSocket } from "./_baseWebSocket.js";
import { reportScraper } from "../apps/report_scraper/reportScraper.js";

/**
 * WebSocket subclass specifically for handling report scraping requests.
 * Manages the reception of JSON search parameters and file uploads,
 * then delegates the scraping task to reportScraper.
 */
class _ReportSocket extends BaseWebSocket {
  constructor(ws) {
    super(ws);

    // Store the current session's data until both JSON and file buffer are received
    this.currentSession = { jsonData: null, fileBuffer: null };
  }

  /**
   * Formats incoming WebSocket messages.
   * Handles both JSON messages and binary file uploads.
   *
   * @param {Buffer|string} message - Incoming WebSocket message
   * @param {boolean} isBinary - True if message is binary (file upload)
   * @returns {Object|null} Combined payload for scraping, or null if waiting for more data
   * @throws {Error} If file buffer arrives before JSON data
   */
  formatPayload(message, isBinary) {
    if (isBinary) {
      // Received a file buffer
      this.currentSession.fileBuffer = message;

      // Ensure JSON data has already been received
      if (this.currentSession.jsonData) {
        // Combine JSON parameters with the uploaded file
        return {
          ...this.currentSession.jsonData,
          fileBuffer: this.currentSession.fileBuffer,
        };
      } else {
        throw new Error("❌ Missing JSON data.");
      }
    } else {
      // Parse JSON message containing search parameters
      const payload = JSON.parse(message);

      // If the client requests cancellation, stop processing
      if (payload.action === "cancel") {
        this.cancelToken.cancel();
        return null;
      }

      this.currentSession.jsonData = payload.data;
      return null; // Wait for file to arrive before returning payload
    }
  }

  /**
   * Handles the scraping action using the reportScraper function.
   *
   * @param {Object} payload - Combined JSON parameters and file buffer
   */
  async handleAction(payload) {
    await reportScraper({
      searchParams: payload,
      progressUpdate: this.progressUpdate.bind(this), // Send progress updates via WebSocket
      returnFile: this.returnFile.bind(this), // Return the resulting file via WebSocket
      cancelToken: this.cancelToken, // Allow cancellation of scraping
    });
  }
}

/**
 * Initialize a new WebSocket connection for report scraping.
 *
 * @param {WebSocket} ws - The WebSocket connection
 */
export function reportSocket(ws) {
  new _ReportSocket(ws);
}
