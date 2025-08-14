/* global bootstrap */

/**
 * Initialize Bootstrap tooltips.
 */
export function initTooltips() {
  // Select all elements with a `title` attribute (tooltip trigger elements)
  const tooltipTriggerList = document.querySelectorAll("[title]");

  // Loop through each element and activate the Bootstrap Tooltip
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
}

document.addEventListener("DOMContentLoaded", initTooltips);
