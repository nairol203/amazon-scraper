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

function calcTimeRange(minInMs: number, maxInMs: number) {
	return Math.random() * (maxInMs - minInMs) + minInMs;
}

function wait(timeInMs: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, timeInMs));
}

async function main() {
	const products = await db.query.products.findMany({
		where: eq(productsSchema.archived, false),
	});

	const browser = await puppeteer.launch({
		headless: true,
		executablePath: '/usr/bin/chromium-browser',
		args: ['--no-sandbox'],
	});

	const page = await browser.newPage();

	await page.setUserAgent(userAgent ?? 'Mozilla/5.0 (Windows; U; Windows NT 10.5;; en-US) Gecko/20100101 Firefox/71.3');

	for (const [i, product] of products.entries()) {
		try {
			const timeToWaitInMs = calcTimeRange(20_000, 120_000);
			const dateToContinue = new Date(Date.now() + timeToWaitInMs).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' });
			console.log(
				`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Waiting until ${dateToContinue} (${Math.round(timeToWaitInMs / 1000)}s) to continue.`
			);
			await wait(timeToWaitInMs);

			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] ${product.name}`);

			await page.goto(product.url);
			const pageData = await page.evaluate(() => document.documentElement.innerHTML);
			const parsedData = parseScrapedData(pageData);

			if (!parsedData.name) {
				console.error(`We might got IP Blocked. Skipping "${product.name}"`);
				continue;
			}

			await updateDatabase(product, parsedData);

			if (parsedData.price && parsedData.price < product.desiredPrice) {
				await sendNotification(product, parsedData.price);
			}
		} catch (error) {
			console.error(error);
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] An Error occured while running Price Check`);
		}
	}

	await browser.close();
}

function parseScrapedData(scrapedData: string) {
	const $ = cheerio.load(scrapedData);

	const name = $('#productTitle').text().trim();
	const imageUrl = $('#landingImage').attr('src');
	const price = $('.priceToPay .a-offscreen').text();

	const formattedPrice = price.slice(0, price.indexOf('€')).replace(',', '.');
	const parsedPrice = parseFloat(formattedPrice);
	const safePrice = isNaN(parsedPrice) ? null : parsedPrice;

	return { name, imageUrl, price: safePrice };
}

async function updateDatabase(
	product: Product,
	scrapedData: {
		name: string;
		imageUrl: string | undefined;
		price: number | null;
	}
) {
	if (product.price === scrapedData.price) return;

	await db.insert(prices).values({
		price: scrapedData.price,
		productId: product.id,
	});
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

main();
