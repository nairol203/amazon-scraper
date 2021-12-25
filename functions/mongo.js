const mongoose = require('mongoose');

const mongoPath = 'mongodb+srv://florianbock:ofW5woB7johRzYml@cluster0.yy2j1.mongodb.net/price-tracking?retryWrites=true&w=majority';

const connectToMongo = async () => {
	if (mongoose.connection.readyState === 1) return;
	if (mongoose.connection.readyState === 2) return;

	await mongoose.connect(mongoPath);
};

module.exports.connectToMongo = connectToMongo;
