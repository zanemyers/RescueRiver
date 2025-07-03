const formContainer = document.getElementById("formContainer");
const searchForm = document.getElementById("searchForm");
const fileInputEl = document.getElementById("inputFile");

// Manual fields
const apiKeyEl = document.getElementById("apiKey");
const queryEl = document.getElementById("query");
const latEl = document.getElementById("latitude");
const lngEl = document.getElementById("longitude");
const maxResultsEl = document.getElementById("maxResults");

const manualFields = [apiKeyEl, queryEl, latEl, lngEl, maxResultsEl];

// Tabs
const manualTab = document.getElementById("manual-tab");
const fileTab = document.getElementById("file-tab");

const createProgressArea = () => {
  const progressDiv = document.createElement("div");
  progressDiv.className = "p-4 border rounded bg-white shadow-sm flex-fill d-flex flex-column";
  progressDiv.innerHTML = `
      <div class="mb-3">
        <h5 class="mb-2">🔄 Running Search...</h5>
        <pre id="progressArea" class="small text-monospace" style="white-space: pre-wrap;"></pre>
      </div>
    `;
  return progressDiv;
};

const updateProgress = (text) => {
  const progressArea = document.getElementById("progressArea");
  if (!progressArea) return;

  const lastNewline = progressArea.textContent.lastIndexOf("\n");

  if (lastNewline === -1) {
    progressArea.textContent = text;
  } else {
    progressArea.textContent = progressArea.textContent.slice(0, lastNewline + 1) + text;
  }
};

const appendProgress = (text) => {
  const progressArea = document.getElementById("progressArea");
  if (progressArea) progressArea.textContent += (progressArea.textContent ? "\n" : "") + text;
};

// Set manual required by default (manual tab is active by default)
manualFields.forEach((field) => field.setAttribute("required", "required"));
fileInputEl.removeAttribute("required");

// Toggle required fields on tab switch
manualTab.addEventListener("click", () => {
  manualFields.forEach((field) => field.setAttribute("required", "required"));
  fileInputEl.removeAttribute("required");
});

fileTab.addEventListener("click", () => {
  manualFields.forEach((field) => field.removeAttribute("required"));
  fileInputEl.setAttribute("required", "required");
});

document.addEventListener("DOMContentLoaded", () => {
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Add Bootstrap validation styling
    searchForm.classList.add("was-validated");

    const manualTabActive = document.getElementById("manualInputs").classList.contains("show");
    const file = fileInputEl.files[0];

    const apiKey = apiKeyEl.value.trim();
    const query = queryEl.value.trim();
    const lat = latEl.value.trim();
    const lng = lngEl.value.trim();
    const maxResults = maxResultsEl.value.trim();

    const hasManualInputs = apiKey && query && lat && lng && maxResults;

    if (!manualTabActive && !file) {
      appendProgress("❌ Please upload an Excel file.");
      return;
    } else if (manualTabActive && !hasManualInputs) {
      appendProgress("❌ Please fill in all required fields.");
      return;
    }

    const progressView = createProgressArea();
    formContainer.innerHTML = "";
    formContainer.appendChild(progressView);

    const socket = new WebSocket("ws://localhost:3000");

    socket.onopen = () => {
      const payload = { apiKey, query, lat, lng, maxResults };
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith("[STATUS]")) {
        updateProgress(message.replace("[STATUS]", "").trim());
      } else {
        appendProgress(message);
      }
    };

    socket.onerror = () => {
      appendProgress("❌ WebSocket error.");
    };
  });
});
