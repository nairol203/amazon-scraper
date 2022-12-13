# Amazon Scraper

Runs on a Rasperry Pi and scrapes prices from Amazon, which are stored in a Prisma Database, hosted on Planetscale.

## How to run Puppeteer on a Raspberry Pi

-   sudo apt install chromium-browser
-   Make sure the executable path in puppeteer.launch() is correct: executablePath: '/usr/bin/chromium-browser',
-   More Information: https://stackoverflow.com/questions/60129309/puppeteer-on-raspberry-pi-zero-w

## How to create the Cronjob with PM2

This would run every hour:

-   pm2 start index.js --cron "0 */1 * * *"

## Any Questions?

-   Twitter: @nairol203
-   Discord: Florian#5694
