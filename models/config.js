const mongoose = require('mongoose');

const reqString = {
	type: String,
	required: true,
};

const reqNumber = {
	type: Number,
	required: true,
};

const item = mongoose.Schema({
	name: reqString,
	url: reqString,
	img_url: reqString,
});

const config = mongoose.Schema({
	desiredPrice: reqNumber,
	items: [item],
	interval: reqNumber,
});

module.exports = mongoose.model('config', config, 'config');
