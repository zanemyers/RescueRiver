#!/usr/bin/env just --justfile

# Runs the setup script to prepare the .env file.
setup:
    #!/usr/bin/env sh
    if [ -f .env ]; then
        echo "✅ .env already exists, skipping setup.";
    elif docker compose ps &> /dev/null; then
        docker compose run --rm web-scraper node setup.js;
    else
        node setup.js;
    fi

@lint:
    eslint . --fix
    stylelint "static/scss/**/*.scss"

@format:
    prettier --write . --log-level silent

@build_styles:
    sass static/scss/style.scss static/public/style.css

@start:
    npx sass --watch static/scss/style.scss static/public/style.css & node --inspect=0.0.0.0:9229 server.js
