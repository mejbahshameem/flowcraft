const mongoose = require('mongoose');
const validator = require('validator');
const { workflowAccess } = require('../utility/enums');
const workFlowSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},

		description: {
			type: String,
			required: true,
			trim: true,
		},

		access: {
			type: String,
			enum: [workflowAccess.PRIVATE, workflowAccess.PUBLIC],
			default: workflowAccess.PUBLIC,
		},

		location: {
			type: String,
			trim: true,
		},

		voting: {
			up_vote: [
				{
					voter: {
						type: mongoose.Schema.Types.ObjectId,
						required: true,
						ref: 'User',
					},
				},
			],

			down_vote: [
				{
					voter: {
						type: mongoose.Schema.Types.ObjectId,
						required: true,
						ref: 'User',
					},
				},
			],
		},

		tasks: [
			{
				task: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'Task',
				},
			},
		],

		owner: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},

		followers: [
			{
				follower: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'User',
				},
				completed: {
					type: Boolean,
					default: false,
				},
			},
		],

		comments: [
			{
				comment: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'Comment',
				},
			},
		],

		deleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

workFlowSchema.index({ name: 'text', location: 'text' });
const WorkFlow = mongoose.model('WorkFlow', workFlowSchema);

module.exports = WorkFlow;
