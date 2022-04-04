const mongoose = require('mongoose');
const { connectToMongo } = require('./mongo');
const TrackPrice = require('./price-track');

const AutoCheck = async ({ desiredPrice, items, interval }) => {
	await connectToMongo();

	const checkConnection = () => {
		if (mongoose.connection.readyState !== 1) {
			setTimeout(checkConnection, 50);
			return;
		}

		console.log(`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of ${interval / 3.6e6} Hours...`);

		setTimeout(() => {
			new TrackPrice({ desiredPrice, items });
		}, 5000);
		setInterval(() => {
			new TrackPrice({ desiredPrice, items });
		}, interval);
	};
	checkConnection();
};

module.exports.AutoCheck = AutoCheck;
