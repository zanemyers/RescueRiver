import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import enquirer from "enquirer";

// Resolve __filename and __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration questions for scraper setup.
 * - `RUN_HEADLESS`: whether the browser should run in headless mode.
 * - `CONCURRENCY`: number of parallel scraping tasks (batch size).
 */
const questions = [
  {
    type: "confirm",
    name: "RUN_HEADLESS",
    message: "Run headless?",
    initial: true,
  },
  {
    type: "numeral",
    name: "CONCURRENCY",
    message: "Enter a batch size:",
    float: false,
    min: 1,
    max: 10,
    initial: 5,
    validate: validateRange(1, 10, "Concurrency"),
  },
];

/**
 * Generates a validation function for numeric input ranges.
 *
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @param {string} label - Label to display in error messages.
 * @returns {Function} Validation function for enquirer prompts.
 */
function validateRange(min = 0, max = 100, label = "Value") {
  return (value) => {
    if (value < min || value > max) return `${label} must be between ${min} and ${max}.`;
    return true;
  };
}

/**
 * Main setup routine to prompt the user and create a `.env` file.
 *
 * - Prompts user for headless mode and concurrency.
 * - Generates a `.env` file in the project directory with the provided values.
 */
(async () => {
  try {
    // Prompt the user for configuration
    const answers = await enquirer.prompt(questions);

    // Build .env file content
    const envContent = `RUN_HEADLESS=${answers.RUN_HEADLESS}\nCONCURRENCY=${answers.CONCURRENCY}`;

    // Write the .env file
    const filePath = path.resolve(__dirname, ".env");
    fs.writeFileSync(filePath, envContent, "utf8");

    console.log(`✅ .env file created at ${filePath}`);
  } catch (error) {
    console.error("❌ Error during setup:", error);
  }
})();
