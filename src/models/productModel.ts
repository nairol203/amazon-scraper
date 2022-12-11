import { Schema, model } from 'mongoose';

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

export interface IPrices {
	date: Date;
	price: number | null;
}

export interface IProduct {
	name: string;
	url: string;
	img_url: string;
	price: number | null;
	prices: IPrices[];
	desiredPrice?: number;
	archived?: boolean;
	date: Date;
	lastNoti: Date;
	tag: string;
}

const prices = new Schema({
	date: reqDate,
	price: reqNumber,
});

const product = new Schema({
	name: reqString,
	tag: reqString,
	url: reqString,
	img_url: reqString,
	date: reqDate,
	archived: {
		type: Boolean,
	},
	lastNoti: reqDate,
	price: reqNumber,
	desiredPrice: {
		type: Number,
	},
	prices: [prices],
});

export default model<IProduct>('price-check', product, 'price-check');
