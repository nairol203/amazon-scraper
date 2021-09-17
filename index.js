const got = require('got');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Model = require('./models/pringles');

const mongoPath = 'mongodb+srv://florianbock:ofW5woB7johRzYml@cluster0.yy2j1.mongodb.net/price-tracking?retryWrites=true&w=majority';
const desiredPrice = 10;
const maxRetrys = 5;
const interval = 1.08e+7; // 3 Stunden
const urls = [
    {
        name: 'Pringles Original 6er Pack',
        url: 'https://amazon.de/dp/B074N1TWL8',
        img_url: 'https://m.media-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg'
    },
    {
        name: 'Pringles Classic Paprika 6er Pack',
        url: 'https://amazon.de/dp/B07MJ1BTFX',
        img_url: 'https://m.media-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg'
    },
    {
        name: 'Pringles Sour Cream & Onion 6er Pack',
        url: 'https://amazon.de/dp/B074MZ445W',
        img_url: 'https://m.media-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg'
    },
    {
        name: 'Pringles Hot & Spicy 6er Pack',
        url: 'https://www.amazon.de/dp/B07MBT14B2',
        img_url: 'https://m.media-amazon.com/images/I/817QydVRFWS._SL1500_.jpg'
    }
];

console.log(new Date() + ' Application running.');

setTimeout(async () => {
    try {
        await mongoose.connect(mongoPath).then(console.log(new Date() + ' Connected to MongoDB!'));
        console.log(new Date() + ' Price check starting.');
        await Promise.all(urls.map(async ({ name, url, img_url }) => {
            let retrys = 0;
            let price = await checkPrice(url);
            while (isNaN(price) && retrys < maxRetrys) {
                retrys++;
                price = await checkPrice(url);
            }
            if (isNaN(price)) {
                console.log(`[FAILED] [${retrys}/${maxRetrys}] ${name}`);
            } else {
                console.log(`[SUCCESS] [${retrys}/${maxRetrys}] ${name}`);
                await updateDatabase(name, price, url, img_url);
            }
        }));
        console.log(new Date() + ' Price check stopped.');
        mongoose.connection.close().then(console.log(new Date() + ' Disconnected from MongoDB!'));
    } catch (error) {
        console.log(error);
    }
}, interval);

async function checkPrice(url) {
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

async function updateDatabase(name, newPrice, url, img_url) {
    const savedItem = await Model.findOne({ name });
    if (!savedItem?.price) {
        await Model.findOneAndUpdate(
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
        newPrice < desiredPrice && Math.abs((savedItem?.price || 0) - newPrice) > 0.5 && await sendWebhook(name, newPrice, url, img_url);
        return true;
    } else if (savedItem?.price != newPrice) {
        await Model.findOneAndUpdate(
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
        await Model.findOneAndUpdate(
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
        newPrice < desiredPrice && Math.abs((savedItem?.price || 0) - newPrice) > 0.5 && await sendWebhook(name, newPrice, url, img_url);
        return true;
    } else if (new Date(savedItem?.date) < new Date()) {
        await Model.findOneAndUpdate(
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

function sendWebhook(name, price, url, img_url) {
    got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
        body: JSON.stringify({
            'content': '<@&859771979845337098>',
            'embeds': [{
                'title': 'Amazon Price Alert',
                'description': `Der Preis von [${name}](${url}) ist unter den Wunschpreis von ${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(desiredPrice)} gefallen!`,
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
