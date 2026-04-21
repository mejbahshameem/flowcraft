const express = require('express');
const router = new express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const WorkFlow = require('../models/workflow');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const WorkFlowInstance = require('../models/workflowinstance');
const TaskInstance = require('../models/taskinstance');
const Task = require('../models/task');
const { vote } = require('../utility/enums');
const { workflowAccess } = require('../utility/enums');

/**
 * @swagger
 * /workflow/create:
 *   post:
 *     summary: Create a new workflow
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, location]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               access: { type: string, enum: [public, private] }
 *     responses:
 *       201: { description: Workflow created }
 *       400: { description: Validation error }
 */
//Create a workflow
router.post('/workflow/create', auth, escapehtml, async (req, res) => {
	try {
		const wf = new WorkFlow({
			...req.body,
			owner: req.user._id,
		});
		await wf.save();
		res.status(201).send(wf);
	} catch (error) {
		res.status(400).send(error);
	}
});

/**
 * @swagger
 * /workflow/{_id}/copy:
 *   post:
 *     summary: Copy another user's workflow for editing
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Workflow copied }
 *       400: { description: Workflow not found }
 */
//Copy a workflow of another user for editing
router.post('/workflow/:_id/copy', auth, async (req, res) => {
	const { _id } = req.params;

	try {
		const wf = await WorkFlow.findById({ _id });

		var copy_wf = new WorkFlow({
			_id: new mongoose.Types.ObjectId(),
			name: wf.name,
			description: wf.description,
			location: wf.location,
			owner: req.user._id,
		});

		const promises = [];
		wf.tasks.forEach(async element => {
			const temp = async function() {
				let task = await Task.findById({ _id: element.task });

				if (!task) {
					return res.status(400).send();
				}

				let copy_task = new Task({
					_id: new mongoose.Types.ObjectId(),
					name: task.name,
					description: task.description,
					step_no: task.step_no,
					days_required: task.days_required,
					workflow: copy_wf._id,
				});

				await copy_task.save();

				copy_wf.tasks = copy_wf.tasks.concat({
					task: copy_task._id,
				});
			};
			promises.push(temp());
		});

		await Promise.all(promises);
		await copy_wf.save();
		res.status(201).send(copy_wf);
	} catch (error) {
		res.status(400).send(error);
	}
});

//Edit the basic info of the existing workflow
//Editable field workflow name, description, location, access

router.patch('/workflow/:_id/edit', auth, escapehtml, async (req, res) => {
	const { _id } = req.params;

	const updates = Object.keys(req.body);

	const allowedUpdates = ['name', 'description', 'access', 'location'];
	const isvalidOperation = updates.every(update =>
		allowedUpdates.includes(update)
	);

	if (!isvalidOperation) {
		return res.status(400).send({ error: 'invalid updates!' });
	}

	try {
		const wf = await WorkFlow.findOne({
			_id,
			owner: req.user._id,
			deleted: false,
		});

		if (!wf) {
			return res.status(400).send();
		}

		updates.forEach(update => (wf[update] = req.body[update]));

		await wf.save();

		res.status(200).send(wf);
	} catch (error) {
		res.status(500).send(error);
	}
});

/**
 * @swagger
 * /workflow/{_id}/delete:
 *   delete:
 *     summary: Soft delete a workflow
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Workflow deleted }
 *       400: { description: Not found }
 */
//delete created workflow
router.delete('/workflow/:_id/delete', auth, async (req, res) => {
	const { _id } = req.params;
	try {
		const wf = await WorkFlow.findOne({
			_id,
			owner: req.user._id,
			deleted: false,
		});
		if (!wf) {
			return res.status(400).send();
		}

		wf.deleted = true;

		await wf.save();
		res.status(200).send({ success: true });
	} catch (error) {
		res.status(500).send(error);
	}
});

// //This route is not necessary. Deprecated
// router.post('/workflow/:_id/define', auth, async (req, res) => {
// 	try {
// 		// const wf = new WorkFlow({
// 		// 	...req.body,
// 		// 	owner: req.user._id,
// 		// });
// 		const wf = await WorkFlow.findById(req.params._id);
// 		const taskArr = req.body.taskArr;

// 		taskArr.forEach(function(task) {
// 			wf.tasks = wf.tasks.concat({ task });
// 		});

