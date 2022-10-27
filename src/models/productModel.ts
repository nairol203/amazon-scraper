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
	displayName?: string;
	tag: string;
	url: string;
	img_url: string;
	date: Date;
	lastNoti: Date;
	price: number | null;
	desiredPrice?: number;
	prices: IPrices[];
}

const prices = new Schema({
	date: reqDate,
	price: reqNumber,
});

const product = new Schema({
	name: reqString,
	displayName: {
		type: String,
	},
	tag: reqString,
	url: reqString,
	img_url: reqString,
	date: reqDate,
	lastNoti: reqDate,
	price: reqNumber,
	desiredPrice: {
		type: Number,
	},
	prices: [prices],
});

export default model<IProduct>('price-check', product, 'price-check');
