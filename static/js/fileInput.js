/**
 * Initializes file input handling for selecting, displaying, clearing, and
 * drag-and-dropping Excel files into a custom-styled input area.
 *
 * Expected HTML elements:
 * - #inputFile                (hidden <input type="file"> element)
 * - #selectedFile              (element to display selected file name)
 * - #selected-file-wrapper     (wrapper showing file name + clear button)
 * - #file-input-wrapper        (main clickable/drag-drop area)
 * - #clear-file-button         (button to remove the selected file)
 *
 * Restricts file type to `.xls` and `.xlsx`.
 */
export function initFileInput() {
  // Get all required DOM elements
  const fileInput = document.getElementById("inputFile");
  const fileNameDisplay = document.getElementById("selectedFile");
  const fileNameWrapper = document.getElementById("selected-file-wrapper");
  const fileWrapper = document.getElementById("file-input-wrapper");
  const clearButton = document.getElementById("clear-file-button");

  // Stop if any required element is missing
  if (!fileInput || !fileNameDisplay || !fileWrapper || !clearButton || !fileNameWrapper) return;

  /**
   * Updates the displayed filename and disables/enables the input.
   * Called after file selection or clearing.
   */
  const updateDisplay = () => {
    const file = fileInput.files[0];
    if (file) {
      // Show file name and hide input to prevent multiple file selections
      fileNameDisplay.textContent = file.name;
      fileNameWrapper.classList.remove("d-none");
      fileInput.disabled = true;
    } else {
      // Hide file name and re-enable input for selection
      fileNameDisplay.textContent = "";
      fileNameWrapper.classList.add("d-none");
      fileInput.disabled = false;
    }
  };

  /**
   * Click wrapper → open file picker (only if not disabled).
   */
  fileWrapper.addEventListener("click", () => {
    if (!fileInput.disabled) {
      fileInput.click();
    }
  });

  // When a file is chosen from the picker, update display
  fileInput.addEventListener("change", updateDisplay);

  /**
   * Clear button → remove selected file and reset UI.
   * Prevents click from also triggering the wrapper's file picker.
   */
  clearButton.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.value = "";
    updateDisplay();
  });

  // =========================
  // Drag & Drop Support
  // =========================

  // Highlight drop zone on drag enter/over
  ["dragenter", "dragover"].forEach((event) => {
    fileWrapper.addEventListener(event, (e) => {
      if (fileInput.disabled) return; // Ignore if a file is already selected
      e.preventDefault();
      e.stopPropagation();
      fileWrapper.classList.add("border-primary", "bg-white");
    });
  });

  // Remove highlight on drag leave/drop
  ["dragleave", "drop"].forEach((event) => {
    fileWrapper.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileWrapper.classList.remove("border-primary", "bg-white");
    });
  });

  /**
   * Handle dropped file:
   * - Must be Excel format (.xls / .xlsx)
   * - Assigns dropped file to input's file list
   */
  fileWrapper.addEventListener("drop", (e) => {
    if (fileInput.disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xls") || file.name.endsWith(".xlsx"))) {
      fileInput.files = e.dataTransfer.files;
      updateDisplay();
    } else {
      alert("❌ Only .xls and .xlsx files are accepted.");
    }
  });
}

// Expose function globally for inline script usage
window.initFileInput = initFileInput;
