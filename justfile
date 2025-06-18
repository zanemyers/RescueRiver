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
    if [[ "{{FLAGS}}" == *"-l"* ]]; then  # Check for local flag (-l)
        if [[ "{{FLAGS}}" == *"-d"* ]]; then  # Check for debug flag (-d)
            node --inspect ShopScraper/shopScraper.js
        else
            node ShopScraper/shopScraper.js
        fi
    else
        just dcrr web-scraper node ShopScraper/shopScraper.js
    fi


# Runs the Report Scraper, either locally or inside Docker.
rs *FLAGS:
    #!/usr/bin/env sh
    if [[ "{{FLAGS}}" == *"-l"* ]]; then  # Check for local flag (-l)
        if [[ "{{FLAGS}}" == *"-d"* ]]; then  # Check for debug flag (-d)
            node --inspect ReportScraper/reportScraper.js
        else
            node ReportScraper/reportScraper.js
        fi
    else
        just dcrr web-scraper node ReportScraper/reportScraper.js
    fi