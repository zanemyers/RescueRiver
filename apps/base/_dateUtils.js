import * as chrono from "chrono-node";

/**
 * Parses text to find explicit date expressions and returns
 * the most recent valid date within a set range.
 *
 * @param {string} text - The text to scan for date expressions.
 * @returns {Date|null} The most recent valid date found, or `null` if none match the criteria.
 */
function extractDate(text) {
  const currentYear = new Date().getFullYear();

  // Parse all date expressions using chrono-node
  const results = chrono.parse(text);

  // Extract valid dates, filter by range, sort by recency
  const validDates = results
    .filter((result) => result.start.knownValues.year) // Only dates with explicit years
    .map((result) => result.start.date())
    .filter((date) => {
      const year = date.getFullYear();
      return year >= 2020 && year <= currentYear;
    })
    .sort((a, b) => b - a); // most recent first

  return validDates[0] || null;
}

export { extractDate };
