# ![RescueRiver logo](assets/images/RescueRiverLogo.png) RescueRiver

This repository contains work done for **[Rescue River](https://rescueriver.com/)**, currently including:

- ✅ **Google Maps Shop Scraper** – Fully functional
- ⚠️ **Fishing Report Scraper** – In progress

These tools are designed to gather and summarize data from fishing-related sources online.  
They support both **local** and **Docker-based** development, with flexible configuration via environment variables.

## 📑 Table of Contents

- [📋 Setup](#-setup)
- [🚀 Usage](#-usage)
- [⚙️ Configuration](#-configuration)
- [🗺️ Google Maps Shop Scraper](#-google-maps-shop-scraper)
- [🎣 Fishing Report Scraper](#-fishing-report-scraper-in-progress)
- [🐞 Known Issues](#-known-issues)

---

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
  - You can edit the file manually to update your configuration

### 📦 Key Packages

- **Parsing & Dates:** Chrono-Node, Date-FNS
- **CLI & Environment:** Enquirer, Dotenv
- **Scraping:** Playwright
- **XLSX File Handling:** Exceljs
- **AI Integration:** Google/Genai

---

## 🚀 Usage

All run/debug commands use [`just`](https://just.systems/man/en/) task runner.

### 🏃 Run Commands

| Tool                   | Docker     | Local                        |
| ---------------------- | ---------- | ---------------------------- |
| Google Maps Scraper    | `just gss` | `just gss -l` or `node main` |
| Fishing Report Scraper | `just frs` | `just frs -l` or `node main` |

> For local runs with `node main`, first navigate into the app directory.

### 🐞 Debugging Locally

| Tool                   | Debug Command                             |
| ---------------------- | ----------------------------------------- |
| Google Maps Scraper    | `just gss -l -d` or `node --inspect main` |
| Fishing Report Scraper | `just frs -l -d` or `node --inspect main` |

> Docker-based debugging is currently **not available**.

---

## ⚙️ Configuration

Set these in your `.env` file.

### 🛠️ Shared Settings

| Variable       | Description                                            |
| -------------- | ------------------------------------------------------ |
| `RUN_HEADLESS` | Run browser headless or visibly (`true` or `false`)    |
| `BATCH_SIZE`   | Number of URLs to process per batch (recommended: 3–5) |

### 🗺️ Google Maps Shop Scraper

| Variable          | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `STARTING_URL`    | Google Maps list URL to begin scraping                    |
| `SCROLL_DURATION` | Time to scroll and load results (ms, e.g., `30000` = 30s) |

### 🎣 Fishing Report Scraper

| Variable               | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `GOOGLE_GENAI_API_KEY` | [API key](https://aistudio.google.com/app/apikey) for accessing Google's GenAI              |
| `GOOGLE_GENAI_MODEL`   | The [GenAI model](https://ai.google.dev/gemini-api/docs/models) to use (e.g., `gemini-pro`) |
| `TOKEN_LIMIT`          | Token limit per chunk when summarizing reports                                              |
| `MAX_REPORT_AGE`       | Max age of reports to include (in days)                                                     |
| `FILTER_BY_RIVER`      | Enable or disable river filtering (`true` or `false`)                                       |
| `IMPORTANT_RIVERS`     | Comma-separated list of river names to prioritize (e.g. `'Snake','Colorado'`)               |

---

## 🗺️ Google Maps Shop Scraper

Pulls business data from Google Maps and associated websites, compiling the results into a structured CSV.

### 🔍 How it Works

- Scrolls and collects all visible shops from a given Google Maps URL
- Extracts contact info, links, and ratings from the Google listing
- Follows websites to gather additional data (email, fishing reports, shop links)
- Exports structured data to a CSV
- Logs missing websites and failed loads

---

## 🎣 Fishing Report Scraper (In-Progress)

Analyzes fishing reports from websites. Uses a Excel file with these headers:

- `url`
- `last-updated`
- `selector`
- `keywords`
- `junk-words`
- `click-phrases`

### 🧠 Intended Functionality

- Detect and summarize river conditions and activity from fishing reports
- Filter by river name
- Track report freshness based on publication dates

---

## 🐞 Known Issues

### 🗺️ Google Maps Shop Scraper

- May hang while scrolling (controlled by `SCROLL_DURATION`)
- Email scraping is unreliable
- Some business pages are blocked or fail to load
- Requires headless mode in Docker
- Cannot be debugged in Docker

### 🎣 Fishing Report Scraper

- Must run headless in Docker
- Still under development
