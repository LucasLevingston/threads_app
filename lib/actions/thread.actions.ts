import { revalidatePath } from 'next/cache';
import Thread from '../models/thread.model';
import User from '../models/user.model';
import { connectToDB } from '../mongoose';

interface Params {
	text: string;
	author: string;
	communityId: string | null;
	path: string;
}

export async function createThread({ text, author, communityId, path }: Params) {
	try {
		connectToDB();

		const createdThread = await Thread.create({
			text,
			author,
			community: null,
		});

		// Update user model
		await User.findByIdAndUpdate(author, {
			$push: { threads: createdThread._id },
		});

		revalidatePath(path);
	} catch (error: any) {
		throw new Error(`Error creating thread: ${error.message}`);
	}
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
	connectToDB();

	//Calculate
	const skipAmount = (pageNumber - 1) * pageSize;

	//Fetch the posts t
	const postsQuery = Thread.find({ parentIdd: { $in: [null, undefined] } })
		.sort({
			createdAt: 'desc',
		})
		.skip(skipAmount)
		.limit(pageSize)
		.populate({ path: 'author', model: User })
		.populate({
			path: 'children',
			populate: {
				path: 'author',
				model: User,
				select: '_id name parentId image',
			},
		});

	const totalPostsCount = await Thread.countDocuments({});
	const posts = await postsQuery.exec();

	const isNext = totalPostsCount > skipAmount + posts.length;
	return { posts, isNext };
}

export async function fetchThreadById(threadId: string) {
	connectToDB();

	try {
		const thread = await Thread.findById(threadId)
			.populate({
				path: 'author',
				model: User,
				select: '_id id name image',
			}) // Populate the author field with _id and username
			.populate({
				path: 'community',
				// model: Community,
				select: '_id id name image',
			}) // Populate the community field with _id and name
			.populate({
				path: 'children', // Populate the children field
				populate: [
					{
						path: 'author', // Populate the author field within children
						model: User,
						select: '_id id name parentId image', // Select only _id and username fields of the author
					},
					{
						path: 'children', // Populate the children field within children
						model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
						populate: {
							path: 'author', // Populate the author field within nested children
							model: User,
							select: '_id id name parentId image', // Select only _id and username fields of the author
						},
					},
				],
			})
			.exec();

		return thread;
	} catch (err) {
		console.error('Error while fetching thread:', err);
		throw new Error('Unable to fetch thread');
	}
}

export async function addCommentToThread(
	threadId: string,
	commentText: string,
	userId: string,
	path: string
) {
	connectToDB();
	try {
		const originalThread = await Thread.findById(threadId);
		if (!originalThread) {
			throw new Error('Thread not found');
		}

		const commentThread = new Thread({
			text: commentText,
			author: userId,
			parentId: threadId,
		});

		const savedCommentThread = await commentThread.save();

		originalThread.children.push(savedCommentThread._id);

		await originalThread.save();

		revalidatePath(path);
	} catch (error: any) {
		throw new Error('Unable to fetch thread');
	}
}
