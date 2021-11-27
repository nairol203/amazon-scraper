const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const items = [
	{ name: 'Pringles Original 6er-Pack', url: 'https://amazon.de/dp/B074N1TWL8', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81ItWxMvL7S._SL1500_.jpg' },
	{ name: 'Pringles Classic Paprika 6er-Pack', url: 'https://amazon.de/dp/B07MJ1BTFX', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81iVuGS-aPS._SL1500_.jpg' },
	{ name: 'Pringles Sour Cream & Onion 6er-Pack', url: 'https://amazon.de/dp/B074MZ445W', img_url: 'https://images-na.ssl-images-amazon.com/images/I/81hqrQsy4VS._SL1500_.jpg' },
];

checkPrice();

async function checkPrice() {
	console.log('[CHECK] Checking Price Alert');
	for (const item of items) {
		const price = await getPrice(item.url);
		console.log(price);
	}
}

async function getPrice(url) {
	const browser = await puppeteer.launch({
		headless: true,
	});

	const page = await browser.newPage();
	await page.goto(url);

	const pageData = await page.evaluate(() => {
		return {
			html: document.documentElement.innerHTML,
		};
	});

	const $ = cheerio.load(pageData.html);

	const element = $('.a-price');

	const prices = element.text().split('€');

	await browser.close();
	return parseFloat(prices[0].replace(',', '.'));
}
