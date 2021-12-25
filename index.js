const mongoose = require('mongoose');
const { AutoCheck } = require('./functions/auto-check');
const pringlesModel = require('./models/pringles');
const ssdModel = require('./models/ssd');

const short = 1.08e7;
const long = 2.16e7;

// 1.08e+7 = 3 Stunden
// 4.32e+7 = 12 Stunden

// Pringles
AutoCheck({
	dbModel: pringlesModel,
	desiredPrice: 10,
	urls: [
		{
			name: 'Pringles Original 6er Pack',
			url: 'https://amazon.de/dp/B074N1TWL8',
			img_url: 'https://m.media-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg',
		},
		{
			name: 'Pringles Classic Paprika 6er Pack',
			url: 'https://amazon.de/dp/B07MJ1BTFX',
			img_url: 'https://m.media-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg',
		},
		{
			name: 'Pringles Sour Cream & Onion 6er Pack',
			url: 'https://amazon.de/dp/B074MZ445W',
			img_url: 'https://m.media-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg',
		},
		{
			name: 'Pringles Hot & Spicy 6er Pack',
			url: 'https://www.amazon.de/dp/B07MBT14B2',
			img_url: 'https://m.media-amazon.com/images/I/817QydVRFWS._SL1500_.jpg',
		},
	],
	interval: short,
});

// SSD's
AutoCheck({
	dbModel: ssdModel,
	urls: [
		{
			name: 'NVME Adapter mit Kühlkörper',
			url: 'https://www.amazon.de/dp/B07SQ12MV5',
			img_url: 'https://m.media-amazon.com/images/I/81i7wYxQw6L._AC_SL1500_.jpg',
		},
		{
			name: 'Samsung 970 EVO Plus 2 TB',
			url: 'https://www.amazon.de/dp/B07MLJD32L',
			img_url: 'https://m.media-amazon.com/images/I/71XXKiUYqcL._AC_SL1500_.jpg',
		},
		{
			name: 'Samsung 980 PRO 2 TB',
			url: 'https://www.amazon.de/dp/B08QJHLC8J',
			img_url: 'https://m.media-amazon.com/images/I/71uCSLY-W3L._AC_SL1500_.jpg',
		},
	],
	interval: long,
});
