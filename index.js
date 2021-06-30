require('dotenv').config();

const mongo = require('./mongo');
const priceAlert = require('./features/priceAltert');


(async () => {
    await mongo(); 
    new priceAlert([
        { name: 'Pringles Original 6er-Pack', url: 'https://amazon.de/dp/B074N1TWL8', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg' },
        { name: 'Pringles Classic Paprika 6er-Pack', url: 'https://amazon.de/dp/B07MJ1BTFX', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg' },
        { name: 'Pringles Sour Cream & Onion 6er-Pack', url: 'https://amazon.de/dp/B074MZ445W', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg' },
    ]);
})();

