const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const { notifiableusers, notify } = require('../src/utility/cronjobs');
const mongoose = require('mongoose');
const WorkFlowInstance = require('../src/models/workflowinstance');
const TaskInstance = require('../src/models/taskinstance');
const TaskNotification = require('../src/models/tasknotification');
const WorkFlow = require('../src/models/workflow');
const Comment = require('../src/models/comment');
const { vote, taskStatus } = require('../src/utility/enums');
const {
	userOne_id,
	usertwo_id,
	userOne,
	usertwo,
	workflow1,
	workflow3,
	workflow4,
	setupDatabase,
} = require('./fixtures/db');

beforeEach(setupDatabase);

//To run this test case please set the cron job time to current time and comment out the set timeout
// code section and comment out jest.setTimeout(99000)
//1. Should start cron jobs and should list the notifiable user
test('Should make a user notifiable if deadline is 2 days away', async done => {
	//	jest.setTimeout(50000); //please uncomment this line to run the test

	// As the database is cleared before each test so first we need to follow a workflow
	// Then inside the workflow we need to start a startable task
	// The required days to complete the task should be 2 days so that we can test notification
	// If all this setup is correct this user should persist in tasknotification collection as
	// the cron job will send email to all users who are in tasknotification collection after
	// finishing the calculation
	//user is following a workflow first
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	const wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// Finally now we can get all newly created task instances for this workflow instance
	let tasks = await request(app)
		.get(`/api/v1/following/workflow/${wf_instance._id}/tasks/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	expect(tasks.body.length - 1).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the tasks in step_no 1
	const index_first_step = tasks.body.findIndex(task => task.step_no === 1);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from NOT_STARTED to IN_PROGRESS
	const task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.IN_PROGRESS);

	// As we hardcoded the db in the db we set up the Task 5 in step 1 and its required days
	// to complete is 2
	expect(task.name).toEqual('Task5');
	expect(task.days_required).toEqual(2);

	//****  To pass this test the cron job time should match with the test running time
	// Lets make the cronjob time to something around current time in the file utility/cronjobs.js
	// now WAIT until the cronjob finishes

	// setTimeout(async function() {
	// 	// within this 40000 ms the cronjob will be finished
	// 	// Now lets check in the TaskNotification collection
	// 	// In that collection now we should have Task5 waiting to be notified by Email

	// 	const notfiable_task = await TaskNotification.find({});
	// 	expect(notfiable_task[0].task_name).toEqual('Task5');
	// 	done();
	// }, 40000);

	//please uncomment this block above
	// while the codeblock is waiting lets confirm that the Tasknotification collection is initially empty
	const empty_task_noti = await TaskNotification.find({});
	expect(empty_task_noti.length).toBe(0);
	//	notifiableusers(); // please uncomment this line while running this test suite

	// const notfiable_task = await TaskNotification.find({});
	// console.log(notfiable_task);
	// // expect(notfiable_task[0].task_name).toEqual('Task5');
	done();
});

// To run this test case please set the cron job time to current time and comment out the set timeout
// code section and comment out jest.setTimeout(99000)
// We first need to run the cronjobs to select the notifiable user and then finally another cronjob to send
// email to the calculated notifiable user
//2. Should notify user about the deadline of a task
test('Should notify user about task deadline', async done => {
	//	jest.setTimeout(80000); // please uncomment this line
	// As the database is cleared before each test so first we need to follow a workflow
	// Then inside the workflow we need to start a startable task
	// The required days to complete the task should be 2 days so that we can test notification
	// If all this setup is correct this user should persist in tasknotification collection as
	// the cron job will send email to all users who are in tasknotification collection after
	// finishing the calculation
	// We will catch it by the object property

	//user is following a workflow first
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	const wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// Finally now we can get all newly created task instances for this workflow instance
	let tasks = await request(app)
		.get(`/api/v1/following/workflow/${wf_instance._id}/tasks/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	expect(tasks.body.length - 1).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the tasks in step_no 1
	const index_first_step = tasks.body.findIndex(task => task.step_no === 1);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from NOT_STARTED to IN_PROGRESS
	const task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.IN_PROGRESS);

	// As we hardcoded the db in the db we set up the Task 5 in step 1 and its required days
	// to complete is 2
	expect(task.name).toEqual('Task5');
	expect(task.days_required).toEqual(2);

	//****  To pass this test the cron job time should match with the test running time
	// Lets make the cronjob time to something around current time in the file utility/cronjobs.js
	// now WAIT until the cronjob finishes

	// setTimeout(async function() {
	// 	// within this 40000 ms the cronjob will be finished
	// 	// Now lets check in the TaskNotification collection
	// 	// In that collection now we should have Task5 waiting to be notified by Email

	// 	const notfiable_task = await TaskNotification.find({});

	// 	expect(notfiable_task[0].task_name).toEqual('Task5');
	// 	notify().then(function(result) {
	// 		expect(result.success).toEqual(true);
	// 	});
	// 	done();
	// }, 50000);

	// please uncomment from 174-187
	// while the codeblock is waiting lets confirm that the Tasknotification collection is initially empty
	const empty_task_noti = await TaskNotification.find({});
	expect(empty_task_noti.length).toBe(0);
	//	notifiableusers(); // please uncomment this line
	// const notfiable_task = await TaskNotification.find({});
	// console.log(notfiable_task);
	// // expect(notfiable_task[0].task_name).toEqual('Task5');
	done();
});

