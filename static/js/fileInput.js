export function initFileInput() {
  const fileInput = document.getElementById("inputFile");
  const fileNameDisplay = document.getElementById("selectedFile");
  const fileNameWrapper = document.getElementById("selectedFileWrapper");
  const fileWrapper = document.getElementById("file-input-wrapper");
  const clearButton = document.getElementById("clearFileButton");

  if (!fileInput || !fileNameDisplay || !fileWrapper || !clearButton || !fileNameWrapper) return;

  const updateDisplay = () => {
    const file = fileInput.files[0];
    if (file) {
      fileNameDisplay.textContent = file.name;
      fileNameWrapper.classList.remove("d-none");
      fileInput.disabled = true;
    } else {
      fileNameDisplay.textContent = "";
      fileNameWrapper.classList.add("d-none");
      fileInput.disabled = false;
    }
  };

  fileWrapper.addEventListener("click", () => {
    if (!fileInput.disabled) {
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", updateDisplay);

  clearButton.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering wrapper click
    fileInput.value = "";
    updateDisplay();
  });

  // Drag & Drop support
  ["dragenter", "dragover"].forEach((event) => {
    fileWrapper.addEventListener(event, (e) => {
      if (fileInput.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      fileWrapper.classList.add("border-primary", "bg-white");
    });
  });

  ["dragleave", "drop"].forEach((event) => {
    fileWrapper.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileWrapper.classList.remove("border-primary", "bg-white");
    });
  });

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

window.initFileInput = initFileInput;
