import { UpdateQuery } from 'mongoose';
import productModel, { IProduct } from '../models/productModel';

export async function updateProduct(data: UpdateQuery<Partial<IProduct>>) {
	const result = await productModel.findOneAndUpdate(
		{
			name: data.name,
		},
		data,
		{
			new: true,
		}
	);

	if (!result) throw new Error("Couldn't find product in the database. Thats an Error!");

	return result;
}
