const mongoose = require('mongoose');

const connectToMongo = async () => {
	if (mongoose.connection.readyState === 1) return;
	if (mongoose.connection.readyState === 2) return;

	await mongoose.connect(process.env.MONGO_URI);
};

module.exports.connectToMongo = connectToMongo;
