import mongoose from 'mongoose';

const mongoURI = process.env.MONGO_URI as string;

export async function connectToMongo() {
	if (mongoose.connection.readyState === 1) return;
	if (mongoose.connection.readyState === 2) return;

	await mongoose.connect(mongoURI);
}
