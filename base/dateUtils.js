import * as chrono from "chrono-node";

/**
 * Utility functions for handling UTC date formatting.
 *
 * This module includes:
 * - `getUTCTimeStamp(date)`: Converts a Date object to a formatted UTC timestamp string.
 * - `getUTCYearMonth(date)`: Extracts the UTC year and month from a Date object.
 */

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

/**
 * Extracts the most recent valid date from a block of text.
 *
 * @param {string} text - The text to search for date expressions.
 * @returns {Date|null} The most recent valid Date object, or null if none found.
 */
function extractDate(text) {
  const currentYear = new Date().getFullYear();

  // Parse all date expressions using chrono-node
  const results = chrono.parse(text);

  // Convert, filter, sort, and return the most recent date
  const validDates = results
    .filter((result) => result.start.knownValues.year) // filters vague dates like "next week"
    .map((result) => result.start.date())
    .filter((date) => {
      const year = date.getFullYear();
      return year >= 2020 && year <= currentYear;
    })
    .sort((a, b) => b - a); // Sort most recent first

  return validDates[0] || null;
}

export { extractDate, getUTCTimeStamp, getUTCYearMonth };
