document.addEventListener("DOMContentLoaded", () => {
  const tooltipTriggerList = document.querySelectorAll("[title]");
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
});
