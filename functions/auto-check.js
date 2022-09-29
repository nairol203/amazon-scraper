const mongoose = require('mongoose');
const { connectToMongo } = require('./mongo');
const TrackPrice = require('./price-track');

const hourInMs = 3.6e6;

const AutoCheck = async ({ desiredPrice, items, interval }) => {
	const intervalInMs = interval * hourInMs;

	await connectToMongo();

	const checkConnection = () => {
		if (mongoose.connection.readyState !== 1) {
			setTimeout(checkConnection, 50);
			return;
		}

		console.log(
			`${new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} > Setting up Price Check with Interval of ${interval} Hour${interval === 1 ? '' : 's'}...`
		);

		setTimeout(() => {
			new TrackPrice({ desiredPrice, items });
		}, 5000);
		setInterval(() => {
			new TrackPrice({ desiredPrice, items });
		}, intervalInMs);
	};
	checkConnection();
};

module.exports.AutoCheck = AutoCheck;
