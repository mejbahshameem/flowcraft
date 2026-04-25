const mongoose = require('mongoose');
const User = require('../../src/models/user');
const WorkFlow = require('../../src/models/workflow');
const Task = require('../../src/models/task');
const TaskNotification = require('../../src/models/tasknotification');
const Comment = require('../../src/models/comment');
const WorkFlowInstance = require('../../src/models/workflowinstance');
const TaskInstance = require('../../src/models/taskinstance');
const jwt = require('jsonwebtoken');

var task5_id = new mongoose.mongo.ObjectId('56cb91bdc3464f14678934ca');
var task6_id = new mongoose.mongo.ObjectId('56cb91bdc3464f14678934cb');
var task3_id = new mongoose.mongo.ObjectId('56cb91bdc3464f14678934cc');

const userOne_id = mongoose.Types.ObjectId();
const userOne = {
	_id: userOne_id,
	name: 'testuser1',
	email: 'testuser1@example.com',
	password: 'testpass123',
	confirmPassword: 'testpass123',
	account_status: 'ACTIVATED',
	tokens: [
		{
			token: jwt.sign({ _id: userOne_id }, process.env.JWT_SECRET),
		},
	],
};

const usertwo_id = mongoose.Types.ObjectId();
const usertwo = {
	_id: usertwo_id,
	name: 'testuser2',
	email: 'testuser2@example.com',
	password: 'testpass456',
	confirmPassword: 'testpass456',
	account_status: 'ACTIVATED',
	tokens: [
		{
			token: jwt.sign({ _id: usertwo_id }, process.env.JWT_SECRET),
		},
	],
};

const workflow1 = {
	_id: new mongoose.Types.ObjectId(),
	name: 'workflow1',
	location: 'saarbrucken',
	description: 'testing first workflow',
	owner: userOne_id,
};

const workflow2 = {
	_id: new mongoose.Types.ObjectId(),
	name: 'workflow2',
	description: 'testing second workflow',
	owner: usertwo_id,
};

const workflow3 = {
	_id: new mongoose.Types.ObjectId(),
	name: 'workflow3',
	description: 'testing third workflow',
	owner: usertwo_id,
	tasks: [
		{
			task: task3_id,
		},
	],
};

const workflow4 = {
	_id: new mongoose.Types.ObjectId(),
	name: 'workflow4',
	description: 'testing Four workflow',
	location: 'saarbrucken',
	owner: usertwo_id,
	tasks: [
		{
			task: task5_id,
		},
		{
			task: task6_id,
		},
	],
};

const task3 = {
	_id: task3_id,
	name: 'Task3',
	description: 'From Workflow3',
	days_required: 6,
	step_no: 1,
	workflow: workflow3._id,
};

const task4 = {
	_id: new mongoose.Types.ObjectId(),
	name: 'Task4',
	description: 'From Workflow3',
	days_required: 6,
	step_no: 2,
	workflow: workflow3._id,
};

const task5 = {
	_id: task5_id,
	name: 'Task5',
	description: 'From Workflow4',
	days_required: 2,
	step_no: 1,
	workflow: workflow4._id,
};

const task6 = {
	_id: task6_id,
	name: 'Task6',
	description: 'From Workflow4',
	days_required: 6,
	step_no: 2,
	workflow: workflow4._id,
};

const setupDatabase = async () => {
	await User.deleteMany();
	await WorkFlow.deleteMany();
	await Task.deleteMany();
	await WorkFlowInstance.deleteMany();
	await TaskInstance.deleteMany();
	await TaskNotification.deleteMany();
	await Comment.deleteMany();
	await new User(userOne).save();
	await new User(usertwo).save();
	await new WorkFlow(workflow1).save();
	await new WorkFlow(workflow2).save();
	await new WorkFlow(workflow3).save();
	await new WorkFlow(workflow4).save();
	await new Task(task3).save();
	await new Task(task4).save();
	await new Task(task5).save();
	await new Task(task6).save();
};

module.exports = {
	userOne_id,
	userOne,
	usertwo_id,
	usertwo,
	workflow1,
	workflow2,
	workflow3,
	workflow4,
	task3,
	setupDatabase,
};
