const got = require('got');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class trackPrice {
	constructor({ dbModel, desiredPrice = 0, element = '#priceblock_ourprice', urls }) {
		this.model = dbModel;
		this.desiredPrice = desiredPrice;
		this.urls = urls;
		this.element = element;
		this.cooldown = 6.048e8; // 7 Tage
		this.main();
	}

	async main() {
		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Starting Price Check for ${this.urls.length} Item(s)...`);
		for (const { name, url, img_url } of this.urls) {
			const price = await this.checkPrice(url);
			await this.updateDatabase(name, price, url, img_url);
		}
		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Checked ${this.urls.length} Item(s).`);
	}

	async checkPrice(productUrl) {
		const browser = await puppeteer.launch({
			headless: true,
			// executablePath: '/usr/bin/chromium-browser',
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();
		await page.goto(productUrl);
		const pageData = await page.evaluate(() => {
			return {
				html: document.documentElement.innerHTML,
			};
		});

		await browser.close();

		const $ = cheerio.load(pageData.html);
		const element = $('.a-offscreen');
		const prices = element.text().split('€');
		const price = parseFloat(prices[0].replace(',', '.'));

		return isNaN(price) ? null : price;
	}

	async updateDatabase(name, newPrice, url, img_url) {
		const savedItem = await this.model.findOne({ name });

		if (savedItem?.price === undefined) {
			await this.model.findOneAndUpdate(
				{
					name,
				},
				{
					name,
					url,
					img_url,
					price: newPrice,
					date: new Date(),
					$push: {
						prices: [
							{
								price: newPrice,
								date: new Date(),
							},
						],
					},
				},
				{
					new: true,
					upsert: true,
				}
			);
			newPrice < this.desiredPrice && (await this.sendWebhook(name, newPrice, url, img_url));
		} else if (savedItem?.price != newPrice) {
			// return console.log(2, newPrice);
			await this.model.findOneAndUpdate(
				{
					name,
				},
				{
					$push: {
						prices: [
							{
								price: savedItem?.price,
								date: new Date(),
							},
						],
					},
				}
			);
			await this.model.findOneAndUpdate(
				{
					name,
				},
				{
					price: newPrice,
					date: new Date(),
					$push: {
						prices: [
							{
								price: newPrice,
								date: new Date(),
							},
						],
					},
				}
			);
			if (newPrice && newPrice < this.desiredPrice) await this.sendWebhook(name, newPrice, url, img_url);
		} else if (new Date(savedItem?.date) < new Date()) {
			await this.model.findOneAndUpdate(
				{
					name,
				},
				{
					date: new Date(),
				}
			);
		}
	}

	async sendWebhook(name, price, url, img_url) {
		const savedItem = await this.model.findOne({ name });

		if (savedItem?.lastNoti + this.cooldown > new Date()) return;
		else {
			await got.post('https://discord.com/api/webhooks/859754893693943818/l_3tWRXmN8dF1knwbc2O67jPRLncmZK2bBzLQ-tieG8im9JE5NcEONixhoURrzmvGL6z', {
				body: JSON.stringify({
					content: 'Gute Neuigkeiten, <@&859771979845337098>!',
					embeds: [
						{
							title: '🚨 Amazon Price Alert',
							description: `Der Amazon Preis für [${name}](${url}) ist unter deinen Wunschpreis gefallen.\n\n🔗 [Ab zu Amazon!](${url})\n\nEs werden für die nächsten ${
								this.cooldown / 8.64e7
							} Tage keine Benachrichtigungen zu diesem Produkt versendet. Aktuelle Preisentwicklungen findest auf https://nairol.me/price-check.`,
							fields: [
								{
									name: 'Aktueller Preis',
									value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price),
									inline: true,
								},
								{
									name: 'Wunschpreis',
									value: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(this.desiredPrice),
									inline: true,
								},
							],
							thumbnail: {
								url: img_url,
							},
							color: 15258703,
							footer: {
								icon_url: 'https://cdn.discordapp.com/avatars/772508572647030796/8832d780f08e12afc8c1815d7105f911.webp?size=128',
								text: 'Amazon Price Alert | Contact @florian#0002 for help',
							},
						},
					],
				}),
				headers: {
					'content-type': 'application/json',
				},
			});

			await this.model.findOneAndUpdate(
				{
					name,
				},
				{
					lastNoti: new Date(),
				}
			);
		}
	}
}

module.exports = trackPrice;
