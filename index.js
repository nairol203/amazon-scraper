require('dotenv').config();

const mongo = require('./mongo');
const newswire = require('./features/newswire');
const priceAlert = require('./features/priceAlert');

(async () => {
    await mongo(); 
    new newswire('gtav', 'https://discord.com/api/webhooks/819676913886298192/4S9csxzV8S6UhqWZ42t_sQr7MahQBeE4Yo-fwMu5H8R2IMn0GUgB12Q03Bhs6wTClrei')
    new priceAlert([
        { name: 'Pringles Original 6er-Pack', url: 'https://amazon.de/dp/B074N1TWL8', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg' },
        { name: 'Pringles Classic Paprika 6er-Pack', url: 'https://amazon.de/dp/B07MJ1BTFX', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg' },
        { name: 'Pringles Sour Cream & Onion 6er-Pack', url: 'https://amazon.de/dp/B074MZ445W', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg' },
    ]);
})();

