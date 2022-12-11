import axios from 'axios';
import puppeteer from 'puppeteer';
import ProcessProduct from './ProcessProduct';
import { Product } from '@prisma/client';

const userAgent = process.env.USER_AGENT as string;
const hostUrl = process.env.SERVER as string;

export default class ScrapePrices {
	private products: Product[];

	constructor(products: Product[]) {
		this.products = products;
	}

	async scrapeProducts() {
		const browser = await puppeteer.launch({
			headless: true,
			executablePath: '/usr/bin/chromium-browser',
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();

		page.setUserAgent(userAgent);

		for (const [i, product] of this.products.entries()) {
			try {
				console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${this.products.length}] ${product.name}`);

				await page.goto(product.url);
				const pageData = await page.evaluate(() => document.documentElement.innerHTML);

				const processProduct = new ProcessProduct(product);
				processProduct.evaluatePrice(pageData);
				await processProduct.updateDatabase();
			} catch (error) {
				console.error(error);
				console.log(
					`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${this.products.length}] An Error occured while running Price Check`
				);
			}
		}

		await axios(`${hostUrl}/api/revalidate`, {
			method: 'GET',
		});
		await browser.close();
	}
}
