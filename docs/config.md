## ⚙️ Configuration

---

### 🛠️ Scraper Settings

> Configure these values in your `.env` file to control scraper behavior.

| Variable       | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `RUN_HEADLESS` | Run the browser in headless mode (`true`) or with UI (`false`).     |
| `CONCURRENCY`  | Number of sites or tasks to process in parallel (recommended: 3–5). |

---

### 📱 App Settings

> Configure or update these values directly in the web form.

#### 🛒 Shop Scraper

| Form Input    | Description                                                                      |
|---------------|----------------------------------------------------------------------------------|
| `SerpAPI Key` | Your [SerpAPI](https://serpapi.com/manage-api-key) key for Google Maps searches. |
| `Search Term` | Search term to use on Google Maps (e.g., `"Fly Fishing Shops"`).                 |
| `Latitude`    | Latitude coordinate to center the search (e.g., `44.4280`).                      |
| `Longitude`   | Longitude coordinate to center the search (e.g., `-110.5885`).                   |
| `Max Results` | Maximum number of results to retrieve (must be a multiple of 20).                |
| `Cache File`  | Optional file to reuse a previous search and avoid redundant API calls.          |

#### 📈 Report Scraper

| Form Input         | Description                                                                                         |
|--------------------|-----------------------------------------------------------------------------------------------------|
| `Gemini API Key`   | Your [Gemini API key](https://aistudio.google.com/app/apikey) for generating summaries.             |
| `Max Report Age`   | Maximum age of reports to consider (in days).                                                       |
| `Filter by Rivers` | Set to `true` to only include reports mentioning specific rivers.                                   |
| `River Names`      | Comma-separated list of rivers to filter by (e.g., `'Snake','Colorado','Yampa'`).                   |
| `Starter File`     | Excel configuration file that defines how to extract report content for each site.                  |
| `Gemini Model`     | The [Gemini model](https://ai.google.dev/gemini-api/docs/models) to use (e.g., `gemini-2.5-flash`). |
| `Token Limit`      | Maximum number of tokens per text chunk sent to the model (e.g., `50000`).                          |
| `Crawl Depth`      | Number of pages to crawl per site when searching for reports.                                       |
| `Summary Prompt`   | Text prompt used to summarize individual reports into structured entries.                           |
| `Merge Prompt`     | Text prompt used to consolidate multiple summaries into a single, combined report.                  |


[//]: # "TODO: possibly add the debug option for refining starter file config"
