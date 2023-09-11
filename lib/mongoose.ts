import mongoose from 'mongoose';

let isConenected = false;

export const connectToDB = async () => {
	mongoose.set('strictQuery', true);

	if (!process.env.MONGODB_URL) return console.log('MONGODB_URL not found');
	if (isConenected) return console.log('Already connected to MongoDB');

	try {
		await mongoose.connect('process.env.MongoDB');
	} catch (error) {
		console.log(error);
	}
};
