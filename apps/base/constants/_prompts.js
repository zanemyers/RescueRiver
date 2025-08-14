/**
 * Divider used between individual reports for improved readability.
 */
const REPORT_DIVIDER = "\n" + "-".repeat(50) + "\n";

/**
 * Prompt template for summarizing fishing reports by body of water.
 */
const SUMMARY_PROMPT = `
  For each river or body of water mentioned, create a bulleted list that follows the template below.
  - If you cannot find information for a bullet, leave it blank.
  - If the body of water is mentioned more than once, summarize the info into a single entry, with each of the 3 most recent dates broken out separately.
  - If a date is in the body of the text and not in the date field, move it to the date field.
  - If an article contains reports for multiple bodies of water, break them into separate entries based on the body of water.
  - If a river has multiple water types, list all of them next to the body of water's name.
  - Include the list of sources used for the summary

  # 1. Madison River (Water Type/s, e.g., river, lake, reservoir, creek, fork)
    * Date: June 19, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Date: June 13, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Date: June 12, 2025
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Sources: www.mdriv.org
  # 2. Snake River (river)
    * Date:...
      * Fly Patterns: ...
      * Colors: ...
      * Hook Sizes: ...
    * Sources: www.snakeriver.com, www.snriver.gov
  `.trim();

/**
 * Prompt template for merging multiple fishing report summaries into a single consolidated summary.
 */
const MERGE_PROMPT = `
The following are summaries of fishing reports broken into sections. Please consolidate the information into a single summary using the same format, listing up to the 3 most recent dates separately for each body of water:
`.trim();

export { REPORT_DIVIDER, SUMMARY_PROMPT, MERGE_PROMPT };
