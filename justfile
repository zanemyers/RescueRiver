#!/usr/bin/env just --justfile

# Runs the setup script to prepare the .env file.
setup:
    #!/usr/bin/env sh
    if [ -f .env ]; then
        echo "✅ .env already exists, skipping setup.";
    elif docker compose ps &> /dev/null; then
        docker compose run --rm web-scraper node base/setup.js;
    else
        node setup.js;
    fi

# Runs docker-compose with provided arguments.
@dcrr *ARGS:
    docker-compose run --rm {{ARGS}}

# TODO: update the ss, rs, debug_ss, and debug_rs commands
# Runs the Shop Scraper, either locally or inside Docker.
ss *FLAGS:
    #!/usr/bin/env sh
    if [[ "{{FLAGS}}" == *"-l"* ]]; then  # Local flag
        node ShopScraper/shopScraper.js
    else
        just dcrr web-scraper node ShopScraper/shopScraper.js
    fi

# Runs the shop scraper in debug mode (VS Code ONLY)
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
debug_rs:
    node --inspect ReportScraper/reportScraper.js

@lint:
    eslint . --fix
    stylelint "static/scss/**/*.scss"

@format:
    prettier --write . --log-level silent

@build_styles:
    sass static/scss/style.scss static/public/style.css

@start:
    npx sass --watch static/scss/style.scss static/public/style.css & node --inspect=0.0.0.0:9229 server.js
