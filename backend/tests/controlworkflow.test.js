const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const mongoose = require('mongoose');
const WorkFlowInstance = require('../src/models/workflowinstance');
const TaskInstance = require('../src/models/taskinstance');
const WorkFlow = require('../src/models/workflow');
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

//1. Registered user following a workflow
test('Should follow a workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow
	const user = await User.findById(userOne_id);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);
});

//2. Guest user is not allowed to follow a workflow
test('Should not follow a workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.send()
		.expect(401);
});

//3. Registered user voting a workflow
test('Should vote a workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	//also check in the database
	const wf = await WorkFlow.findById(workflow4._id);
	expect(wf.voting.up_vote[0].voter).toEqual(userOne_id);
});

//4. Registered user voting a workflow then change the vote
test('Should change the vote of the workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	//also check in the database
	const wf = await WorkFlow.findById(workflow4._id);
	expect(wf.voting.up_vote.length).toEqual(1);

	const res = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.DOWN_VOTE,
		})
		.expect(200);

	//also check in the database
	const wf_changedvote = await WorkFlow.findById(workflow4._id);
	expect(wf_changedvote.voting.up_vote.length).toEqual(0); // assuring that one up_vote is reduced
	expect(wf_changedvote.voting.down_vote.length).toEqual(1); // vote changing successful one down_vote is added
});

//5. Same user can not up_vote Twice from the same account
test('Should not up_vote/down_vote twice from same user', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	//also check in the database
	const wf = await WorkFlow.findById(workflow4._id);
	expect(wf.voting.up_vote.length).toEqual(1);

	const res = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE, //upvote again from the same user
		})
		.expect(400); // it is not allowed

	//also check in the database
	const wf_after_vote = await WorkFlow.findById(workflow4._id);
	expect(wf_after_vote.voting.up_vote.length).not.toEqual(2); // attempt two up_vote twice is not
	//successful as voting length of up_vote did not increase
});

//6. Unauthenticated user can not vote
test('Should not vote from unauthenticated user', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(401); //unauthorized error as user is not logged in/registered.
});

//7. Workflow view after search result. Open to all type of users as per client's demand. No authentication required for
//this api. However options avaialble in this page like follow, voting are not accessible for guest user.
test('Should Show workflow information(tasks and descriptions)', async () => {
	const response = await request(app)
		.get(`/api/v1/workflow/${workflow4._id}/view`)
		.send()
		.expect(200);
});

