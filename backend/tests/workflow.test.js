const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/task');
const WorkFlow = require('../src/models/workflow');
const {
	userOne,
	usertwo,
	workflow1,
	workflow3,
	workflow4,
	task3,
	setupDatabase,
} = require('./fixtures/db');
const { vote } = require('../src/utility/enums');

beforeEach(setupDatabase);

//1. Should create a workflow
test('Should Create a Workflow', async () => {
	const response = await request(app)
		.post('/api/v1/workflow/create')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			name: 'workflow1',
			description: 'test suite workflow',
		})
		.expect(201);

	//check in the database if workflow is created
	const wf = await WorkFlow.findById(response.body._id);
	expect(wf.name).toEqual('workflow1');
});

//2. Should not create a workflow for a unauthenticated user
test('Should not Create a Workflow for a unauthenticated user', async () => {
	const response = await request(app)
		.post('/api/v1/workflow/create')
		.send({
			name: 'workflow1',
			description: 'test suite workflow',
		})
		.expect(401);
});

//3. Should not create a workflow without a workflow name and description
test('Should not Create a Workflow without name and description', async () => {
	const response = await request(app)
		.post('/api/v1/workflow/create')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			description: 'test suite workflow',
		})
		.expect(400);
});

//4. Should edit a workflow by authentic user.
//Authentic user means the owner of the wrokflow. Other logged in user can not edit workflow of another user
//N.B.: Another user's workflow can be edited but for this first other user needs to copy the workflow which ultimately means editing own workflow
test('Should edit a workflow', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/edit`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			name: 'Edited workflow3',
			description: 'Edited description of third workflow',
		})
		.expect(200);

	//also check the name and description change of the workflow in the database
	const wf = await WorkFlow.findById(workflow3._id);
	expect(wf.name).toEqual('Edited workflow3');
	expect(wf.description).toEqual('Edited description of third workflow');
});

//5. Should NOT edit a workflow by authentic user if invalid field is used
test('Should NOT edit a workflow', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/edit`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			invalidEDIt: 'Edited workflow3',
		})
		.expect(400);
});

//6. Should NOT edit a workflow by a logged in user who is not the owner
test('Should NOT edit a workflow', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/edit`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			name: 'Edited workflow3',
		})
		.expect(400);
});

//7. Should set deleted status of a workflow by authentic user means by owner
test('Should set deleted status of a workflow', async () => {
	const response = await request(app)
		.delete(`/api/v1/workflow/${workflow3._id}/delete`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);

	//also check the deleted status of the workflow in the database
	const wf = await WorkFlow.findById(workflow3._id);
	expect(wf.deleted).toEqual(true);
});

//8. Should create a Task
test('Should Create a Task', async () => {
	const response = await request(app)
		.post('/api/v1/workflow/tasks/create')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			name: 'Task1',
			description: 'From Workflow1',
			days_required: 5,
			step_no: 1,
			workflow: workflow1._id,
		})
		.expect(201);
	//check in the database if Task is created
	const task = await Task.findById(response.body._id);
	expect(task).not.toBe(null);
});

//9. Should not save a task in the workflow if workflow owner and task creator is different user
test('Should not save a Task in the workflow', async () => {
	const response = await request(app)
		.post('/api/v1/workflow/tasks/create')
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			name: 'Task2',
			description: 'From Workflow1',
			days_required: 5,
			step_no: 1,
			workflow: workflow1._id,
		})
		.expect(404);

	//check in the database if Task2 is not added to workflow 1 as user 2 is trying to manipulate workflow 1 when
	//this user is not owner of this workflow
	const wf = await WorkFlow.findById(workflow1._id);
	expect(wf.tasks.length).toEqual(0);
});

//10. Should get all tasks for a particular workflow owner view
test('Should show all tasks under a workflow', async () => {
	const response = await request(app)
		.get(`/api/v1/workflow/${workflow3._id}/tasks/all`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);

	expect(response.body.tasks.length).toEqual(2); //as two tasks exist in workflow3
});

//11. Should not get all tasks for a particular workflow for a user who is not owner
test('Should not show all tasks under a workflow to the user who is not owner', async () => {
	const response = await request(app)
		.get(`/api/v1/workflow/${workflow3._id}/tasks/all`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(400);
});

//12. Should edit a task by authentic user
test('Should edit a task', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/tasks/${task3._id}`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			name: 'Edited task3',
		})
		.expect(200);
	//also check the name change in the database
	const task = await Task.findById(task3._id);
	expect(task.name).toEqual('Edited task3');
});

//13. Should NOT edit a task by authentic user if invalid field is used
test('Should NOT edit a task', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/tasks/${task3._id}`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send({
			invalidfield: 'Edited task3',
		})
		.expect(400);
});

// 14. Should NOT edit a task by Unauthentic user. Only Owner of the workflow can edit the tasks of that workflow.
//The other registered user can not edit a task of a workflow if the user is not the owner/creator of the workflwo.
test('Should not edit a task', async () => {
	const response = await request(app)
		.patch(`/api/v1/workflow/${workflow3._id}/tasks/${task3._id}`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(404);
});

//15. Should delete a task by authentic user
test('Should delete a task', async () => {
	const response = await request(app)
		.delete(`/api/v1/workflow/${workflow3._id}/tasks/${task3._id}`)
		.set('Authorization', `Bearer ${usertwo.tokens[0].token}`)
		.send()
		.expect(200);
});

//16. Should not delete a task by the others rather than creator
test('Should not delete a task', async () => {
	const response = await request(app)
		.delete(`/api/v1/workflow/${workflow3._id}/tasks/${task3._id}`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(404);

	//Also check in the database that it is not deleted
	const task = await Task.findById(task3._id);
	expect(task).not.toBe(null);
});

//17. Should create/clone a workflow for another user for editing purpose
// From after search view if user presses EDIT button of another user's workflow
// before editing we first need a copy of that workflow to make the requested user
// the owner of the to be edited workflow

test('Should Copy/clone a existing Workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow3._id}/copy`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(201);

	//check in the database if a new workflow is created
	//where all fields and their value are same with workflow 1 except the id because
	//these two are copy of each other but both should be different object/document in the collection
	const copy_wf = await WorkFlow.findById(response.body._id);
	expect(copy_wf.name).toEqual(workflow3.name);
	expect(copy_wf.description).toEqual(workflow3.description);
	expect(copy_wf._id).not.toEqual(workflow3._id);
});

//18. Should not copy a workflow for a user who is not logged in
// Workflow Editing is a feature only for registered logged in user
test('Should not Copy a existing Workflow', async () => {
	const response = await request(app)
		.post(`/api/v1/workflow/${workflow1._id}/copy`)
		.send()
		.expect(401);
});

//NEW
//19. Should Show voting history of a user
test('Should GET Voting history of a user', async () => {
	// To get the voting history user first needs to vote in a workflow
	// first voting from userOne to workflow 4
	await request(app)
		.post(`/api/v1/workflow/${workflow4._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.UP_VOTE,
		})
		.expect(200);

	// Lets give a down vote to workflow3
	await request(app)
		.post(`/api/v1/workflow/${workflow3._id}/vote`)
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send({
			vote: vote.DOWN_VOTE,
		})
		.expect(200);

	const response = await request(app)
		.get('/api/v1/user/voting/history')
		.set('Authorization', `Bearer ${userOne.tokens[0].token}`)
		.send()
		.expect(200);

	expect(response.body[0].vote).toBe('UP_VOTE');
	expect(response.body[1].vote).toEqual('DOWN_VOTE');
});
