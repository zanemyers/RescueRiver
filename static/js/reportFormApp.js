import { BaseFormApp } from "./baseFormApp.js";
import { initFileInput } from "./fileInput.js";

/**
 * Handles the initialization, validation, and submission of the report form.
 */
class ReportFormApp extends BaseFormApp {
  constructor() {
    super("report-form", "report");
  }

  /**
   * Initialize extra UI features specific to this form.
   */
  onFormLoad() {
    initFileInput(); // Enable custom file input styling & behavior
    this.initRiverListToggle(); // Set up show/hide behavior for river list
  }

  /**
   * Cache frequently used DOM elements for performance and convenience.
   */
  cacheElements() {
    this.elements.apiKeyEl = document.getElementById("apiKey");
    this.elements.maxAgeEl = document.getElementById("maxAge");
    this.elements.filterRiversEl = document.getElementById("filterRivers");
    this.elements.riverListEl = document.getElementById("riverList");
    this.elements.fileInputEl = document.getElementById("inputFile");
    this.elements.modelEl = document.getElementById("model");
    this.elements.crawlDepthEl = document.getElementById("crawlDepth");
    this.elements.tokenLimitEl = document.getElementById("tokenLimit");
    this.elements.summaryPromptEl = document.getElementById("summaryPrompt");
    this.elements.mergePromptEl = document.getElementById("mergePrompt");
  }

  /**
   * Validate form inputs and return a payload object if valid.
   * Returns null if validation fails.
   */
  validateFormInput() {
    const apiKey = this.elements.apiKeyEl.value.trim();
    const maxAge = parseInt(this.elements.maxAgeEl.value, 10);
    const filterByRivers = this.elements.filterRiversEl.checked;
    const riverList = this.elements.riverListEl.value.trim();
    const inputFile = this.elements.fileInputEl.files[0] || null;
    const model = this.elements.modelEl.value.trim();
    const crawlDepth = parseInt(this.elements.crawlDepthEl.value, 10);
    const tokenLimit = parseInt(this.elements.tokenLimitEl.value, 10);
    const summaryPrompt = this.elements.summaryPromptEl.value.trim();
    const mergePrompt = this.elements.mergePromptEl.value.trim();

    // Validation conditions
    const isValid =
      apiKey &&
      !isNaN(maxAge) &&
      (!filterByRivers || riverList !== "") &&
      inputFile &&
      model &&
      !isNaN(crawlDepth) &&
      !isNaN(tokenLimit) &&
      summaryPrompt &&
      mergePrompt;

    // Return payload if valid, otherwise null
    return isValid
      ? {
          apiKey,
          maxAge,
          filterByRivers,
          riverList,
          inputFile,
          model,
          crawlDepth,
          tokenLimit,
          summaryPrompt,
          mergePrompt,
        }
      : null;
  }

  /**
   * Sends the form data to the server.
   */
  handlePayload(payload) {
    const { inputFile, ...metadata } = payload;

    // 1. Send non-file data (metadata)
    this.socket.send(JSON.stringify({ type: "metadata", data: metadata }));

    // 2. Send file as binary
    if (inputFile) {
      const reader = new FileReader();
      reader.onload = () => {
        this.socket.send(reader.result);
      };
      reader.readAsArrayBuffer(inputFile);
    }
  }

  /**
   * Handles the show/hide logic for the river list field
   */
  initRiverListToggle() {
    const { filterRiversEl, riverListEl } = this.elements;
    const riverListWrapper = document.getElementById("riverListWrapper");

    // Ensure required elements exist
    if (!filterRiversEl || !riverListWrapper || !riverListEl) return;

    // Set initial visibility & required state
    riverListWrapper.classList.toggle("d-none", !filterRiversEl.checked);
    riverListEl.required = filterRiversEl.checked;

    // Toggle when checkbox changes
    filterRiversEl.addEventListener("change", () => {
      riverListWrapper.classList.toggle("d-none", !filterRiversEl.checked);
      riverListEl.required = filterRiversEl.checked;
    });
  }
}

// === Initialize the app ===
const app = new ReportFormApp();
document.addEventListener("DOMContentLoaded", () => app.showForm());
