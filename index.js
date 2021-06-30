require('dotenv').config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const got = require('got');
const refreshInterval = 2.16e+7;

const mongo = require('./mongo');
const model = require('./models/prices');

const items = [
    { name: 'Pringles Original 6er-Pack', url: 'https://amazon.de/dp/B074N1TWL8', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg' },
    { name: 'Pringles Classic Paprika 6er-Pack', url: 'https://amazon.de/dp/B07MJ1BTFX', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg' },
    { name: 'Pringles Sour Cream & Onion 6er-Pack', url: 'https://amazon.de/dp/B074MZ445W', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg' },
];

(async () => {
    await mongo();
    await checkPrice();
    setInterval(async _ => {
        console.log('[REFRESH] Refreshing Price Alert')
        await checkPrice();
    }, refreshInterval);

})();

async function checkPrice() {
    console.log('[CHECK] Checking Price Alert')
    for(item of items) {
        const name = item.name;
        const price = await getPrice(item.url);
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
                        'icon_url': 'https://cdn.discordapp.com/avatars/822905167589539850/a5e8e768452672b84c8a94cf6f3c99d0.webp?size=128',
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
            console.log(`[CHECK] New Price for ${name}`);
        }
        else {
            console.log(`[CHECK] Nothing new for ${name}`);
        }
    }
}

async function getPrice(url) {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    await page.goto(url);

    const pageData = await page.evaluate(() => {
        return {
            html: document.documentElement.innerHTML,
        };
    });

    const $ = cheerio.load(pageData.html)
    
    const element = $('#priceblock_ourprice');
    
    await browser.close();
    return element.text();
};