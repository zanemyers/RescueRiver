import { initFileInput } from "./fileInput.js";
import { BaseFormApp } from "./baseFormApp.js";

/**
 * Handles the UI logic for the shop scraper form.
 */
class ShopFormApp extends BaseFormApp {
  constructor() {
    super("shop-form", "shop");
  }

  /**
   * Sets up the manual/file tab switching behavior and initializes file inputs.
   */
  onFormLoad() {
    this.setupTabs();
    initFileInput();
  }

  /**
   * Cache frequently accessed DOM elements to avoid repeated DOM lookups.
   */
  cacheElements() {
    this.elements.fileInputEl = document.getElementById("inputFile");
    this.elements.apiKeyEl = document.getElementById("apiKey");
    this.elements.queryEl = document.getElementById("query");
    this.elements.latEl = document.getElementById("latitude");
    this.elements.lngEl = document.getElementById("longitude");
    this.elements.maxResultsEl = document.getElementById("maxResults");
    this.elements.manualTab = document.getElementById("manual-tab");
    this.elements.fileTab = document.getElementById("file-tab");
  }

  /**
   * Validate the user's form input depending on the active tab.
   *
   * @returns {object|null|File} payload object
   */
  validateFormInput() {
    const manualTabActive = document.getElementById("manualInputs").classList.contains("show");

    if (manualTabActive) {
      // Read and sanitize manual input values
      const apiKey = this.elements.apiKeyEl.value.trim();
      const query = this.elements.queryEl.value.trim();
      const lat = parseFloat(this.elements.latEl.value);
      const lng = parseFloat(this.elements.lngEl.value);
      const maxResults = parseInt(this.elements.maxResultsEl.value, 10);

      // Check that all fields are valid (not empty and numbers are valid)
      const isValid = apiKey && query && !isNaN(lat) && !isNaN(lng) && !isNaN(maxResults);

      return isValid ? { apiKey, query, lat, lng, maxResults } : null;
    } else {
      // File tab active — return selected file or null if none chosen
      return this.elements.fileInputEl.files[0] || null;
    }
  }

  /**
   * Setup tab behavior:
   */
  setupTabs() {
    const manualFields = [
      this.elements.apiKeyEl,
      this.elements.queryEl,
      this.elements.latEl,
      this.elements.lngEl,
      this.elements.maxResultsEl,
    ];

    // Default: manual tab fields required, file input not required
    manualFields.forEach((f) => f.setAttribute("required", "required"));
    this.elements.fileInputEl.removeAttribute("required");

    // When manual tab is clicked, set manual fields to required and file input optional
    this.elements.manualTab.addEventListener("click", () => {
      manualFields.forEach((f) => f.setAttribute("required", "required"));
      this.elements.fileInputEl.removeAttribute("required");
    });

    // When file tab is clicked, set file input to required and manual fields optional
    this.elements.fileTab.addEventListener("click", () => {
      manualFields.forEach((f) => f.removeAttribute("required"));
      this.elements.fileInputEl.setAttribute("required", "required");
    });
  }
}

// === Initialize the app ===
const app = new ShopFormApp();
document.addEventListener("DOMContentLoaded", () => app.showForm());
