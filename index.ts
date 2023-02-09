import 'dotenv/config';
import { PrismaClient, Product } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { APIEmbed } from 'discord-api-types/v10';
import puppeteer from 'puppeteer';

const client = new PrismaClient();
const userAgent = process.env.USER_AGENT as string;
const webhookUrl = process.env.WEBHOOK_URL as string;
const webhookUrlForLogs = process.env.WEBHOOK_URL_FOR_LOGS as string;
const sevenDaysInMs = 6.048e8;
const oneDayInMs = 8.64e7;

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
			await axios(webhookUrlForLogs, {
				method: 'POST',
				data: JSON.stringify({
					content: `${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] ${product.name}`,
				}),
				headers: {
					'content-type': 'application/json',
				},
			});

			await page.goto(product.url);
			const pageData = await page.evaluate(() => document.documentElement.innerHTML);
			const newPrice = evaluatePrice(pageData);
			await updateDatabase(product, newPrice);
		} catch (error) {
			console.error(error);
			console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] An Error occured while running Price Check`);
			await axios(webhookUrlForLogs, {
				method: 'POST',
				data: JSON.stringify({
					content: `${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > [${i + 1}/${products.length}] An Error occured while running Price Check`,
				}),
				headers: {
					'content-type': 'application/json',
				},
			});
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
		await axios(webhookUrl, {
			method: 'POST',
			data: JSON.stringify(message),
			headers: {
				'content-type': 'application/json',
			},
		});

		await client.product.update({
			where: {
				id: product.id,
			},
			data: {
				lastNotifiedAt: new Date(),
			},
		});
	}
}

scrapePrices();
