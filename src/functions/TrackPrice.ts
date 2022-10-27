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
	private desiredPrice: number = 0;
	private name: string;
	private url: string;
	private img_url: string;

	constructor({ desiredPrice, name, url, img_url }: IProduct) {
		this.desiredPrice = desiredPrice ?? this.desiredPrice;
		this.name = name;
		this.url = url;
		this.img_url = img_url;
		this.main();
	}

	async main() {
		try {
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Starting Price Check for ${this.name}...`);

			const scrapedData = await this.scrapeData();
			const evaluatedPrice = this.evaluatePrice(scrapedData);
			await this.updateDatabase(evaluatedPrice);
		} catch (error) {
			console.error(error);
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Error occured while checking ${this.name}.`);
		} finally {
			await got(`${hostUrl}/api/revalidate`);
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Checked ${this.name}.`);
		}
	}

	async scrapeData() {
		const browser = await puppeteer.launch({
			headless: true,
			executablePath: '/usr/bin/chromium-browser',
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();

		page.setUserAgent(userAgent);

		await page.goto(this.url);
		const pageData = await page.evaluate(() => document.documentElement.innerHTML);
		await browser.close();

		return pageData;
	}

	evaluatePrice(scrapedData: string) {
		const $ = cheerio.load(scrapedData);
		const element = $('.a-offscreen');
		const prices = element.text().split('€');
		const price = parseFloat(prices[0].replace(',', '.'));

		return isNaN(price) ? null : price;
	}

	async updateDatabase(evaluatedPrice: number | null) {
		const now = new Date();
		const savedItem = await productModel.findOne({ name: this.name });

		if (savedItem?.price === undefined) {
			/**
			 * First time update
			 */
			await updateProduct({
				name: this.name,
				url: this.url,
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
				name: this.name,
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
				name: this.name,
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
				name: this.name,
				date: now,
			});
		}

		if (evaluatedPrice && evaluatedPrice < this.desiredPrice) {
			await this.sendDiscordNotification(evaluatedPrice);
		}
	}

	async sendDiscordNotification(evaluatedPrice: number) {
		const savedItem = await productModel.findOne({ name: this.name });

		const lastNotifiedDate = new Date(savedItem?.lastNoti || '').getTime();
		const hasNotBeenNotifiedInThreshold = lastNotifiedDate + sevenDaysInMs < Date.now();

		const embed = {
			title: '🚨 Amazon Price Alert',
			description: `Der Amazon Preis für [${this.name}](${this.url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${
				this.url
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
					value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.desiredPrice),
					inline: true,
				},
			],
			thumbnail: {
				url: this.img_url,
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
				name: this.name,
				lastNoti: new Date(),
			});
		}
	}
}
