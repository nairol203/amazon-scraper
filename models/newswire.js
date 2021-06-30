const mongoose = require('mongoose');

const articles = mongoose.Schema({
	articleID: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model('articles', articles);