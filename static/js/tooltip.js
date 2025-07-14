/* global bootstrap */
export function initTooltips() {
  const tooltipTriggerList = document.querySelectorAll("[title]");
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
}
