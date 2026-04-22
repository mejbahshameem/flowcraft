const mongoose = require('mongoose');
const validator = require('validator');

const taskSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},

		description: {
			type: String,
			trim: true,
			default: '',
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