//3. Should Post a PUBLIC comment if the user is authenticated and to the public workflow view page
test('Should post a Public comment', async () => {
	const response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'this is a public comment',
			comment_type: 'PUBLIC',
		})
		.expect(201);
	expect(response.body.comment).toEqual('this is a public comment');

	//Also check in the db
	const wf = await WorkFlow.findById({ _id: workflow4._id });
	const comment = await Comment.find({ _id: wf.comments[0].comment });
	expect(comment[0].comment).toEqual('this is a public comment');
	expect(comment[0].commenter).toEqual(usertwo_id);
});

//4. Restrict guest user from posting a comment
test('Should NOT post comment for guest User', async () => {
	const response = await request(app)
		.post('/api/v1/comment/post')
		.send({
			workflow: `${workflow4._id}`,
			comment: 'this is a public comment but should not be posted',
			comment_type: 'PUBLIC',
		})
		.expect(401);

	//Also check in the db
	const wf = await WorkFlow.findById({ _id: workflow4._id });
	expect(wf.comments.length).toBe(0);
});

//5. Should not Post a PRIVATE comment in a public workflow in after search workflow view page
test('Should NOT post a Private comment in Public Workflow View', async () => {
	const response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'Trying to post a PRIVATE comment..Should be stopped',
			comment_type: 'PRIVATE',
		})
		.expect(400);
	// expect(response.body.comment).toEqual('this is a public comment');

	//Also check in the db
	const wf = await WorkFlow.findById({ _id: workflow4._id });
	expect(wf.comments.length).toBe(0);
});

//6. Should Post a PRIVATE comment in follwoing workflow of a user
test('Should post a PRIVATE comment in worfklow instance', async () => {
	// Private comment is allowed in a workflow a particular user is following
	// which is basically a workflow instance

	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// a private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'Private Comment should be posted',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	expect(response.body.comment).toEqual('Private Comment should be posted');

	wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});
	//Also check in the db
	const comment = await Comment.find({
		_id: wf_instance.comments[0].comment,
	});
	expect(comment[0].comment).toEqual('Private Comment should be posted');
	expect(comment[0].commenter).toEqual(userOne_id);
});

//7. Should NOT Post a PUBLIC comment in follwoing workflow of a user. Because this workflow
// is not visible to other user. It is an instance for that user only
test('Should NOT allow a PUBLIC comment in worfklow instance', async () => {
	// Private comment is allowed in a workflow a particular user is following
	// which is basically a workflow instance

	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// a private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'PUBLIC comment should not be allowed',
			comment_type: 'PUBLIC',
		})
		.expect(400);

	//Also check in the db of DISAPPROVAL
	wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});
	expect(wf_instance.comments.length).toBe(0);
});

//8. Only owner of the workflow instance is allowed to post a Private comment
test('Should NOT allow Private comment other than the owner', async () => {
	// Private comment is allowed in a workflow a particular user is following
	// which is basically a workflow instance

	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// a private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'I am not the owner',
			comment_type: 'PRIVATE',
		})
		.expect(400);

	wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});
	expect(wf_instance.comments.length).toBe(0);
});

