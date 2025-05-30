import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import enquirer from "enquirer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questions = [
  {
    type: "input",
    name: "GOOGLE_GENAI_API_KEY",
    message: "Enter your Google GenAI API Key:",
    hint: "Generate a key at https://aistudio.google.com/app/apikey.",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "API Key cannot be empty.";
    },
  },
  {
    type: "input",
    name: "GOOGLE_GENAI_MODEL",
    message: "Enter your Google GenAI Model name:",
    hint: "See models & pricing at https://ai.google.dev/gemini-api/docs/pricing.",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "Model name cannot be empty.";
    },
  },
  {
    type: "numeral",
    name: "TOKEN_LIMIT",
    message: "Enter max tokens per chunk:",
    hint: "Fewer = faster, more = greater context.",
    float: false,
    min: 10000,
    max: 50000,
    initial: 50000,
    validate(value) {
      if (value < 10000 || value > 50000)
        return "Value must be between 10000 and 50000.";
      return true;
    },
  },
  {
    type: "confirm",
    name: "RUN_HEADLESS",
    message: "Run headless?",
    hint: "Runs the scrapers without a UI.",
    initial: true,
  },
  {
    type: "numeral",
    name: "BATCH_SIZE",
    message: "Enter the batch size:",
    hint: "How many sites to scrape at once.",
    float: false,
    min: 1,
    max: 10,
    initial: 5,
    validate(value) {
      if (value < 1 || value > 10) return "Value must be between 1 and 10.";
      return true;
    },
  },
  {
    type: "input",
    name: "STARTING_URL",
    message: "Enter a starting URL:",
    hint: "Your Google Maps starting url.",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "URL cannot be empty.";
    },
  },
  {
    type: "numeral",
    name: "SCROLL_DURATION",
    message: "Enter the max scroll duration (ms):",
    hint: "How long to wait for Google Maps before timing out.",
    float: false,
    min: 10000,
    initial: 30000,
    validate(value) {
      if (value < 10000) return "Value must be at least 10000.";
      return true;
    },
  },
  {
    type: "numeral",
    name: "MAX_REPORT_AGE",
    message: "Enter max report age (days):",
    hint: "How old a report can be to be considered valid.",
    float: false,
    min: 10,
    initial: 100,
    validate(value) {
      if (value < 10) return "Value must be at least 10.";
      return true;
    },
  },
  {
    type: "confirm",
    name: "FILTER_BY_RIVER",
    message: "Filter by river?",
    initial: false,
  },
];

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
          hint: "Filters by these rivers (e.g. Columbia River)",
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

      riverList =
        rivers.length > 2
          ? "\n\t" + rivers.join(",\n\t") + "\n"
          : rivers.join(", ");
    }

    const envContent =
      `# Google GenAI API configuration\n` +
      `GOOGLE_GENAI_API_KEY="${answers.GOOGLE_GENAI_API_KEY}"\n` +
      `GOOGLE_GENAI_MODEL="${answers.GOOGLE_GENAI_MODEL}"\n` +
      `TOKEN_LIMIT=${answers.TOKEN_LIMIT}\n\n` +
      `# General Scraper configuration\n` +
      `RUN_HEADLESS=${answers.RUN_HEADLESS}\n` +
      `BATCH_SIZE=${answers.BATCH_SIZE}\n\n` +
      `# Google Maps Shop Scraper configuration\n` +
      `STARTING_URL="${answers.STARTING_URL}"\n` +
      `SCROLL_DURATION=${answers.SCROLL_DURATION}\n\n` +
      `# Fishing report filtering configuration\n` +
      `MAX_REPORT_AGE=${answers.MAX_REPORT_AGE_DAYS}\n` +
      `FILTER_BY_RIVER=${answers.FILTER_BY_RIVER}\n` +
      `IMPORTANT_RIVERS=[${riverList}]\n`;

    const filePath = path.resolve(__dirname, ".env");
    fs.writeFileSync(filePath, envContent, "utf8");
    console.log(`✅ .env file created at ${filePath}`);
  } catch (error) {
    console.error("❌ Error during setup:", error);
  }
})();
