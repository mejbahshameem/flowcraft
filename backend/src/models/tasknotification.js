const mongoose = require('mongoose');
const validator = require('validator');

const notificationSchema = new mongoose.Schema({
	task_name: {
		type: String,
		required: true,
	},

	step_no: {
		type: Number,
		required: true,
	},

	end_time: {
		type: Date,
	},

	follower_name: {
		type: String,
	},

	follower_email: {
		type: String,
	},

	workflow_name: {
		type: String,
		required: true,
	},

	task_id: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'TaskInstance',
	},
});

const TaskNotification = mongoose.model('TaskNotification', notificationSchema);

module.exports = TaskNotification;
