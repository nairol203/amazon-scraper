import mongoose from 'mongoose';
import { connectToMongo } from './connectToMongo';
import { IProduct } from '../models/productModel';
import TrackPrice from './TrackPrice';

const hourInMs = 3.6e6;

export default async function autoCheck(product: IProduct) {
	await connectToMongo();

	function checkConnection() {
		if (mongoose.connection.readyState !== 1) {
			setTimeout(checkConnection, 50);
			return;
		}

		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of 1 Hour...`);

		setTimeout(() => {
			new TrackPrice(product);
		}, 5000);
		setInterval(() => {
			new TrackPrice(product);
		}, hourInMs);
	}

	checkConnection();
}
