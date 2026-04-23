const mongoose = require('mongoose');
const validator = require('validator');

const taskSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: [160, 'Task name must be 160 characters or less'],
		},

		description: {
			type: String,
			trim: true,
			default: '',
			maxlength: [2000, 'Task description must be 2000 characters or less'],
		},

		days_required: {
			type: Number,
			required: true,
			validate(value) {
				if (value < 1) {
					throw new Error('Days required must be greater than 0');
				}
			},
		},

		step_no: {
			type: Number,
			required: true,
			validate(value) {
				if (value < 1) {
					throw new Error('Step Number must be grater than 0');
				}
			},
		},

		workflow: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'WorkFlow',
		},
	},
	{ timestamps: true }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
