const mongoose = require('mongoose');
const trackPrice = require('./functions/price-track');
const pringlesModel = require('./models/pringles');
const raspberryModel = require('./models/raspberry');
const ssdModel = require('./models/ssd');

const short = 1.08e+7;
const long = 4.32e+7;

// 1.08e+7 = 3 Stunden
// 4.32e+7 = 12 Stunden

mongoose.connect('mongodb+srv://florianbock:ofW5woB7johRzYml@cluster0.yy2j1.mongodb.net/price-tracking?retryWrites=true&w=majority')
    .then(() => {
        console.log(new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }) + ' Connected to MongoDB!');

        setInterval(() => {
            console.log(new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }) + ' Checking short cycle...');

            // Pringles
            new trackPrice({ dbModel: pringlesModel, desiredPrice: 10, urls: [
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
            ]});
        }, short);

        setInterval(() => {
            console.log(new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' }) + ' Checking long cycle...');

            // Rasperry
            new trackPrice({ dbModel: raspberryModel, urls: [
                {
                    name: 'CanaKit Raspberry Pi 4 Starter Kit – 4 GB RAM',
                    url: 'https://www.amazon.de/dp/B081D7ZQZ8',
                    img_url: 'https://m.media-amazon.com/images/I/71T0Kc-pCYL._AC_SL1500_.jpg'
                },
            ]});
            
            // SSD's
            new trackPrice({ dbModel: ssdModel, urls: [
                {
                    name: 'Samsung 980 PRO 1 TB PCIe 4.0',
                    url: 'https://www.amazon.de/dp/B08GS7748F',
                    img_url: 'https://m.media-amazon.com/images/I/71qA45tWZ5L._AC_SL1500_.jpg'
                },
                {
                    name: 'Samsung 870 QVO 1TB SATA 2,5 Zoll',
                    url: 'https://www.amazon.de/dp/B089QXQ1TV',
                    img_url: 'https://m.media-amazon.com/images/I/91PA5sP5wNL._AC_SL1500_.jpg'
                }
            ]});
        }, long);
    })
    .catch((error) => console.error(error));