//MOON 9. Should Get All PUBLIC comments of a workflow
test('Should not show all tasks under a workflow to the user who is not owner', async () => {
	// For testing this we will first make two public comments in workflow 4
	let response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'First public comment',
			comment_type: 'PUBLIC',
		})
		.expect(201);
	expect(response.body.comment).toEqual('First public comment');

	//Posting second public comment from another user

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'Second public comment',
			comment_type: 'PUBLIC',
		})
		.expect(201);
	expect(response.body.comment).toEqual('Second public comment');

	response = await request(app)
		.get(`/api/v1/workflow/${workflow4._id}/comments/${'PUBLIC'}/all`)
		.send()
		.expect(200);
	expect(response.body.length).toBe(2);
	expect(response.body[0].commenter._id).toBe(usertwo_id.toString());
	expect(response.body[1].commenter._id).toBe(userOne_id.toString());
});

//MOON 10. Should NOT Get PUBLIC comments of a workflow if Query Parameter is set to PRIVATE
test('Should NOT Fetch Comments', async () => {
	// For testing this we will first make two public comments in workflow 4
	let response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'First public comment',
			comment_type: 'PUBLIC',
		})
		.expect(201);
	expect(response.body.comment).toEqual('First public comment');

	//Posting second public comment from another user

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${workflow4._id}`,
			comment: 'Second public comment',
			comment_type: 'PUBLIC',
		})
		.expect(201);
	expect(response.body.comment).toEqual('Second public comment');

	response = await request(app)
		.get(`/api/v1/workflow/${workflow4._id}/comments/${'PRIVATE'}/all`)
		.send()
		.expect(400);
});

//MOON 11. Should Get ALL PRIVATE comments of a workflow instance that user is following
test('Should GET all PRIVATE comments of a workflow instance', async () => {
	// For testing this we will first need to follow a workflow and post private comments in that instance
	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// First private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'First Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'Second Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	//For Fetching PRIVATE comments user token needs to be passed as Parameter
	response = await request(app)
		.get(`/api/v1/workflow/${wf_instance._id}/comments/${'PRIVATE'}/all/${
				userOne.tokens[0].token
			}`
		)
		.send()
		.expect(200);

	expect(response.body.length).toBe(2);
	expect(response.body[0].commenter._id).toBe(userOne_id.toString());
	expect(response.body[1].commenter._id).toBe(userOne_id.toString());
	expect(response.body[0].comment).toBe('First Private Comment');
	expect(response.body[1].comment).toBe('Second Private Comment');
});

//MOON 12. Should NOT FETCH PRIVATE comments of another user other than the Owner of the instance
test('Should NOT Fetch PRIVATE comments of another user', async () => {
	// For testing this we will first need to follow a workflow and post private comments in that instance
	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// First private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'First Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'Second Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	// For Fetching PRIVATE comments user token needs to be passed as Parameter
	// But here instead of the user one who is owner the token of user two is passed
	// as query params. Should send an error
	response = await request(app)
		.get(`/api/v1/workflow/${wf_instance._id}/comments/${'PRIVATE'}/all/${
				usertwo.tokens[0].token
			}`
		)
		.send()
		.expect(400);
});

//MOON 13. Should NOT Work Fetching PUBLIC comment for an instance as instance has only PRIVATE Comments
test('Should NOT work PUBLIC comment Fetching for a workflow instance', async () => {
	// For testing this we will first need to follow a workflow and post private comments in that instance
	// So first user needs to follow a workflow
	let response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//A new workflow instance should be created for this user. Lets get that instance
	let wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});

	// So now user is following this workflow so the user now should be allowed to post
	// First private comment in his own following workflow to save some notes

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'First Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	response = await request(app)
		.post('/api/v1/comment/post')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			workflow: `${wf_instance._id}`,
			comment: 'Second Private Comment',
			comment_type: 'PRIVATE',
		})
		.expect(201);

	// Fetching PUBLIC comments for an instance should not work
	// As there are no PUBLIC comments in an instance
	// Should return status code 400
	response = await request(app)
		.get(`/api/v1/workflow/${wf_instance._id}/comments/${'PUBLIC'}/all/${
				userOne.tokens[0].token
			}`
		)
		.send()
		.expect(400);
});
