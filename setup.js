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
    hint: "Runs the scrapers without a UI.",
    initial: true,
  },
  {
    type: "numeral",
    name: "CONCURRENCY",
    message: "Enter batch size:",
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
    name: "SERP_API_KEY",
    message: "Enter your SerpAPI API Key:",
    hint: "Generate a key at https://serpapi.com/manage-api-key.",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "API Key cannot be empty.";
    },
  },
  {
    type: "input",
    name: "SEARCH_QUERY",
    message: "Enter your search query:",
    hint: "What to search for (e.g. 'Fly Fishing Shops').",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "Search query cannot be empty.";
    },
  },
  {
    type: "input",
    name: "SEARCH_COORDINATES",
    message: "Enter search coordinates:",
    hint: "Coordinates to search around (e.g. '45.5236,-122.6750').",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "Search query cannot be empty.";
    },
  },
  {
    type: "input",
    name: "MAX_RESULTS",
    message: "Enter the maximum number of results to return:",
    hint: "Value should be a multiple of 20.",
    float: false,
    min: 20,
    initial: 100,
    validate(value) {
      if (value < 20) return "Value must be at least 20.";
      if (value % 20 !== 0) return "Value must be a multiple of 20.";
      return true;
    },
  },
  {
    type: "input",
    name: "GEMINI_API_KEY",
    message: "Enter your Gemini API Key:",
    hint: "Generate a key at https://aistudio.google.com/app/apikey.",
    required: true,
    validate(value) {
      return value.trim() !== "" ? true : "API Key cannot be empty.";
    },
  },
  {
    type: "input",
    name: "GEMINI_MODEL",
    message: "Enter your Gemini Model name:",
    hint: "See models & pricing at https://ai.google.dev/gemini-api/docs/pricing. Results may vary depending on the model.",
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
      `# General Scraper configuration\n` +
      `RUN_HEADLESS=${answers.RUN_HEADLESS}\n` +
      `CONCURRENCY=${answers.CONCURRENCY}\n\n` +
      `# Shop Scraper configuration\n` +
      `SERP_API_KEY=${answers.SERP_API_KEY}\n` +
      `SEARCH_QUERY=${answers.SEARCH_QUERY}\n` +
      `SEARCH_COORDINATES=${answers.SEARCH_COORDINATES}\n` +
      `MAX_RESULTS=${answers.MAX_RESULTS}\n\n` +
      `# Fishing Report configuration\n` +
      `GEMINI_API_KEY="${answers.GEMINI_API_KEY}"\n` +
      `GEMINI_MODEL="${answers.GEMINI_MODEL}"\n` +
      `TOKEN_LIMIT=${answers.TOKEN_LIMIT}\n` +
      `MAX_REPORT_AGE=${answers.MAX_REPORT_AGE}\n` +
      `FILTER_BY_RIVER=${answers.FILTER_BY_RIVER}\n` +
      `IMPORTANT_RIVERS=[${riverList}]\n`;

    const filePath = path.resolve(__dirname, ".env");
    fs.writeFileSync(filePath, envContent, "utf8");
    console.log(`✅ .env file created at ${filePath}`);
  } catch (error) {
    console.error("❌ Error during setup:", error);
  }
})();
