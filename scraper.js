const puppeteer = require('puppeteer')
const https = require('https')
const fs = require('fs')
const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')

// Parse command-line arguments
const argv = yargs(hideBin(process.argv)).argv

const initialQuery = argv.keyword
const outputFile = argv.file
const maxPages = argv.limit

if (!initialQuery || !maxPages || !outputFile) {
    return console.log('USAGE: node scraper.js --keyword=<keyword> --limit=<page_limit> --file=<output_file>')
}

const cookiePopupButton = '#introAgreeButton'
const keywordSelector = '.card-section .nVcaUb > a'

const getSearchURL = (query) => `https://google.com/search?q=${encodeURIComponent(query)}&lr=lang_en`

const extractRelatedSearches = async (page) => {
    try {
        return await page.$$eval(keywordSelector, arr => arr.map(e => e.textContent.toLowerCase()))
    } catch (e) {
        console.log('Error extracting keywords.', e)
    }

    return []
}

const acceptCookiePopup = async (page) => {
    try {
        await page.waitForSelector("iframe", {timeout: 2000})
        const frameHandle = await page.$('iframe')
        const frame = await frameHandle.contentFrame()
        await frame.waitForSelector(cookiePopupButton, {timeout: 2000})
        await frame.click(cookiePopupButton)
    } catch(e) {
        console.log('Cookie consent button not shown.')
    }
}

const httpsAgent = new https.Agent({ keepAlive: true });

(async () => {
    // Initialize Puppeteer and open a new page
    const browser = await puppeteer.launch({httpsAgent})
    const page = await browser.newPage()

    let pagesScraped = 0
    let query

    // We'll store the unique search terms in a Set
    const uniqueTerms = new Set()
    uniqueTerms.add(initialQuery)
    const requestQueue = []

    // Open our output file in append mode
    const stream = fs.createWriteStream(outputFile, {flags: 'a'})

    try {
        // Load the initial search page
        await page.goto(getSearchURL(initialQuery), { waitUntil: 'networkidle2' })

        // The cookie consent dialog will most probably pop up at the first search. So we'll find the accept button and click it.
        await acceptCookiePopup(page)

        do {
            // Extract the related search terms from the bottom of the page. Convert them to lower-case so we can detect duplicates more easily.
            const newTerms = await extractRelatedSearches(page)

            // For each new search extracted ...
            newTerms.filter(term => !uniqueTerms.has(term)).forEach(term => {
                uniqueTerms.add(term)

                // Write it in the output file
                stream.write(term + '\n')

                // Add it the to the request queue
                requestQueue.push(term)
            })

            pagesScraped++

            // Dequeue the next term
            query = requestQueue.shift()

            if (query) {
                console.log(`Performing search for '${query}'...`)
                await page.goto(getSearchURL(query), { waitUntil: 'networkidle2' })
            }
        } while (query && pagesScraped < maxPages)
    } catch (e) {
        console.log('Error occurred when scraping page. ', e)
    }

    // Clean up things
    stream.close()
    await browser.close()
  })();

