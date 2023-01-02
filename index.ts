import 'dotenv/config';
import { PrismaClient, Product } from '@prisma/client';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const client = new PrismaClient();
const userAgent = process.env.USER_AGENT as string;

async function flushPrices() {
	await client.price.deleteMany();
	const products = await client.product.findMany({});
	products.forEach(async product => {
		await client.product.update({
			where: {
				id: product.id,
			},
			data: {
				price: null,
			},
		});
	});
}

async function scrapePrices() {
	const products = await client.product.findMany({
		where: {
			archived: false,
		},
	});

	const browser = await puppeteer.launch({
		headless: true,
		executablePath: '/usr/bin/chromium-browser',
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(0);
	await page.setUserAgent(userAgent);

	for (const [i, product] of products.entries()) {
		try {
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] ${product.name}`);

			await page.goto(product.url);
			const pageData = await page.evaluate(() => document.documentElement.innerHTML);
			const newPrice = evaluatePrice(pageData);
			await updateDatabase(product, newPrice);
		} catch (error) {
			console.error(error);
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] An Error occured while running Price Check`);
		}
	}

	await browser.close();
}

function evaluatePrice(scrapedData: string) {
	const $ = cheerio.load(scrapedData);
	const element = $('.a-price').find('.a-offscreen');
	const prices = element.text().split('€');
	const price = parseFloat(prices[0].replace(',', '.'));

	return isNaN(price) ? null : price;
}

async function updateDatabase(product: Product, newPrice: null | number) {
	if (product.price === newPrice) return;

	await client.product.update({
		where: {
			id: product.id,
		},
		data: {
			price: newPrice,
			prices: {
				create: {
					price: newPrice,
				},
			},
		},
	});
}

scrapePrices();
