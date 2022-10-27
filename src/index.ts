import 'dotenv/config';
import { connectToMongo } from './functions/connectToMongo';
import TrackPrice from './functions/TrackPrice';
import productModel from './models/productModel';

const hourInMs = 3.6e6;

async function main() {
	await connectToMongo();
	const products = await productModel.find({});

	console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of 1 Hour for ${products.length} Items...`);

	setTimeout(() => {
		new TrackPrice(products);
	}, 5000);

	setInterval(() => {
		new TrackPrice(products);
	}, hourInMs);
}

main();
