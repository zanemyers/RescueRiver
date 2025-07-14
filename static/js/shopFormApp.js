import { initTooltips } from "./tooltip.js";
import { initFileInput } from "./fileInput.js";

const ShopFormApp = (() => {
  let socket = null;
  let elements = {};

  // === Load the form partial ===
  async function showForm() {
    const res = await fetch("/partials/shop-form");
    document.getElementById("formContainer").innerHTML = await res.text();
    initTooltips();
    cacheElements();
    setupTabs();
    initFileInput();
    handleFormSubmit();
  }

  // === Load the progress partial ===
  async function showProgress() {
    const res = await fetch("/partials/progress");
    document.getElementById("formContainer").innerHTML = await res.text();

    document.getElementById("cancelButton").addEventListener("click", () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "cancel" }));
        socket.close();
      }
      showForm();
    });
  }

  // === Cache frequently used DOM elements ===
  function cacheElements() {
    elements.fileInputEl = document.getElementById("inputFile");
    elements.apiKeyEl = document.getElementById("apiKey");
    elements.queryEl = document.getElementById("query");
    elements.latEl = document.getElementById("latitude");
    elements.lngEl = document.getElementById("longitude");
    elements.maxResultsEl = document.getElementById("maxResults");
    elements.manualTab = document.getElementById("manual-tab");
    elements.fileTab = document.getElementById("file-tab");
  }

  // === Tab Logic ===
  function setupTabs() {
    const manualFields = [
      elements.apiKeyEl,
      elements.queryEl,
      elements.latEl,
      elements.lngEl,
      elements.maxResultsEl,
    ];

    manualFields.forEach((f) => f.setAttribute("required", "required"));
    elements.fileInputEl.removeAttribute("required");

    elements.manualTab.addEventListener("click", () => {
      manualFields.forEach((f) => f.setAttribute("required", "required"));
      elements.fileInputEl.removeAttribute("required");
    });

    elements.fileTab.addEventListener("click", () => {
      manualFields.forEach((f) => f.removeAttribute("required"));
      elements.fileInputEl.setAttribute("required", "required");
    });
  }

  // === Validate Inputs ===
  function validateFormInputs() {
    const manualTabActive = document.getElementById("manualInputs").classList.contains("show");

    if (manualTabActive) {
      const apiKey = elements.apiKeyEl.value.trim();
      const query = elements.queryEl.value.trim();
      const lat = parseFloat(elements.latEl.value);
      const lng = parseFloat(elements.lngEl.value);
      const maxResults = parseInt(elements.maxResultsEl.value, 10);

      const hasManualInputs = apiKey && query && !isNaN(lat) && !isNaN(lng) && !isNaN(maxResults);

      return hasManualInputs ? { apiKey, query, lat, lng, maxResults } : null;
    } else {
      return elements.fileInputEl.files[0] || null;
    }
  }

  // === Handle Form Submission ===
  function handleFormSubmit() {
    const shopForm = document.getElementById("shopForm");
    if (!shopForm) return;

    shopForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      shopForm.classList.add("was-validated");

      const payload = validateFormInputs();
      if (!payload) {
        const errorArea = document.getElementById("formError");
        if (errorArea) errorArea.textContent = "❗ Please fill out all required fields.";
        return;
      }

      await showProgress();

      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
      socket = new WebSocket("ws://localhost:3000/ws/shop");

      socket.onopen = () => {
        if (payload instanceof File) {
          const reader = new FileReader();
          reader.onload = () => socket.send(reader.result);
          reader.readAsArrayBuffer(payload);
        } else {
          socket.send(JSON.stringify(payload));
        }
      };

      let pendingFilename = "download.xlsx";
      socket.binaryType = "arraybuffer";
      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const progressArea = document.getElementById("progressArea");
          if (!progressArea) return;

          const message = event.data;
          if (message.startsWith("DOWNLOAD:")) {
            // Save the filename for the upcoming file
            pendingFilename = message.replace("DOWNLOAD:", "").trim();
            return;
          }

          message.startsWith("[STATUS]")
            ? updateProgress(progressArea, message.replace("[STATUS]", "").trim())
            : appendProgress(progressArea, message.replace("[STATUS]:", "").trim());
        } else {
          // Binary message — Excel file buffer
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

      socket.onclose = () => {
        socket = null;
      };

      socket.onerror = () => {
        alert("❌ WebSocket error.");
        socket.close();
        showForm();
      };
    });
  }

  // === Progress Helpers ===
  function updateProgress(progressArea, text) {
    const lastNewline = progressArea.textContent.lastIndexOf("\n");
    if (lastNewline === -1) {
      progressArea.textContent = text;
    } else {
      progressArea.textContent = progressArea.textContent.slice(0, lastNewline + 1) + text;
    }
  }

  function appendProgress(progressArea, text) {
    progressArea.textContent += (progressArea.textContent ? "\n" : "") + text;
  }

  // === Public API ===
  return {
    init: () => {
      document.addEventListener("DOMContentLoaded", showForm);
    },
  };
})();

// Initialize the module
ShopFormApp.init();
