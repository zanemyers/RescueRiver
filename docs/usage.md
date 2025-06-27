## 🚀 Usage

### 🏃 Run Commands

| Tool           | Docker    | VS Code                     | WebStorm                     |
| -------------- | --------- | --------------------------- | ---------------------------- |
| Shop Scraper   | `just ss` | `just ss -l` or `node main` | Use the `▷` Run/Debug config |
| Report Scraper | `just rs` | `just rs -l` or `node main` | Use the `▷` Run/Debug config |

> The `▷ Run button` is **ONLY** available in **WebStorm**.

> For `node main`, first `cd` into the appropriate app directory.

### 🐞 Debugging Locally

| Tool           | VS Code                                  | WebStorm                      |
| -------------- | ---------------------------------------- | ----------------------------- |
| Shop Scraper   | `just ss -l -d` or `node --inspect main` | Use the `🐞` Run/Debug config |
| Report Scraper | `just rs -l -d` or `node --inspect main` | Use the `🐞` Run/Debug config |

> 🐳 Docker-based debugging is currently **not available**.
