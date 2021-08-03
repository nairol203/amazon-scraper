const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const got = require('got');
const model = require('../models/prices');

class priceAlert {
    constructor(items, refreshInterval = 3600000) {
        this.items = items;
        this.refreshInterval = refreshInterval;
        this.main();
    }

    async main() {
        await this.checkPrice();
        setInterval(async _ => {
            console.log('[REFRESH] Refreshing prices')
            await this.checkPrice();
        }, this.refreshInterval);
    };

    async checkPrice() {
        console.log('[CHECK] Checking for new prices')
        for(let item of this.items) {
            const name = item.name;
            const price = await this.getPrice(item.url);
            if (price.startsWith('1')) continue;
            const savedPrice = await model.findOne({ productName: name }).catch(e => console.log(e));
            if (savedPrice?.productPrice !== price) {
                await model.findOneAndUpdate(
                    {
                        productName: name,
                    },
                    {
                        procutName: name,
                        productPrice: price,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                ).catch(e => console.log(e));
                const embed = {
                    'content': '<@&859771979845337098>',
                    'embeds': [{
                        'title': 'Amazon Price Alert',
                        'description': `Neuer Preis für [${name}](${item.url})`,
                        'fields': [
                            {
                                'name': 'Alter Preis',
                                'value': `${savedPrice?.productPrice}`,
                                'inline': true,
                            },
                            {
                                'name': 'Neuer Preis',
                                'value': `${price}`,
                                'inline': true,
                            },
                        ],
                        'thumbnail': {
                            'url': item.img_url,
                        },
                        'color': 15258703,
                        'footer': {
                            'icon_url': 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
                            'text': 'Price Alert | Contact @florian#0002 for help',
                        }
                    }]
                }
                got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
                    body: JSON.stringify(embed),
                    headers: {
                        'content-type': 'application/json'
                    },
                }).catch(e => console.log(e));
            }
            else {};
        }
    };
    
    async getPrice(url) {
        const browser = await puppeteer.launch({
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
            ],
          });
    
        const page = await browser.newPage();
        await page.goto(url);
    
        const pageData = await page.evaluate(() => {
            return {
                html: document.documentElement.innerHTML,
            };
        });
    
        const $ = cheerio.load(pageData.html)
        
        const element = $('#priceblock_ourprice');
        console.log(element.text())
        
        await browser.close();
        return element.text();
    };
};

module.exports = priceAlert;