//8. May have requirement. Show and Rank popular workflow by the Number of up_votes
test('Should show popular workflows', async () => {
	//first voting from userOne to workflow 4
	await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);
	// voting from userOne to downvote workflow 3
	await request(app)
		.post(`/api/v1/workflow/${workflow3._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.DOWN_VOTE,
		})
		.expect(200);

	// voting from userTwo to upvote workflow 1
	await request(app)
		.post(`/api/v1/workflow/${workflow1._id}/vote`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	const response = await request(app)
		.get(`/api/v1/workflows/popular`)
		.send()
		.expect(200);
	// in response workflow is sorted according to the up_vote rank
});

//9. Should show search result according to most recent update time
test('Should Show search result by most recently craeted', async () => {
	const response = await request(app)
		.get(`/api/v1/search`)
		.send({
			location: 'saarbrucken',
		})
		.expect(200);
	// In response we get the sorted order accoring to time. Workflow 1 and workflow 4 both
	// has location matching saarbrucken. But the creation time of workflow 4 is most recent
	// than workflow 1 so workflow comes before workflow 1 in search result.
});

//10. Should show search result according to the top votes and search text matching
test('Should Show search result by most top votes first', async () => {
	//workflow 4 getting one up vote
	await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	//workflow 1 getting one up vote
	await request(app)
		.post(`/api/v1/workflow/${workflow1._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	//workflow 1 getting ANOTHER up vote from different user
	await request(app)
		.post(`/api/v1/workflow/${workflow1._id}/vote`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	const response = await request(app)
		.get(`/api/v1/search?sortBy=up_vote`) //in this search result workflow 1 comes before workflow 4 as 1 has more up_votes.
		.send({
			location: 'saarbrucken',
		})
		.expect(200);
	//	console.log(response.body); // search result sorted by top votes
});

//11. getting the currently following workflow of a user and also the current progress
test('Should show currently following workflow of a user and also the current progress', async () => {
	//first making sure userOne is following workflow 4. Code inherited from test case 1 of this file
	await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow by length and ID matching
	var user = await User.findById(userOne_id);
	expect(user.followedworkflow.length).toEqual(1);
	expect(user.followedworkflow[0].workflow).toEqual(workflow4._id);

	//Then making sure userOne is following workflow 3. Code inherited from test case 1 of this file
	await request(app)
		.post(`/api/v1/workflow/${workflow3._id}/follow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database user following this workflow by length(2, increased by 1) and ID matching
	user = await User.findById(userOne_id);
	expect(user.followedworkflow.length).toEqual(2);
	expect(user.followedworkflow[1].workflow).toEqual(workflow3._id);

	//Finally Should show currently following all the workflows of a user and also the current progress
	//of those workflows for this particular user.
	const response = await request(app)
		.get(`/api/v1/users/me/workflowinstance/following/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	//console.log(response.body);//returns the workflow instance user is following also the progress
	//if one task is finished out of 4 task the progress is 25% for that workflow.
});

//*12. Should Get all the created workflows for a particular owner
test('Should show all the workflows created by particular user', async () => {
	const response = await request(app)
		.get(`/api/v1/user/me/created-workflows/all`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);

	// Match the data from server with our hardcoded data
	// Initially We made usertwo owner of total three workflows

	expect(response.body.length).toBe(3);
});

//*13. Should not Get all the created workflows for a particular owner without log in
test('Should not show the workflows created by particular user witohut authentication', async () => {
	const response = await request(app)
		.get(`/api/v1/user/me/created-workflows/all`)
		.send()
		.expect(401);
});

//*14. Should not get the workflows of that user whose deleted status is true
test('Should not show deleted workflows in created workflow list', async () => {
	//first we need to set deleted status for a workflow which owner is usertwo
	//The owner of workflow3 is usertwo
	//The below code inherited from wrokflow test suite test 7

	let response = await request(app)
		.delete(`/api/v1/workflow/${workflow3._id}/delete`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);

	//also check the deleted status of the workflow in the database
	const wf = await WorkFlow.findById(workflow3._id);
	expect(wf.deleted).toEqual(true);

	//Getting the list of workflows created by usertwo which should omit workflow 3 as its
	//deleted status is now true
	response = await request(app)
		.get(`/api/v1/user/me/created-workflows/all`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);
	expect(response.body.length).toBe(2); // as one got deleted from usertwo.
	//this user is now owner of 2 workflows
});

//*15. Should show all task instances(with task status) inside a workflow instance which a user is following
test('Should get all tasks instance inside a workflow instances', async () => {
	//for this test case we will first inherit code from the first test case of this suite
	//which is following a workflow
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
	response = await request(app)
		.get(`/api/v1/following/workflow/${wf_instance._id}/tasks/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);
	expect(response.body.length).toBe(workflow4.tasks.length);
	//We have to do this 'response.body.length - 1' because of one extra property
	// which is timestamps
});

//*16. Should Start a startable task in a workflow
// Tasks under a workflow which user is currently following should start
test('Should START a task', async () => {
	//for this test case we will first inherit code from the first test case of this suite and also
	//we will inherit the code of the previous test case
	//which is following a workflow
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
	expect(tasks.body.length).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the taks in step_no 1
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
});

//*17. Should End a Endable task in a workflow. Only IN_PROGRESS task is endable
// Tasks which have been already started under a workflow should be able to be ended
test('Should END a started task', async () => {
	//for this test case we will first inherit code from the first test case of this suite
	//which is following a workflow
	//because first a user should follow a workflow to start/end task
	// and also we will inherit the code of the test case 15 of this suite
	// we will take the code from above test case also because for ending a task we first need to start it
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
	expect(tasks.body.length).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the taks in step_no 1
	const index_first_step = tasks.body.findIndex(task => task.step_no === 1);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from NOT_STARTED to IN_PROGRESS
	let task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.IN_PROGRESS);

	//Now we can also End this task as it is in progress.
	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/end`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from IN_PROGRESS to COMPLETED
	task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.COMPLETED);
});

//NEW
//18. Registered user Unfollowing a workflow. Unfollow from that instance dedicated for the user
test('Should UNFOLLOW a workflow instance', async () => {
	// For unfollowing user first needs to follow the workflow
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

	response = await request(app)
		.get(`/api/v1/workflow-instance/${wf_instance._id}/unfollow`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the database
	wf_instance = await WorkFlowInstance.findOne({
		owner: userOne_id,
	});
	expect(wf_instance).toBe(null);
});

//*19. Should set task deadline notification if the task is in progress
// if notification is set then the user will be notified through email.
test('Should set Task Deadline notification', async () => {
	//for this test case we will first inherit code from the first test case of this suite
	//which is following a workflow
	//because first a user should follow a workflow to set notification
	// and also we will inherit the code of the test case 15 of this suite to start the task

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
	expect(tasks.body.length).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the taks in step_no 1
	const index_first_step = tasks.body.findIndex(task => task.step_no === 1);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from NOT_STARTED to IN_PROGRESS
	let task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.IN_PROGRESS);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/notify`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			task_notification: true,
		})
		.expect(200);
});

//*20. Should NOT Start a task in a workflow which can not be started
// Tasks under a workflow which user is currently following should start
test('Should NOT START a task which is not startable', async () => {
	//for this test case we will first inherit code from the first test case of this suite and also
	//we will inherit the code of the previous test case
	//which is following a workflow
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
	expect(tasks.body.length).toBe(workflow4.tasks.length);

	// Now all of the tasks which are NOT in step 1 of the workflow should NOT be able to be started
	// let's try to start a task which is not in step_no 1
	// the below line of code find the taks in step_no 2
	const index_second_step = tasks.body.findIndex(task => task.step_no === 2);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_second_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(400);
});

//*21. Should NOT End a task if it is not started

test('Should NOT END a task', async () => {
	//for this test case we will first inherit code from the first test case of this suite
	//which is following a workflow
	//because first a user should follow a workflow to end task
	// we will try to end a task which has not been started
	// we will take the code from above test case also because for ending a task we first need to start it
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
	expect(tasks.body.length).toBe(workflow4.tasks.length);

	// Now all of the tasks which are in step 1 of the workflow should be able to be started
	// let's start the first task in the task array..To be started it must be in step 1
	// the below line of code find the taks in step_no 1
	const index_first_step = tasks.body.findIndex(task => task.step_no === 1);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_first_step]._id}/start`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	//Also check in the databse the change in that particular task status from NOT_STARTED to IN_PROGRESS
	let task = await TaskInstance.findById({
		_id: tasks.body[index_first_step]._id,
	});
	expect(task.status).toEqual(taskStatus.IN_PROGRESS);

	//Now we can try to END the task which is in second Step and yet not started
	// we should get an error
	const index_second_step = tasks.body.findIndex(task => task.step_no === 2);

	response = await request(app)
		.post(`/api/v1/following/workflow/${wf_instance._id}/task/${tasks.body[index_second_step]._id}/end`
		)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(400);
});

//22. Should send empty not found 404 code if no following workflow is found
test('Should NOT show following workflow if user does not have any', async () => {
	const response = await request(app)
		.get(`/api/v1/users/me/workflowinstance/following/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(404);
});
