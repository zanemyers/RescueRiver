import { ExcelFileHandler, sameDomain } from "../base/index.js";
import ora from "ora";

const spinner = ora();

/**
 * Compares URLs between a report Excel file and a site Excel file,
 * identifies URLs present in the site file but missing from the report file,
 * and appends the missing URLs to the report file.
 *
 * @param {string} reportFile - Path to the Excel file containing existing report URLs
 * @param {string} siteFile - Path to the Excel file containing site URLs
 */
async function mergeMissingUrls({ reportFile, siteFile }) {
  spinner.start("Comparing report and site URLs...");

  // Initialize Excel handlers for both files
  const reportHandler = new ExcelFileHandler(reportFile);
  const siteHandler = new ExcelFileHandler(siteFile);

  // Read URLs from both files:
  // - Report file: include all rows, map to the "url" field
  // - Site file: only include rows where "Has Report" is true, map to the "Website" field
  const [rawReportUrls, rawSiteUrls] = await Promise.all([
    reportHandler.read(
      [],
      () => true,
      (row) => row["url"]
    ),
    siteHandler.read(
      [],
      (row) => row["Has Report"] === true,
      (row) => row["Website"]
    ),
  ]);

  // Deduplicate URLs by converting to Sets and back to arrays
  const reportUrls = Array.from(new Set(rawReportUrls));
  const siteUrls = Array.from(new Set(rawSiteUrls));

  // Identify URLs in the site file whose domain is not present in any report URL
  const missingUrls = siteUrls.filter(
    (siteUrl) => !reportUrls.some((reportUrl) => sameDomain(siteUrl, reportUrl))
  );

  if (missingUrls.length === 0) {
    spinner.succeed("No missing URLs found.");
    return;
  }

  spinner.text = `Appending ${missingUrls.length} missing URLs to the report file...`;

  // Append the missing URLs as new rows to the report Excel file
  await reportHandler.write(
    missingUrls.map((url) => ({ url })),
    true
  );

  spinner.succeed("Report file updated.");
}

// Example usage: merge URLs from site file into report file
mergeMissingUrls({
  reportFile: "static/example_files/report_starter_file_ex.xlsx",
  siteFile: "media/xlsx/shop_details.xlsx",
}).catch((err) => {
  spinner.fail(`Fatal error: ${err}`);
});
