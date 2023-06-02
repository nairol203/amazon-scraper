import 'dotenv/config';
import * as cheerio from 'cheerio';
import { APIEmbed } from 'discord-api-types/v10';
import puppeteer from 'puppeteer';
import { db } from './db/db.js';
import { Product, prices, products as productsSchema } from './db/schema.js';
import { eq } from 'drizzle-orm';

const webhookUrl = process.env.WEBHOOK_URL as string;
const userAgent = process.env.USER_AGENT;
const sevenDaysInMs = 6.048e8;
const oneDayInMs = 8.64e7;

async function scrapePrices() {
	const products = await db.select().from(productsSchema).where(eq(productsSchema.archived, false));

	const browser = await puppeteer.launch({
		headless: true,
		executablePath: '/usr/bin/chromium-browser',
		args: ['--no-sandbox'],
	});

	const page = await browser.newPage();

	await page.setUserAgent(userAgent ?? 'Mozilla/5.0 (Windows; U; Windows NT 10.5;; en-US) Gecko/20100101 Firefox/71.3');

	for (const [i, product] of products.entries()) {
		try {
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] ${product.name}`);

			await page.goto(product.url);
			const pageData = await page.evaluate(() => document.documentElement.innerHTML);
			const newPrice = evaluatePrice(pageData);

			if (newPrice === 'ip-blocked') {
				console.error('We got IP Blocked. Aborting, no data!');
				break;
			}

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
	const productTitle = $('#productTitle');

	if (!productTitle.text().length) return 'ip-blocked';

	const priceElement = $('.a-price').find('.a-offscreen');
	const prices = priceElement.text().split('€');
	const price = parseFloat(prices[0].replace(',', '.'));

	return isNaN(price) ? null : price;
}

async function updateDatabase(product: Product, newPrice: null | number) {
	if (product.price === newPrice) return;

	await db
		.update(productsSchema)
		.set({
			price: newPrice,
		})
		.where(eq(productsSchema.id, product.id));

	await db.insert(prices).values({
		price: newPrice,
		productId: product.id,
	});

	if (newPrice && newPrice < product.desiredPrice) {
		await sendNotification(product, newPrice);
	}
}

async function sendNotification(product: Product, newPrice: null | number) {
	const lastNotifiedDate = product.lastNotifiedAt ? new Date(product.lastNotifiedAt).getTime() : 0;
	const hasNotBeenNotifiedInThreshold = lastNotifiedDate + sevenDaysInMs < Date.now();

	const embed: APIEmbed = {
		title: '🚨 Amazon Price Alert',
		description: `Der Amazon Preis für [${product.name}](${product.url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${
			product.url
		})\n\nEs werden für die nächsten ${
			sevenDaysInMs / oneDayInMs
		} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://price.nairol.me.`,
		fields: [
			{
				name: 'Aktueller Preis',
				value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(newPrice ?? 0),
				inline: true,
			},
			{
				name: 'Wunschpreis',
				value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(product.desiredPrice),
				inline: true,
			},
		],
		thumbnail: {
			url: product.imgUrl,
		},
		color: 15258703,
		footer: {
			icon_url: 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
			text: 'Amazon Price Alert | Contact @florian#0002 for help',
		},
	};

	const message = {
		content: 'Gute Neuigkeiten, <@&859771979845337098>!',
		embeds: [embed],
	};

	if (hasNotBeenNotifiedInThreshold) {
		await fetch(webhookUrl, {
			method: 'POST',
			body: JSON.stringify(message),
			headers: {
				'content-type': 'application/json',
			},
		});

		await db
			.update(productsSchema)
			.set({
				lastNotifiedAt: new Date(),
			})
			.where(eq(productsSchema.id, product.id));
	}
}

scrapePrices();
