const mongoose = require('mongoose');
const validator = require('validator');
const { commentType } = require('../utility/enums');

const commentSchema = new mongoose.Schema(
	{
		commenter: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},

		comment: {
			type: String,
			required: true,
			trim: true,
		},

		workflow: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'WorkFlow',
		},

		comment_type: {
			type: String,
			enum: [commentType.PRIVATE, commentType.PUBLIC],
			default: commentType.PUBLIC,
		},
	},
	{ timestamps: true }
);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
