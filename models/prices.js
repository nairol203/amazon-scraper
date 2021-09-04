const mongoose = require('mongoose');

const prices = mongoose.Schema({
	productName: {
		type: String,
		required: true,
	},
	productPrice: {
		type: Number,
		required: true,
	},
    lastUpdate: {
        type: Date,
        required: true,
    }
});

module.exports = mongoose.model('prices', prices);