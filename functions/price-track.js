const got = require('got');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class trackPrice {
	constructor({ dbModel, desiredPrice = 0, items }) {
		this.model = dbModel;
		this.desiredPrice = desiredPrice;
		this.items = items;
		this.cooldown = 6.048e8; // 7 Tage
		this.main();
	}

	async main() {
		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Starting Price Check for ${this.items.length} Item(s)...`);

		const scrapedData = await this.scrapeData();
		const processedData = this.evaluatePrice(scrapedData);
		await this.updateDatabase(processedData);

		console.log(processedData);

		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Checked ${this.items.length} Item(s).`);
	}

	async scrapeData() {
		const data = [];

		const browser = await puppeteer.launch({
			headless: true,
			executablePath: '/usr/bin/chromium-browser',
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();

		for (const { name, url, img_url } of this.items) {
			await page.goto(url);
			const pageData = await page.evaluate(() => document.documentElement.innerHTML);
			data.push({ name, url, img_url, html: pageData });
		}

		await browser.close();

		return data;
	}

	evaluatePrice(scrapedData) {
		for (const item of scrapedData) {
			const $ = cheerio.load(item.html);
			const element = $('.a-offscreen');
			const prices = element.text().split('€');
			const price = parseFloat(prices[0].replace(',', '.'));

			item.html = null;
			item.price = isNaN(price) ? null : price;
		}

		return scrapedData;
	}

	async updateDatabase(processedData) {
		for (const { name, url, img_url, price } of processedData) {
			const savedItem = await this.model.findOne({ name });

			if (savedItem?.price === undefined) {
				// create new database entry
				await this.model.findOneAndUpdate(
					{
						name,
					},
					{
						name,
						url,
						price,
						date: new Date(),
						$push: {
							prices: [
								{
									price,
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
			} else if (savedItem?.price != price) {
				// push old price again
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
				// push new Price
				await this.model.findOneAndUpdate(
					{
						name,
					},
					{
						price,
						date: new Date(),
						$push: {
							prices: [
								{
									price,
									date: new Date(),
								},
							],
						},
					}
				);
			} else {
				// no price change, only update date
				await this.model.findOneAndUpdate(
					{
						name,
					},
					{
						date: new Date(),
					}
				);
			}

			// send notification if price is low
			/**if (price && price < this.desiredPrice) */ await this.sendNotification(name, price, url, img_url);
		}
	}

	async sendNotification(name, price, url, img_url) {
		const savedItem = await this.model.findOne({ name });

		if (new Date(savedItem?.lastNoti).getTime() + this.cooldown < Date.now()) {
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
