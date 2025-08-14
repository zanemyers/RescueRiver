/**
 * Extracts the UTC year and month from a given Date object.
 *
 * @param {Date} date - The date from which to extract year and month.
 * @returns {[string, string]} - An array containing the year and zero-padded month as strings (e.g., ['2025', '05']).
 */
function getUTCYearMonth(date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return [year, month];
}

/**
 * Generates a UTC timestamp string from a given Date object.
 *
 * @param {Date} date - The date to convert into a timestamp.
 * @returns {string} - A formatted UTC timestamp string (e.g., '2025-05-07_T13-45-30Z').
 */
function getUTCTimeStamp(date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_T${hours}-${minutes}-${seconds}Z`;
}
