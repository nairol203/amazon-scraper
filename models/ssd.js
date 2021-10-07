const mongoose = require('mongoose');

const reqString = {
	type: String,
	required: true,
};
const reqDate = {
	type: Date,
	required: true,
};
const reqNumber = {
	type: Number,
	required: true,
};

const prices = mongoose.Schema({
	date: reqDate,
	price: reqNumber,
});

const product = mongoose.Schema({
	name: reqString,
	url: reqString,
	img_url: reqString,
	date: reqDate,
	lastNoti: reqDate,
	price: reqNumber,
	prices: [prices],
});

module.exports = mongoose.model('ssd', product);
