import { ExcelFileHandler } from "../base/fileUtils.js";
import { sameDomain } from "../base/scrapingUtils.js";
import ora from "ora";

const spinner = ora();

/**
 * Reads URLs from the report and site Excel files,
 * identifies URLs that are missing from the report file,
 * and appends those missing URLs to the report Excel file.
 *
 * @param {Object} params
 * @param {string} params.reportFile - Path to the Excel file containing report URLs
 * @param {string} params.siteFile - Path to the Excel file containing site URLs
 */
async function mergeMissingUrls({ reportFile, siteFile }) {
  spinner.start("Comparing report and site URLs...");
  const reportHandler = new ExcelFileHandler(reportFile);
  const siteHandler = new ExcelFileHandler(siteFile);

  // Read URLs from both files with filtering and mapping to just URL strings
  const [rawReportUrls, rawSiteUrls] = await Promise.all([
    reportHandler.read(
      [], // no multi-value columns to split
      () => true, // include all rows in report file
      (row) => row["url"] // map each row to just its "url" value
    ),
    siteHandler.read(
      [], // no multi-value columns to split
      (row) => row["Has Report"] === true, // filter only rows where "Has Report" is true
      (row) => row["Website"] // map each row to just its "Website" URL
    ),
  ]);

  // Remove duplicate URLs using Sets, convert back to arrays
  const reportUrls = Array.from(new Set(rawReportUrls));
  const siteUrls = Array.from(new Set(rawSiteUrls));

  // Find site URLs whose domain is not found in any report URL domain
  const missingUrls = siteUrls.filter(
    (siteUrl) => !reportUrls.some((reportUrl) => sameDomain(siteUrl, reportUrl))
  );

  if (missingUrls.length === 0) {
    spinner.succeed("No missing URLs found.");
    return;
  }

  spinner.text = `Appending ${missingUrls.length} to the report file....`;

  // Append missing URLs as new rows to the report Excel file
  await reportHandler.write(
    missingUrls.map((url) => ({ url })),
    false
  );

  spinner.succeed("Report file updated.");
}

mergeMissingUrls({
  reportFile: "assets/example_files/report_scraper_ex.xlsx",
  siteFile: "media/xlsx/shop_details.xlsx",
}).catch((err) => {
  spinner.fail(`Fatal error: ${err}`);
});
