const got = require('got');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Model = require('./models/prices');

const mongoPath = 'mongodb+srv://florianbock:ofW5woB7johRzYml@cluster0.yy2j1.mongodb.net/price-tracking?retryWrites=true&w=majority'
const desiredPrice = 10;
const maxRetrys = 10;
const interval = 3.6e+6; // 1 Stunde
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

(async () => {
    console.log('Checking prices...');
    mongoose.connect(mongoPath);
    await Promise.all(urls.map(async ({ name, url, img_url }) => {
        let retrys = 0;
        const price = await checkPrice(url);
        await updateDatabase(name, price, url, img_url, retrys);
    }));
    // mongoose.connection.close();
})();

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
        return NaN
    }
}

async function updateDatabase(productName, newPrice, url, img_url, retrys) {
    if (isNaN(newPrice)) {
        if (retrys < maxRetrys) {
            retrys = retrys + 1;
            const newPrice = await checkPrice(url);
            updateDatabase(productName, newPrice, url, img_url, retrys)
            return;
        } else {
            console.log(`[FAILED] [${retrys}/${maxRetrys}] ${productName}`)
            return true;
        }
    }
    console.log(`[SUCCESS] [${retrys}/${maxRetrys}] ${productName}`)
    const savedItem = await Model.findOne({ productName });
    if (savedItem?.productPrice != newPrice) {
        await Model.findOneAndUpdate(
            {
                productName,
            },
            {
                productName,
                productPrice: newPrice,
                lastUpdate: new Date()
            },
            {
                new: true,
                upsert: true
            }
        );
        newPrice < desiredPrice && await sendWebhook(productName, newPrice, url, img_url);
        return true
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
                        'inline': true,
                    },
                ],
                'thumbnail': {
                    'url': img_url,
                },
                'color': 15258703,
                'footer': {
                    'icon_url': 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
                    'text': 'Price Alert | Contact @florian#0002 for help',
                }
            }]
        }),
        headers: {
            'content-type': 'application/json'
        },
    })
}