import 'dotenv/config';
import autoCheck from './functions/autoCheck';
import { connectToMongo } from './functions/connectToMongo';
import productModel from './models/productModel';

async function main() {
	await connectToMongo();

	const items = await productModel.find({});

	for (const item of items) {
		autoCheck(item);
	}
}

main();
