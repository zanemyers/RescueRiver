import { initTooltips } from "./tooltip.js";

/**
 * Base class for client-side form applications that interact with
 * WebSocket endpoints and show progress for long-running tasks.
 */
export class BaseFormApp {
  /**
   * @param {string} formPartial - Name of the EJS partial to load for the form
   * @param {string} socketName - Name of the WebSocket endpoint to connect to
   */
  constructor(formPartial, socketName) {
    this.socket = null; // WebSocket connection instance
    this.elements = {}; // Cached DOM elements used across methods
    this.formPartial = formPartial;
    this.socketName = socketName;
  }

  /**
   * Loads the form partial into the container, initializes tooltips,
   * caches commonly used elements, and sets up submit handling.
   */
  async showForm() {
    const res = await fetch(`partials/${this.formPartial}`);
    document.getElementById("formContainer").innerHTML = await res.text();
    initTooltips();
    this.cacheElements();
    this.onFormLoad(); // Additional form setup defined in subclass
    this.handleFormSubmit();
  }

  /**
   * Loads the progress partial into the container and sets up
   * the cancel button to allow aborting the current WebSocket task.
   */
  async showProgress() {
    const res = await fetch("/partials/progress");
    document.getElementById("formContainer").innerHTML = await res.text();

    document.getElementById("progressButton").addEventListener("click", (event) => {
      event.currentTarget.disabled = true;

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: "cancel" }));
        this.appendProgress(document.getElementById("progressArea"), "Cancelling....");
      }
    });
  }

  /**
   * Sets up the form submission listener:
   */
  handleFormSubmit() {
    const form = document.getElementById("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.classList.add("was-validated");

      const payload = this.validateFormInput();
      if (!payload) {
        const errorArea = document.getElementById("formError");
        if (errorArea) errorArea.textContent = "❗ Please fill out all required fields.";
        return;
      }

      await this.showProgress();

      if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close();
      this.socket = new WebSocket(`ws://localhost:3000/ws/${this.socketName}`);

      let pendingFilename = "download.xlsx";
      this.socket.binaryType = "arraybuffer";

      // Send payload when connection opens
      this.socket.onopen = () => this.handlePayload(payload);

      // Handle messages (progress updates, cancelled task, or file download)
      this.socket.onmessage = (event) => {
        const progressArea = document.getElementById("progressArea");
        if (!progressArea) return;

        if (typeof event.data === "string") {
          const message = event.data;

          if (message === "Cancelled") {
            this.updateProgress(progressArea, "❌ Search Cancelled.");
            this.socket.close();
            return;
          }

          if (message.startsWith("DOWNLOAD:")) {
            // Save filename for upcoming file
            pendingFilename = message.replace("DOWNLOAD:", "").trim();
            return;
          }

          message.startsWith("STATUS:")
            ? this.updateProgress(progressArea, message.replace("STATUS:", "").trim())
            : this.appendProgress(progressArea, message.trim());
        } else {
          // Binary file (Excel)
          const blob = new Blob([event.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = pendingFilename;
          a.click();
          URL.revokeObjectURL(url);
        }
      };

      // Reset UI on WebSocket close
      this.socket.onclose = () => {
        this.socket = null;
        const progressButton = document.getElementById("progressButton");
        if (!progressButton) return;

        progressButton.textContent = "Close";
        progressButton.classList.remove("btn-danger");
        progressButton.classList.add("btn-secondary");
        progressButton.disabled = false;

        progressButton.onclick = () => this.showForm();
      };

      this.socket.onerror = () => {
        alert("❌ WebSocket error.");
        this.socket.close();
      };
    });
  }

  /**
   * Updates the last line in the progress area with new text.
   * Prevents overwriting "Cancelling...." message with unrelated updates.
   *
   * @param {HTMLElement} area - Progress display area
   * @param {string} text - New text to show
   */
  updateProgress(area, text) {
    const lines = area.textContent.trim().split("\n");
    const lastLine = lines[lines.length - 1];

    if (lastLine === "Cancelling...." && text !== "❌ Search Cancelled.") return;

    lines[lines.length - 1] = text;
    area.textContent = lines.join("\n");
  }

  /**
   * Appends a new line of progress to the progress area.
   *
   * @param {HTMLElement} area - Progress display area
   * @param {string} text - Text to append
   */
  appendProgress(area, text) {
    area.textContent += (area.textContent ? "\n" : "") + text;
  }

  // Subclass must implement: additional setup after form load
  onFormLoad() {
    throw new Error("onFormLoad() must be implemented in subclass.");
  }

  // Subclass must implement: cache frequently used form elements
  cacheElements() {
    throw new Error("cacheElements() must be implemented in subclass.");
  }

  // Subclass must implement: validate and return form input as payload
  validateFormInput() {
    throw new Error("validateFormInput() must be implemented in subclass.");
  }

  /**
   * Sends the payload to the WebSocket.
   * Supports sending either File objects (converted to ArrayBuffer)
   * or regular JSON payloads.
   *
   * @param {Object|File} payload
   */
  handlePayload(payload) {
    if (payload instanceof File) {
      const reader = new FileReader();
      reader.onload = () => this.socket.send(reader.result);
      reader.readAsArrayBuffer(payload);
    } else {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
