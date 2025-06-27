## ⚙️ Configuration

Set these values in your `.env` file to control scraper behavior.

---

### 🛠️ Shared Settings

| Variable       | Description                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `RUN_HEADLESS` | Whether to run the browser in headless mode (`true`) or with UI (`false`) |
| `CONCURRENCY`  | Number of sites or tasks to process in parallel (recommended: 3–5)        |

---

### 🛒 Shop Scraper

| Variable        | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `SERP_API_KEY`  | Your [SerpAPI](https://serpapi.com/manage-api-key) key for map searches |
| `SEARCH_QUERY`  | Search term to use on Google Maps (e.g., `"Fly Fishing Shops"`)         |
| `SEARCH_LAT`    | Latitude to center the search near (e.g., `44.4280`)                    |
| `SEARCH_LONG`   | Longitude to center the search near (e.g., `-110.5885`)                 |
| `SEARCH_RADIUS` | Radius in meters to search from the provided coordinates                |
| `MAX_RESULTS`   | Maximum number of results to retrieve (must be a multiple of 20)        |

---

### 📈 Report Scraper

| Variable           | Description                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`   | Your [Gemini API key](https://aistudio.google.com/app/apikey) for generating summaries             |
| `GEMINI_MODEL`     | The [Gemini model](https://ai.google.dev/gemini-api/docs/models) to use (e.g., `gemini-2.5-flash`) |
| `TOKEN_LIMIT`      | Approximate max token count per chunk of text (e.g., `50000`)                                      |
| `MAX_REPORT_AGE`   | Maximum age of reports to consider (in days)                                                       |
| `CRAWL_DEPTH`      | Number of pages to crawl per site when looking for reports                                         |
| `FILTER_BY_RIVER`  | Set to `true` to only include reports mentioning important rivers                                  |
| `IMPORTANT_RIVERS` | Comma-separated list of rivers to filter by (e.g., `'Snake','Colorado','Yampa'`)                   |
