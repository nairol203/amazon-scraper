import 'dotenv/config';
import { connectToMongo } from './functions/connectToMongo';
import ScrapePrices from './functions/ScrapePrices';
import productModel from './models/productModel';

const hourInMs = 3.6e6;

(async () => {
	await connectToMongo();
	const products = (await productModel.find()).filter(product => !product.archived);

	console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of 1 Hour for ${products.length} Items...`);

	setTimeout(async () => {
		await new ScrapePrices(products).scrapeProducts();
	}, 5000);

	setInterval(async () => {
		await new ScrapePrices(products).scrapeProducts();
	}, hourInMs);
})();
