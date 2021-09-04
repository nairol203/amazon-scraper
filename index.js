const axios = require('axios');
const got = require('got');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Model = require('./models/prices');

const mongoPath = 'mongodb+srv://florianbock:ofW5woB7johRzYml@cluster0.yy2j1.mongodb.net/price-tracking?retryWrites=true&w=majority'
const desiredPrice = 10;
const interval = 2.16e+7; // 6 Stunden
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
    }
];

mongoose.connect(mongoPath);

setInterval(() => {
    console.log('Checking prices...')
    urls.forEach(async ({ name, url, img_url }) => {
        const price = await checkPrice(url);
        const dbUpdate = await updateDatabase(name, price);
        if (dbUpdate && price < desiredPrice) {
            await sendWebhook(name, price, img_url);
        }
    }); 
    console.log('Checked prices - see you in 6 hours')
}, interval);

async function checkPrice(url) {
    const { data } = await axios(url);
    const $ = cheerio.load(data);
    const element = $('#priceblock_ourprice');
    const scrapedPriceString = element.text();
    const scrapedPrice = parseFloat(scrapedPriceString.replace('€', '').replace(',', '.'));
    return scrapedPrice;
}

async function updateDatabase(productName, newPrice) {
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
        return true;
    } else {
        return false;
    }
}

function sendWebhook(name, price, img_url) {
    got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
        body: JSON.stringify({
            'content': '<@&859771979845337098>',
            'embeds': [{
                'title': 'Amazon Price Alert',
                'description': `Der Preis von **${name}** ist unter den Wunschpreis von ${desiredPrice}€ gefallen!`,
                'fields': [
                    {
                        'name': 'Aktueller Preis',
                        'value': `${price}€`,
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