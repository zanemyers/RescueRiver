import { BaseFormApp } from "./baseFormApp.js";
import { initFileInput } from "./fileInput.js";

class ReportFormApp extends BaseFormApp {
  constructor() {
    super("report-form", "report");
  }

  // === Initialize any extra JS ===
  onFormLoad() {
    initFileInput();
    this.initRiverListToggle();
  }

  // === Cache frequently used DOM elements ===
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

  // === Validate Input ===
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

  handlePayload(payload) {
    const { inputFile, ...metadata } = payload;

    // 1. send non file data
    this.socket.send(JSON.stringify({ type: "metadata", data: metadata }));

    // 2. Send file
    if (inputFile) {
      const reader = new FileReader();
      reader.onload = () => {
        this.socket.send(reader.result); // binary ArrayBuffer
      };
      reader.readAsArrayBuffer(inputFile);
    }
  }

  initRiverListToggle() {
    const { filterRiversEl, riverListEl } = this.elements;
    const riverListWrapper = document.getElementById("riverListWrapper");

    if (!filterRiversEl || !riverListWrapper || !riverListEl) return;

    // Initial state
    riverListWrapper.classList.toggle("d-none", !filterRiversEl.checked);
    riverListEl.required = filterRiversEl.checked;

    // Listen for changes
    filterRiversEl.addEventListener("change", () => {
      riverListWrapper.classList.toggle("d-none", !filterRiversEl.checked);
      riverListEl.required = filterRiversEl.checked;
    });
  }
}

// Initialize the app
const app = new ReportFormApp();
document.addEventListener("DOMContentLoaded", () => app.showForm());
