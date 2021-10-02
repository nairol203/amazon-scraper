const got = require('got');
const cheerio = require('cheerio');
const axios = require('axios')
const puppeteer = require('puppeteer')

class trackPrice {
    constructor({ dbModel, desiredPrice = 0, maxRetrys = 5, element = '#priceblock_ourprice', urls }) {
        this.model = dbModel;
        this.desiredPrice = desiredPrice;
        this.maxRetrys = maxRetrys;
        this.urls = urls;
        this.element = element;
        this.cooldown = 6.048e+8; // 7 Tage
        this.apiKey = 'MUNjaFN6gUSA6VWxAFowvVuEEIqei3So';
        this.main();
    }

    async main() {
        try {
            await Promise.all(this.urls.map(async ({ name, url, img_url }) => {
                let retrys = 0;
                let price = await this.checkPrice(url);
                while (isNaN(price) && retrys < this.maxRetrys) {
                    retrys++;
                    price = await this.checkPrice(url);
                }
                if (isNaN(price)) {
                    console.log(`[FAILED] [${retrys}/${this.maxRetrys}] ${name}`);
                } else {
                    console.log(`[SUCCESS] [${retrys}/${this.maxRetrys}] ${name}`);
                    await this.updateDatabase(name, price, url, img_url);
                }
            }));
        } catch (error) {
            console.log(error);
        }
    }

    async checkPrice(productUrl) {
        try {
            const browser = await puppeteer.launch({
                headless: true
            });

            const page = await browser.newPage();
            await page.goto(productUrl);
        
            const pageData = await page.evaluate(() => {
                return {
                    html: document.documentElement.innerHTML,
                };
            });
        
            const $ = cheerio.load(pageData.html)
            
            // const { data } = await axios.get(productUrl, {
            //     headers: {
            //         'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'
            //     }
            // });
            // const $ = cheerio.load(data);

            // const request = await got('https://api.webscrapingapi.com/v1', {
            //     searchParams: {
            //         api_key: this.apiKey,
            //         productUrl
            //     }
            // });
            // const $ = cheerio.load(request.body);
            const element = $(this.element);
            const scrapedPriceString = element.text();
            const scrapedPrice = parseFloat(scrapedPriceString.replace('€', '').replace(',', '.'));
            await browser.close();
            return scrapedPrice;
        } catch (error) {
            return NaN;
        }
    }

    async updateDatabase(name, newPrice, url, img_url) {
        if (name === 'Pringles Original 6er Pack' && newPrice === 19) return;

        const savedItem = await this.model.findOne({ name });

        if (!savedItem?.price) {
            await this.model.findOneAndUpdate(
                {
                    name
                },
                {
                    name,
                    url,
                    img_url,
                    price: newPrice,
                    date: new Date(),
                    $push: {
                        'prices': [
                            {
                                price: newPrice,
                                date: new Date()
                            }
                        ]
                    }
                },
                {
                    new: true,
                    upsert: true
                }
            );
            newPrice < this.desiredPrice && await this.sendWebhook(name, newPrice, url, img_url);
        } else if (savedItem?.price != newPrice) {
            await this.model.findOneAndUpdate(
                {
                    name
                },
                {
                    $push: {
                        'prices': [
                            {
                                price: savedItem?.price,
                                date: new Date()
                            }
                        ]
                    }
                }
            );
            await this.model.findOneAndUpdate(
                {
                    name
                },
                {
                    price: newPrice,
                    date: new Date(),
                    $push: {
                        'prices': [
                            {
                                price: newPrice,
                                date: new Date()
                            }
                        ]
                    }
                }
            );
            newPrice < this.desiredPrice && await this.sendWebhook(name, newPrice, url, img_url);
        } else if (new Date(savedItem?.date) < new Date()) {
            await this.model.findOneAndUpdate(
                {
                    name
                },
                {
                    date: new Date(),
                }
            );
        }
    }

    async sendWebhook(name, price, url, img_url) {
        const savedItem = await this.model.findOne({ name });

        if (savedItem?.lastNoti + this.cooldown > new Date()) return;
        else {
            await got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
                body: JSON.stringify({
                    'content': 'Gute Neuigkeiten, <@&859771979845337098>!',
                    'embeds': [{
                        'title': '🚨 Amazon Price Alert',
                        'description': `Der Amazon Preis für [${name}](${url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${url})\n\nEs werden für die nächsten ${this.cooldown / 8.64e+7} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://nairol.me/price-check.`,
                        'fields': [
                            {
                                'name': 'Aktueller Preis',
                                'value': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price),
                                'inline': true
                            },
                            {
                                'name': 'Wunschpreis',
                                'value': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.desiredPrice),
                                'inline': true
                            }
                        ],
                        'thumbnail': {
                            'url': img_url
                        },
                        'color': 15258703,
                        'footer': {
                            'icon_url': 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
                            'text': 'Amazon Price Alert | Contact @florian#0002 for help'
                        }
                    }]
                }),
                headers: {
                    'content-type': 'application/json'
                }
            });

            await this.model.findOneAndUpdate(
                {
                    name
                },
                {
                    lastNoti: new Date()
                }
            );
        }
    }
}

module.exports = trackPrice;