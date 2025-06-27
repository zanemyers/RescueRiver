#!/usr/bin/env just --justfile

# Runs the setup script to prepare the .env file.
setup_env:
    #!/usr/bin/env sh
    if [ -f .env ]; then
        echo "✅ .env already exists, skipping setup.";
    elif docker compose ps &> /dev/null; then
        docker compose run --rm web-scraper node setup.js;
    else
        node setup.js;
    fi

# Runs docker-compose with provided arguments.
@dcrr *ARGS:
    docker-compose run --rm {{ARGS}}

# Runs the Shop Scraper, either locally or inside Docker.
ss *FLAGS:
    #!/usr/bin/env sh
    if [[ "{{FLAGS}}" == *"-l"* ]]; then  # Local flag
        node ShopScraper/shopScraper.js
    else
        just dcrr web-scraper node ShopScraper/shopScraper.js
    fi

# Runs the shop scraper in debug mode (VS Code ONLY)
# TODO: Fix so it works with WebStorm too
debug_ss:
    node --inspect ShopScraper/shopScraper.js

# Runs the Report Scraper, either locally or inside Docker.
rs *FLAGS:
    #!/usr/bin/env sh
    if [[ "{{FLAGS}}" == *"-l"* ]]; then  # Local flag
        node ReportScraper/reportScraper.js
    else
        just dcrr web-scraper node ReportScraper/reportScraper.js
    fi

# Runs the report scraper in debug mode (VS Code ONLY)
# TODO: Fix so it works with WebStorm too
debug_rs:
    node --inspect ReportScraper/reportScraper.js

@lint:
    eslint . --fix

@format:
    prettier --write . --log-level silent