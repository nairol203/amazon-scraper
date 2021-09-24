const got = require('got');
const cheerio = require('cheerio');

class trackPrice {
    constructor({ dbModel, desiredPrice, urls }) {
        this.model = dbModel;
        this.desiredPrice = desiredPrice;
        this.maxRetrys = 5;
        this.urls = urls;
        this.main();
    }

    async main() {
        try {
            // console.log(new Date() + ' Price check starting.');
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
            // console.log(new Date() + ' Price check stopped.');
        } catch (error) {
            console.log(error);
        }
    }

    async checkPrice(url) {
        try {
            const request = await got('https://api.webscrapingapi.com/v1', {
                searchParams: {
                    api_key: 'PUQeLnCBBdeYNfKzsoTkcEokLX5lGep6',
                    url
                }
            });
            const $ = cheerio.load(request.body);
            const element = $('#priceblock_ourprice');
            const scrapedPriceString = element.text();
            const scrapedPrice = parseFloat(scrapedPriceString.replace('€', '').replace(',', '.'));
            return scrapedPrice;
        } catch (error) {
            return NaN;
        }
    }

    async updateDatabase(name, newPrice, url, img_url) {
        const savedItem = await this.model.findOne({ name });
        if (!savedItem?.price) {
            await this.model.findOneAndUpdate(
                {
                    name,
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
            newPrice < this.desiredPrice && Math.abs((savedItem?.price || 0) - newPrice) > 0.5 && await this.sendWebhook(name, newPrice, url, img_url);
            return true;
        } else if (savedItem?.price != newPrice) {
            await this.model.findOneAndUpdate(
                {
                    name,
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
                    name,
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
            newPrice < this.desiredPrice && Math.abs((savedItem?.price || 0) - newPrice) > 0.5 && await this.sendWebhook(name, newPrice, url, img_url);
            return true;
        } else if (new Date(savedItem?.date) < new Date()) {
            await this.model.findOneAndUpdate(
                {
                    name,
                },
                {
                    date: new Date(),
                }
            );
            return true;
        } else {
            return true;
        }
    }

    sendWebhook(name, price, url, img_url) {
        got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
            body: JSON.stringify({
                // 'content': '<@&859771979845337098>',
                'embeds': [{
                    'title': 'Amazon Price Alert',
                    'description': `Der Preis von [${name}](${url}) ist unter den Wunschpreis von ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.desiredPrice)} gefallen!`,
                    'fields': [
                        {
                            'name': 'Aktueller Preis',
                            'value': `${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)}`,
                            'inline': true
                        },
                    ],
                    'thumbnail': {
                        'url': img_url
                    },
                    'color': 15258703,
                    'footer': {
                        'icon_url': 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
                        'text': 'Price Alert | Contact @florian#0002 for help'
                    }
                }]
            }),
            headers: {
                'content-type': 'application/json'
            }
        });
    }
}

module.exports = trackPrice;