// 		await wf.save();
// 		res.status(201).send(wf);
// 	} catch (error) {
// 		res.status(400).send(error);
// 	}
// });

/**
 * @swagger
 * /workflow/{_id}/follow:
 *   post:
 *     summary: Follow a workflow
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Now following the workflow }
 *       400: { description: Already following or workflow deleted }
 */
//Registered user following a workflow
router.post('/workflow/:_id/follow', auth, async (req, res) => {
	try {
		const wf = await WorkFlow.findById(req.params._id);
		const follower = await User.findById(req.user._id);

		// checks if user already following the same workflow
		const workflows = wf.followers.filter(
			value =>
				value.follower.equals(follower._id) && value.completed === false
		);

		if (wf.deleted === true) {
			return res.status(400).send();
		}

		if (workflows.length > 0) {
			throw new Error('already following this workflow');
		}

		wf.followers = wf.followers.concat({ follower: follower._id });

		const { name, description, location, tasks, completed } = wf;

		const wfinstance = new WorkFlowInstance({
			name,
			description,
			location,
			completed,
			owner: req.user._id,
		});

		tasks.forEach(async function(value) {
			var task = await Task.findById(value.task);
			var { name, description, days_required, step_no, day_type } = task;
			var taskinstance = new TaskInstance({
				name,
				description,
				days_required,
				step_no,
				day_type,
				workflow_instance: wfinstance._id,
				owner: req.user._id,
			});
			wfinstance.tasks = wfinstance.tasks.concat({
				task: taskinstance._id,
			});
			await taskinstance.save();
		});

		follower.followedworkflow = follower.followedworkflow.concat({
			workflow: wf._id,
			workflowinstance: wfinstance._id,
		});

		await follower.save();
		await wf.save();
		await wfinstance.save();

		res.status(200).send({ success: true });
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

/**
 * @swagger
 * /workflow-instance/{_id}/unfollow:
 *   get:
 *     summary: Unfollow a workflow
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Unfollowed successfully }
 *       400: { description: Not following this workflow }
 */
//Registered user unfollowing a workflow
router.get('/workflow-instance/:_id/unfollow', auth, async (req, res) => {
	try {
		let wfinstance = await WorkFlowInstance.findOne({
			_id: req.params._id,
			owner: req.user._id,
		});

		if (!wfinstance) {
			return res.status(400).send();
		}

		const index_wfinstance = req.user.followedworkflow.findIndex(element =>
			element.workflowinstance.equals(wfinstance._id)
		);

		if (index_wfinstance === -1) {
			return res.status(400).send();
		}

		const main_wf_id = req.user.followedworkflow[index_wfinstance].workflow;
		const main_wf = await WorkFlow.findById({ _id: main_wf_id });

		main_wf.followers.splice(
			main_wf.followers.findIndex(element =>
				element.follower.equals(req.user._id)
			),
			1
		);

		req.user.followedworkflow.splice(
			req.user.followedworkflow.findIndex(element =>
				element.workflow.equals(main_wf_id)
			),
			1
		);

		await WorkFlowInstance.deleteOne({
			_id: req.params._id,
			owner: req.user._id,
		});

		await main_wf.save();
		await req.user.save();
		res.status(200).send({ success: true });
	} catch (error) {
		res.status(400).send({ error: error.message });
	}
});

/**
 * @swagger
 * /workflow/{_id}/vote:
 *   post:
 *     summary: Upvote or downvote a workflow
 *     tags: [Workflows]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vote]
 *             properties:
 *               vote: { type: string, enum: [up_vote, down_vote] }
 *     responses:
 *       200: { description: Vote recorded }
 *       400: { description: Already voted or invalid vote }
 */
//Registered user voting a workflow
router.post('/workflow/:_id/vote', auth, escapehtml, async (req, res) => {
	const { _id } = req.params;
	try {
		const wf = await WorkFlow.findById(_id);
		if (!wf) {
			return res.status(400).send();
		}

		if (
			!(
				req.body.vote === vote.DOWN_VOTE ||
				req.body.vote === vote.UP_VOTE
			)
		) {
			return res.status(400).send();
		}

		if (req.body.vote === vote.UP_VOTE) {
			const match_up_voter = wf.voting.up_vote.find(entry => {
				return req.user._id.equals(entry.voter);
			});

			const match_down_voter = wf.voting.down_vote.find(entry => {
				return req.user._id.equals(entry.voter);
			});

			if (match_up_voter) {
				return res.status(400).send({
					error: 'can not upvote twice from one account!',
				});
				// wf.voting.up_vote.push({ voter: req.user._id });
				// await wf.save();
				// return res.send({ success: true });
			}

			if (!match_down_voter) {
				wf.voting.up_vote.push({ voter: req.user._id });
				await wf.save();
				return res.send({ success: true });
			}

			wf.voting.down_vote.splice(
				wf.voting.down_vote.indexOf(match_down_voter),
				1
			);

			wf.voting.up_vote.push({ voter: req.user._id });
			await wf.save();
			return res.status(200).send({ success: 'Vote change successful' });
		}

		if (req.body.vote === vote.DOWN_VOTE) {
			const match_down_voter = wf.voting.down_vote.find(entry => {
				return req.user._id.equals(entry.voter);
			});

			if (match_down_voter) {
				return res.status(400).send({
					error: 'can not downvote twice from one account!',
				});
				// wf.voting.down_vote.push({ voter: req.user._id });
				// await wf.save();
				// return res.status(200).send({ success: true });
			}

			const match_up_voter = wf.voting.up_vote.find(entry => {
				return req.user._id.equals(entry.voter);
			});

			if (!match_up_voter) {
				wf.voting.down_vote.push({ voter: req.user._id });
				await wf.save();
				return res.status(200).send({ success: true });
			}

			wf.voting.up_vote.splice(
				wf.voting.up_vote.indexOf(match_up_voter),
				1
			);
			wf.voting.down_vote.push({ voter: req.user._id });
			await wf.save();
			return res.status(200).send({ success: 'Vote change successful' });
		}
	} catch (error) {
		res.status(500).send(error);
	}
});

/**
 * @swagger
 * /workflow/{_id}/view:
 *   get:
 *     summary: View workflow details and tasks
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Workflow details with tasks }
 *       400: { description: Workflow not found }
 */
//view the workflow after clicking from search result
router.get('/workflow/:_id/view', async (req, res) => {
	const { _id } = req.params;
	try {
		const wf = await WorkFlow.findById({ _id });
		if (!wf) {
			return res.status(400).send();
		}
		const tasks = await Task.find({ workflow: _id });
		if (!tasks) {
			return res.status(404).send();
		}

		const token = jwt.sign(
			{ _id: wf.owner.toString() },
			process.env.JWT_SECRET
		);

		res.status(200).send({
			name: wf.name,
			description: wf.description,
			tasks,
			owner: token,
			up_votes: wf.voting.up_vote.length,
			down_votes: wf.voting.down_vote.length,
			followers: wf.followers.length,
		});
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /workflows/popular:
 *   get:
 *     summary: Get top 10 popular workflows by upvotes
 *     tags: [Workflows]
 *     responses:
 *       200: { description: List of popular workflows }
 */
//popular workflow by the #of upvotes
router.get('/workflows/popular', async (req, res, next) => {
	try {
		const workflows = await WorkFlow.find({ deleted: false }).select(
			'_id name voting'
		);

		const popular = workflows
			.map(workflow => ({
				workflow: workflow._id,
				name: workflow.name,
				upvotes: workflow.voting?.up_vote?.length || 0,
			}))
			.sort((a, b) => b.upvotes - a.upvotes)
			.slice(0, 10);

		res.status(200).send(popular);
	} catch (error) {
		next(error);
	}
});

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Search workflows by interest and location
 *     tags: [Workflows]
 *     parameters:
 *       - in: query
 *         name: interest
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, up_vote] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: skip
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Search results }
 */
//Get Search result
router.get('/search', escapehtml, async (req, res) => {
	var sortBy = 'createdAt';
	if (req.query.sortBy === 'up_vote') {
		sortBy = 'voting.up_vote';
	}

	try {
		const docs = await WorkFlow.find(
			{
				$text: {
					$search: req.query.interest + ' ' + req.query.location,
				},
			},
			{ score: { $meta: 'textScore' } }
		)
			.where('access')
			.ne(workflowAccess.PRIVATE)
			.where('deleted')
			.equals(0)
			.sort({ score: { $meta: 'textScore' }, [sortBy]: -1 })
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip));
		res.status(200).send(docs);
	} catch (error) {
		res.status(500).send();
	}
});

module.exports = router;
