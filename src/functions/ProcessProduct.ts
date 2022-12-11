import axios from 'axios';
import * as cheerio from 'cheerio';
import { APIEmbed } from 'discord-api-types/v10';
// @ts-ignore
import { Product } from '@prisma/client';
import { client } from '..';

const webhookUrl = process.env.WEBHOOK_URL as string;
const sevenDaysInMs = 6.048e8;
const oneDayInMs = 8.64e7;

export default class ProcessProduct {
	private product: Product;
	private evaluatedPrice: number | null = null;

	constructor(product: Product) {
		this.product = product;
	}

	evaluatePrice(scrapedData: string) {
		const $ = cheerio.load(scrapedData);
		const element = $('.a-price').find('.a-offscreen');
		const prices = element.text().split('€');
		const price = parseFloat(prices[0].replace(',', '.'));
		// const imgUrl = $('.imgTagWrapper').find('img').attr('src');

		this.evaluatedPrice = isNaN(price) ? null : price;
	}

	async updateDatabase() {
		const now = new Date();

		if (this.product.price != this.evaluatedPrice) {
			/**
			 * Push the old Price again
			 */
			await client.product.update({
				where: {
					id: this.product.id,
				},
				data: {
					price: this.product.price,
					prices: {
						create: {
							price: this.product.price,
						},
					},
				},
			});
			/**
			 * Push the new Price
			 */
			await client.product.update({
				where: {
					id: this.product.id,
				},
				data: {
					price: this.evaluatedPrice,
					prices: {
						create: {
							price: this.evaluatedPrice,
						},
					},
				},
			});
		} else {
			/**
			 * Only update the date (no price change)
			 */
			await client.product.update({
				where: {
					id: this.product.id,
				},
				data: {
					name: this.product.name,
				},
			});
		}

		// if (this.evaluatedPrice && this.evaluatedPrice < (this.product.desiredPrice ?? 0)) {
		// 	await this.sendDiscordNotification();
		// }
	}

	// async sendDiscordNotification() {
	// 	const savedItem = await productModel.findOne({ name: this.name });

	// 	const lastNotifiedDate = savedItem?.lastNoti ? new Date(savedItem?.lastNoti).getTime() : 0;
	// 	const hasNotBeenNotifiedInThreshold = lastNotifiedDate + sevenDaysInMs < Date.now();

	// 	const embed: APIEmbed = {
	// 		title: '🚨 Amazon Price Alert',
	// 		description: `Der Amazon Preis für [${this.name}](${this.url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${
	// 			this.url
	// 		})\n\nEs werden für die nächsten ${
	// 			sevenDaysInMs / oneDayInMs
	// 		} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://price.nairol.me.`,
	// 		fields: [
	// 			{
	// 				name: 'Aktueller Preis',
	// 				value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.evaluatedPrice ?? 0),
	// 				inline: true,
	// 			},
	// 			{
	// 				name: 'Wunschpreis',
	// 				value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.desiredPrice),
	// 				inline: true,
	// 			},
	// 		],
	// 		thumbnail: {
	// 			url: this.imgUrl,
	// 		},
	// 		color: 15258703,
	// 		footer: {
	// 			icon_url: 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
	// 			text: 'Amazon Price Alert | Contact @florian#0002 for help',
	// 		},
	// 	};

	// 	const message = {
	// 		content: 'Gute Neuigkeiten, <@&859771979845337098>!',
	// 		embeds: [embed],
	// 	};

	// 	if (hasNotBeenNotifiedInThreshold) {
	// 		await axios(webhookUrl, {
	// 			method: 'POST',
	// 			data: JSON.stringify(message),
	// 			headers: {
	// 				'content-type': 'application/json',
	// 			},
	// 		});

	// 		await updateProduct({
	// 			name: this.name,
	// 			lastNoti: new Date(),
	// 		});
	// 	}
	// }
}
