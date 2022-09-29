require('dotenv').config();
const { AutoCheck } = require('./functions/auto-check');
const { connectToMongo } = require('./functions/mongo');
const config = require('./models/config');

(async () => {
	await connectToMongo();

	const items = await config.find({});

	for (const item of items) {
		AutoCheck(item);
	}
})();
