const mongoose = require('mongoose');
const validator = require('validator');

const workFlowInstanceSchema = new mongoose.Schema(
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

		location: {
			type: String,
			trim: true,
		},

		current_step: {
			type: Number,
			default: 1,
		},

		tasks: [
			{
				task: {
					type: mongoose.Schema.Types.ObjectId,
					required: true,
					ref: 'TaskInstance',
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

		completed: {
			type: Boolean,
			default: false,
		},

		owner: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
	},
	{ timestamps: true }
);

const WorkFlowInstance = mongoose.model(
	'WorkFlowInstance',
	workFlowInstanceSchema
);

module.exports = WorkFlowInstance;
