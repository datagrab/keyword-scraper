# keyword-scraper
Collects long-tail keywords for a given search term by scraping the related searches Google offers for it.

## Usage

1. Clone the repo: `git clone https://github.com/datagrab/keyword-scraper.git`

1. Install dependencies: `npm install`

1. Run it: `node scraper.js --keyword="<keyword>" --limit=<limit> --file="<output_file>"`

For example:
`node scraper.js --keyword="web scraping" --limit=50 --file="keywords.txt"`