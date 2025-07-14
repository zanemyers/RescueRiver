import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import enquirer from "enquirer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    message: "Enter batch size:",
    float: false,
    min: 1,
    max: 10,
    initial: 5,
    validate: validateRange(1, 10, "Concurrency"),
  },
  {
    type: "input",
    name: "GEMINI_API_KEY",
    message: "Enter your Gemini API Key:",
    required: true,
  },
  {
    type: "input",
    name: "GEMINI_MODEL",
    message: "Enter your Gemini Model name:",
    initial: "gemini-2.5-flash",
    required: true,
  },
  {
    type: "numeral",
    name: "TOKEN_LIMIT",
    message: "Enter max tokens per chunk:",
    float: false,
    min: 10000,
    max: 50000,
    initial: 50000,
    validate: validateRange(10000, 50000, "Token limit"),
  },
  {
    type: "numeral",
    name: "MAX_REPORT_AGE",
    message: "Enter max report age (days):",
    float: false,
    min: 10,
    initial: 100,
    validate: validateRange(10, 1000, "Max Report Age"),
  },
  {
    type: "numeral",
    name: "CRAWL_DEPTH",
    message: "Enter max crawl depth:",
    float: false,
    min: 1,
    initial: 25,
    validate: validateRange(1, 50, "Crawl Depth"),
  },
  {
    type: "confirm",
    name: "FILTER_BY_RIVER",
    message: "Filter by river?",
    initial: false,
  },
];

function validateRange(min = 0, max = 100, label = "Value") {
  return (value) => {
    if (value < min || value > max) return `${label} must be between ${min} and ${max}.`;
    return true;
  };
}

(async () => {
  try {
    const answers = await enquirer.prompt(questions);

    if (answers.FILTER_BY_RIVER) {
      Object.assign(
        answers,
        await enquirer.prompt({
          type: "input",
          name: "IMPORTANT_RIVERS",
          message: "Enter important rivers (one per line):",
          multiline: true,
        })
      );
    }

    let riverList = "";
    if (answers.IMPORTANT_RIVERS) {
      const rivers = answers.IMPORTANT_RIVERS.split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .map((r) => `"${r}"`);

      riverList = rivers.length > 2 ? "\n\t" + rivers.join(",\n\t") + "\n" : rivers.join(", ");
    }

    const envContent =
      `# General Scraper configuration\n` +
      `RUN_HEADLESS=${answers.RUN_HEADLESS}\n` +
      `CONCURRENCY=${answers.CONCURRENCY}\n\n` +
      `# Fishing Report configuration\n` +
      `GEMINI_API_KEY="${answers.GEMINI_API_KEY}"\n` +
      `GEMINI_MODEL="${answers.GEMINI_MODEL}"\n` +
      `TOKEN_LIMIT=${answers.TOKEN_LIMIT}\n` +
      `MAX_REPORT_AGE=${answers.MAX_REPORT_AGE}\n` +
      `CRAWL_DEPTH=${answers.CRAWL_DEPTH}\n` +
      `FILTER_BY_RIVER=${answers.FILTER_BY_RIVER}\n` +
      `IMPORTANT_RIVERS=[${riverList || ""}]\n`;

    const filePath = path.resolve(__dirname, ".env");
    fs.writeFileSync(filePath, envContent, "utf8");
    console.log(`✅ .env file created at ${filePath}`);
  } catch (error) {
    console.error("❌ Error during setup:", error);
  }
})();
