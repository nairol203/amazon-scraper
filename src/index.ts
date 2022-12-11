import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import ScrapePrices from './functions/ScrapePrices';

const hourInMs = 3.6e6;

export const client = new PrismaClient();

(async () => {
	const products = await client.product.findMany({
		where: {
			archived: false,
		},
	});

	console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of 1 Hour for ${products.length} Items...`);

	setTimeout(async () => {
		await new ScrapePrices(products).scrapeProducts();
	}, 5000);

	setInterval(async () => {
		await new ScrapePrices(products).scrapeProducts();
	}, hourInMs);
})();
