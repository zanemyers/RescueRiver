## 📋 Setup

### ⚙️ Visual Studio Code Settings

#### 🐞 Debugging

- On MacOS press `cmd + shift + p` to open the command palette
- Search `Debug: Toggle Auto Attach` and set it to `Only With Flag`

#### 🧰 Recommended Extensions

- Container Tools by Microsoft
- Docker by Microsoft
- Docker DX by Docker
- Excel Viewer by MESCIUS
- GitHub Copilot by GitHub
- Github Copilot Chat by Github
- Prettier - Code formatter by Prettier

### 🐳 Docker

- Install [Docker Desktop](https://docs.docker.com/get-started/get-docker/)
- Run `docker-compose build` in the terminal

### 🏠 Local

- Install [Node.js](https://nodejs.org/en/download) (recommend using LTS)
- Run `npm install` in the terminal

### 🌳 Environment

- Run `just setup_env` in the terminal to create your `.env` file
  - Follow the prompts
  - You can re-run the command or edit the file manually anytime

### 📦 Packages

- **Parsing & Dates:**

  - [Chrono-Node](https://www.npmjs.com/package/chrono-node) – Natural language date parser.
  - [Date-FNS](https://www.npmjs.com/package/date-fns) – Modern JavaScript date utility library.

- **CLI & Environment:**

  - [Dotenv](https://www.npmjs.com/package/dotenv) – Load environment variables from `.env` file.
  - [Enquirer](https://www.npmjs.com/package/enquirer) – Elegant CLI prompts.
  - [Ora](https://www.npmjs.com/package/ora) – Terminal spinners for async actions.

- **Scraping & Browser Automation:**

  - [Playwright](https://www.npmjs.com/package/playwright) – Browser automation tool.
  - [Playwright-Extra](https://www.npmjs.com/package/playwright-extra) – Extensible version of Playwright for stealth plugins.
  - [Puppeteer-Extra-Plugin-Stealth](https://www.npmjs.com/package/puppeteer-extra-plugin-stealth) – Evade bot detection with stealth tricks.

- **Excel Handling:**

  - [ExcelJS](https://www.npmjs.com/package/exceljs) – Read/write Excel (`.xlsx`) spreadsheets in Node.js.

- **AI Integration:**

  - [@google/genai](https://www.npmjs.com/package/@google/genai) – Google Gemini / Generative AI SDK.

- **Async Control:**

  - [@supercharge/promise-pool](https://www.npmjs.com/package/@supercharge/promise-pool) – Manage concurrency with controlled async task execution.

- **Search & Data Fetching:**
  - [SerpAPI](https://www.npmjs.com/package/serpapi) – Search engine scraping API with Google Maps support.
