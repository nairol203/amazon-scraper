import * as cheerio from 'cheerio';
import got from 'got';
import puppeteer from 'puppeteer';
import productModel, { IProduct } from '../models/productModel';
import { updateProduct } from './helperFunctions';

const userAgent = process.env.USER_AGENT as string;
const hostUrl = process.env.SERVER as string;
const webhookUrl = process.env.WEBHOOK_URL as string;
const sevenDaysInMs = 6.048e8;
const oneDayInMs = 8.64e7;

export default class TrackPrice {
	private products: IProduct[];

	constructor(products: IProduct[]) {
		this.products = products;
		this.main();
	}

	async main() {
		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Starting Price Check for ${this.products.length} products...`);
		await this.scrapeData();
		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Finished Price Check for ${this.products.length} products.`);
	}

	async scrapeData() {
		const browser = await puppeteer.launch({
			headless: true,
			// executablePath: '/usr/bin/chromium-browser',
			// args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();

		page.setUserAgent(userAgent);

		for (const product of this.products) {
			try {
				console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Starting Price Check for ${product.name}...`);

				await page.goto(product.url);
				const pageData = await page.evaluate(() => document.documentElement.innerHTML);
				const evaluatedPrice = this.evaluatePrice(pageData);
				await this.updateDatabase(product, evaluatedPrice);
			} catch (error) {
				// console.error(error);
				console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Error occured while checking ${product.name}.`);
			} finally {
				await got(`${hostUrl}/api/revalidate`);
				console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Checked ${product.name}.`);
			}
		}

		await browser.close();
	}

	evaluatePrice(scrapedData: string) {
		const $ = cheerio.load(scrapedData);
		const element = $('.a-offscreen');
		const prices = element.text().split('€');
		const price = parseFloat(prices[0].replace(',', '.'));

		return isNaN(price) ? null : price;
	}

	async updateDatabase(product: IProduct, evaluatedPrice: number | null) {
		const now = new Date();
		const savedItem = await productModel.findOne({ name: product.name });

		if (savedItem?.price === undefined) {
			/**
			 * First time update
			 */
			await updateProduct({
				name: product.name,
				url: product.url,
				price: evaluatedPrice,
				date: now,
				$push: {
					prices: [
						{
							price: evaluatedPrice,
							date: now,
						},
					],
				},
			});
		} else if (savedItem.price != evaluatedPrice) {
			/**
			 * Push the old price again
			 */
			await updateProduct({
				name: product.name,
				$push: {
					prices: [
						{
							price: savedItem.price,
							date: now,
						},
					],
				},
			});
			/**
			 * Push the new Price
			 */
			await updateProduct({
				name: product.name,
				price: evaluatedPrice,
				date: new Date(),
				$push: {
					prices: [
						{
							price: evaluatedPrice,
							date: now,
						},
					],
				},
			});
		} else {
			/**
			 * Only update the date (no price change)
			 */
			await updateProduct({
				name: product.name,
				date: now,
			});
		}

		if (evaluatedPrice && evaluatedPrice < (product.desiredPrice ?? 0)) {
			await this.sendDiscordNotification(product, evaluatedPrice);
		}
	}

	async sendDiscordNotification(product: IProduct, evaluatedPrice: number) {
		const savedItem = await productModel.findOne({ name: product.name });

		const lastNotifiedDate = new Date(savedItem?.lastNoti || '').getTime();
		const hasNotBeenNotifiedInThreshold = lastNotifiedDate + sevenDaysInMs < Date.now();

		const embed = {
			title: '🚨 Amazon Price Alert',
			description: `Der Amazon Preis für [${product.name}](${product.url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${
				product.url
			})\n\nEs werden für die nächsten ${
				sevenDaysInMs / oneDayInMs
			} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://nairol.me/price-check.`,
			fields: [
				{
					name: 'Aktueller Preis',
					value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(evaluatedPrice),
					inline: true,
				},
				{
					name: 'Wunschpreis',
					value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(product.desiredPrice ?? 0),
					inline: true,
				},
			],
			thumbnail: {
				url: product.img_url,
			},
			color: 15258703,
			footer: {
				icon_url: 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
				text: 'Amazon Price Alert | Contact @florian#0002 for help',
			},
		};

		if (hasNotBeenNotifiedInThreshold) {
			await got.post(webhookUrl, {
				body: JSON.stringify({
					content: 'Gute Neuigkeiten, <@&859771979845337098>!',
					embeds: [embed],
				}),
				headers: {
					'content-type': 'application/json',
				},
			});

			await updateProduct({
				name: product.name,
				lastNoti: new Date(),
			});
		}
	}
}
