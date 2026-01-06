const mongoose = require('mongoose');
const validator = require('validator');
const { taskStatus } = require('../utility/enums');

const taskinstanceSchema = new mongoose.Schema(
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

		status: {
			type: String,
			enum: [
				taskStatus.NOT_STARTED,
				taskStatus.IN_PROGRESS,
				taskStatus.COMPLETED,
			],
			default: taskStatus.NOT_STARTED,
		},

		days_required: {
			type: Number,
			required: true,
		},

		step_no: {
			type: Number,
			required: true,
		},

		timeFrame: {
			timelog: {
				start_time: {
					type: Date,
				},
				end_time: {
					type: Date,
				},
			},
		},

		notification: {
			type: Boolean,
			default: false,
		},

		owner: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},

		workflow_instance: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'WorkFlowInstance',
		},
	},
	{ timestamps: true }
);

const TaskInstance = mongoose.model('TaskInstance', taskinstanceSchema);

module.exports = TaskInstance;
