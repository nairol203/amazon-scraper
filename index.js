require('dotenv').config();
const { AutoCheck } = require('./functions/auto-check');

const short = 3.6e6;
const long = 1.44e7;

// 3.6e+6 = 1 Stunden
// 7.2e+6 = 2 Stunden
// 1.44e+7 = 4 Stunden
// 4.32e+7 = 12 Stunden

// Pringles
AutoCheck({
	desiredPrice: 10,
	items: [
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

// Raspberry Pi
AutoCheck({
	desiredPrice: 100,
	items: [
		{
			name: 'CanaKit - Starter Kit',
			url: 'https://www.amazon.de/dp/B081D7ZQZ8',
			img_url: 'https://m.media-amazon.com/images/I/71T0Kc-pCYL._AC_SL1500_.jpg',
		},
	],
	interval: long,
});

// SSD's
AutoCheck({
	items: [
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

// Tado
AutoCheck({
	desiredPrice: 85,
	items: [
		{
			name: 'tado° - Starter Kit',
			url: 'https://www.amazon.de/dp/B08LP1BWPQ',
			img_url: 'https://m.media-amazon.com/images/I/515gcW1B2rL._AC_SL1000_.jpg',
		},
	],
	interval: long,
});
