import axios from 'axios';
import * as cheerio from 'cheerio';
import { APIEmbed } from 'discord-api-types/v10';
import productModel, { IProduct } from '../models/productModel';
import { updateProduct } from './helperFunctions';

const webhookUrl = process.env.WEBHOOK_URL as string;
const sevenDaysInMs = 6.048e8;
const oneDayInMs = 8.64e7;

export default class ProcessProduct {
	private name: string;
	private desiredPrice: number = 0;
	private url: string;
	private img_url: string;
	private evaluatedPrice: number | null = null;

	constructor({ name, url, img_url, desiredPrice }: IProduct) {
		this.name = name;
		this.desiredPrice = desiredPrice ?? this.desiredPrice;
		this.url = url;
		this.img_url = img_url;
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
		const savedItem = await productModel.findOne({ name: this.name });

		if (!savedItem) throw new Error(`Product (${this.name}) not found in the Database`);

		if (savedItem.price != this.evaluatedPrice) {
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
				price: this.evaluatedPrice,
				date: new Date(),
				$push: {
					prices: [
						{
							price: this.evaluatedPrice,
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

		if (this.evaluatedPrice && this.evaluatedPrice < (this.desiredPrice ?? 0)) {
			await this.sendDiscordNotification();
		}
	}

	async sendDiscordNotification() {
		const savedItem = await productModel.findOne({ name: this.name });

		const lastNotifiedDate = savedItem?.lastNoti ? new Date(savedItem?.lastNoti).getTime() : 0;
		const hasNotBeenNotifiedInThreshold = lastNotifiedDate + sevenDaysInMs < Date.now();

		const embed: APIEmbed = {
			title: '🚨 Amazon Price Alert',
			description: `Der Amazon Preis für [${this.name}](${this.url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${
				this.url
			})\n\nEs werden für die nächsten ${
				sevenDaysInMs / oneDayInMs
			} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://price.nairol.me.`,
			fields: [
				{
					name: 'Aktueller Preis',
					value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.evaluatedPrice ?? 0),
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

			await updateProduct({
				name: this.name,
				lastNoti: new Date(),
			});
		}
	}
}
