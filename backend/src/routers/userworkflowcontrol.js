const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const User = require('../models/user');
const WorkFlow = require('../models/workflow');
const WorkFlowInstance = require('../models/workflowinstance');
const Task = require('../models/task');
const TaskInstance = require('../models/taskinstance');
const { taskStatus } = require('../utility/enums');
const moment = require('moment');
const TaskNotification = require('../models/tasknotification');

const syncWorkflowInstanceTasks = async (user, workflowInstanceId) => {
	if (!user || !user.followedworkflow || user.followedworkflow.length === 0) {
		return;
	}

	const relation = user.followedworkflow.find(entry =>
		entry.workflowinstance.equals(workflowInstanceId)
	);

	if (!relation) {
		return;
	}

	const sourceTasks = await Task.find({ workflow: relation.workflow }).sort({
		step_no: 1,
	});
	if (sourceTasks.length === 0) {
		return;
	}

	const existingTasks = await TaskInstance.find({
		workflow_instance: workflowInstanceId,
	}).select('step_no name');
	const existingKeys = new Set(
		existingTasks.map(task => `${task.step_no}:${task.name}`)
	);
	const missingTasks = sourceTasks.filter(
		task => !existingKeys.has(`${task.step_no}:${task.name}`)
	);

	if (missingTasks.length === 0) {
		return;
	}

	const createdTaskInstances = await TaskInstance.insertMany(
		missingTasks.map(task => ({
			name: task.name,
			description: task.description || '',
			days_required: task.days_required,
			step_no: task.step_no,
			workflow_instance: workflowInstanceId,
			owner: user._id,
		}))
	);

	await WorkFlowInstance.updateOne(
		{ _id: workflowInstanceId, owner: user._id },
		{
			$push: {
				tasks: {
					$each: createdTaskInstances.map(task => ({ task: task._id })),
				},
			},
		}
	);
};

/**
 * @swagger
 * /users/me/workflowinstance/following/all:
 *   get:
 *     summary: List all workflows the caller is currently following
 *     description: |
 *       Returns one entry per followed workflow with a completion
 *       percentage derived from the count of `COMPLETED` task instances.
 *       The endpoint also reconciles task drift: if the source workflow
 *       gained tasks since the user followed it, missing task instances
 *       are created on the fly before the percentage is computed.
 *     tags: [User Workflows]
 *     operationId: listFollowedWorkflows
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Followed workflow summaries.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/FollowedWorkflowSummary' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//getting the currently following workflow of a user and also the current progress
router.get(
	'/users/me/workflowinstance/following/all',
	auth,
	async (req, res, next) => {
		try {
			const user = await User.findById(req.user._id);

			if (!user || !user.followedworkflow || user.followedworkflow.length === 0) {
				return res.status(200).send([]);
			}

			const instanceIds = user.followedworkflow
				.map(entry => entry.workflowinstance)
				.filter(Boolean);

			const instances = await WorkFlowInstance.find({
				_id: { $in: instanceIds },
			});
			const instanceLookup = new Map(
				instances.map(instance => [instance._id.toString(), instance])
			);

			const results = await Promise.all(
				user.followedworkflow.map(async relation => {
					if (!relation.workflowinstance || !relation.workflow) {
						return null;
					}

					const instance = instanceLookup.get(
						relation.workflowinstance.toString()
					);
					if (!instance) {
						return null;
					}

					await syncWorkflowInstanceTasks(user, instance._id);

					const [taskInstances, totalTasks] = await Promise.all([
						TaskInstance.find({
							workflow_instance: instance._id,
						}),
						Task.countDocuments({ workflow: relation.workflow }),
					]);

					const completed = taskInstances.filter(
						t => t.status === taskStatus.COMPLETED
					).length;
					const percentage =
						totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);

					return {
						workflow_instance: instance._id,
						name: instance.name,
						percentage,
						tasks: totalTasks,
					};
				})
			);

			res.status(200).send(results.filter(Boolean));
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @swagger
 * /user/me/created-workflows/all:
 *   get:
 *     summary: List workflows owned by the caller
 *     description: |
 *       Returns each non deleted workflow the user owns with vote and
 *       follower counts plus an `is_copy` flag derived from
 *       `source_workflow`. Useful for the dashboard "my workflows" view.
 *     tags: [User Workflows]
 *     operationId: listOwnedWorkflows
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Owned workflows with aggregate counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/CreatedWorkflowSummary' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
//get all created workflows for a particular user
router.get('/user/me/created-workflows/all', auth, async (req, res) => {
	try {
		const workflows = await WorkFlow.find({
			owner: req.user._id,
			deleted: false,
		})
			.sort({ 'voting.up_votes': -1 });

		if (!workflows) return res.status(404).send();
		let workflow_reduced_stat = workflows.reduce(function(
			acc,
			workflow
		) {
			acc.push({
				_id: workflow._id,
				name: workflow.name,
				up_votes: workflow.voting.up_vote.length,
				down_votes: workflow.voting.down_vote.length,
				followers: workflow.followers.length,
				is_copy: Boolean(workflow.source_workflow),
			});
			return acc;
		},
		[]);
		res.status(200).send(workflow_reduced_stat);
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /following/workflow/{_id}/tasks/all:
 *   get:
 *     summary: List the callers personal task instances for a followed workflow
 *     description: |
 *       Returns the per follower task instances ordered by `step_no`. New
 *       tasks added to the source workflow are reconciled into the
 *       instance before the response is returned, so the list always
 *       matches the latest template structure.
 *     tags: [User Workflows]
 *     operationId: listFollowedWorkflowTasks
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         description: Workflow instance id, not the source workflow id.
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *     responses:
 *       200:
 *         description: Ordered task instance list.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/TaskInstance' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//get all taskinstance for a particular workflowinstance
router.get('/following/workflow/:_id/tasks/all', auth, async (req, res) => {
	const { _id } = req.params;
	try {
		const wf = await WorkFlowInstance.findOne({
			_id,
			owner: req.user._id,
		});

		if (!wf) {
			return res.status(400).send();
		}

		await syncWorkflowInstanceTasks(req.user, wf._id);

		const tasks = await TaskInstance.find({ workflow_instance: _id }).sort({
			step_no: 1,
		});

		res.send(tasks);
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /following/workflow/{wfid}/task/{tkid}/start:
 *   post:
 *     summary: Start a task on the caller's followed workflow instance
 *     description: |
 *       Transitions the task from `NOT_STARTED` to `IN_PROGRESS` and
 *       records the start time. The task must belong to the current step
 *       of an active (non completed) workflow instance.
 *     tags: [User Workflows]
 *     operationId: startFollowedTask
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: wfid
 *         required: true
 *         description: Workflow instance id.
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *       - in: path
 *         name: tkid
 *         required: true
 *         description: Task instance id.
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *     responses:
 *       200:
 *         description: Updated task instance.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TaskInstance' }
 *       400:
 *         description: Task is not in the current step or already started.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Start a particular task. Double Check Startability from the backend also
router.post(
	'/following/workflow/:wfid/task/:tkid/start',
	auth,
	async (req, res) => {
		const { wfid, tkid } = req.params;
		try {
			const wf = await WorkFlowInstance.findOne({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await TaskInstance.findById({ _id: tkid });

			if (!task || !wf) {
				return res.status(400).send();
			}

			if (
				!(wf.current_step === task.step_no) ||
				!(task.status === taskStatus.NOT_STARTED) ||
				wf.completed
			) {
				return res.status(400).send({ error: 'Not a valid operation' });
			}

			task.timeFrame.timelog.start_time = moment().add(1, 'hours');
			task.status = taskStatus.IN_PROGRESS;

			//	task.notification = true; //delete it test puprpose

			task.timeFrame.timelog.end_time = moment(
				task.timeFrame.timelog.start_time
			).add(task.days_required, 'days');

			await task.save();
			res.status(200).send(task);
		} catch (error) {
			res.status(500).send();
		}
	}
);

/**
 * @swagger
 * /following/workflow/{wfid}/task/{tkid}/end:
 *   post:
 *     summary: Complete a task and advance the workflow instance
 *     description: |
 *       Marks the task `COMPLETED` and stamps its end time. When every
 *       task at the current step is complete, the instance step counter is
 *       incremented. When all task instances are complete, the instance is
 *       flagged `completed` and the corresponding follower entry on the
 *       source workflow is also marked done.
 *     tags: [User Workflows]
 *     operationId: completeFollowedTask
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: wfid
 *         required: true
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *       - in: path
 *         name: tkid
 *         required: true
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *     responses:
 *       200:
 *         description: Task completed.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// End/Complete a particular task. Double Check Startability from the backend also
router.post(
	'/following/workflow/:wfid/task/:tkid/end',
	auth,
	async (req, res) => {
		const { wfid, tkid } = req.params;
		try {
			const wf = await WorkFlowInstance.findById({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await TaskInstance.findById({ _id: tkid });

			if (!task || !wf) {
				return res.status(400).send();
			}

			if (
				!(wf.current_step === task.step_no) ||
				!(task.status === taskStatus.IN_PROGRESS) ||
				wf.completed
			) {
				return res.status(400).send({ error: 'Not a valid operation' });
			}

			//Removed the below functions due to client's request. Deprecated

			// //Double check the expiry time of a task along with cronjobs
			// completion_time =
			// 	moment().add(1, 'hours') - task.timeFrame.timelog.start_time;
			// //conevrt miliseconds to days
			// if (completion_time / (1000 * 60 * 60 * 24) > task.days_required) {
			// 	return res.status(400).send({ error: 'Not a valid operation' });
			// }

			task.status = taskStatus.COMPLETED;
			task.timeFrame.timelog.end_time = moment().add(1, 'hours');

			await task.save();
			const updated_wf = await WorkFlowInstance.findById({ _id: wfid });

			const tasks = await TaskInstance.find({
				workflow_instance: updated_wf._id,
				step_no: updated_wf.current_step,
			});

			if (!tasks.some(task => task.status !== taskStatus.COMPLETED)) {
				updated_wf.current_step += 1;
			}

			await updated_wf.save();

			const task_entry = await TaskNotification.findOneAndDelete({
				task_id: task._id,
			});

			//update the status of main workflow for a specific user if it is finished.
			const all_task_instance = await TaskInstance.find({
				workflow_instance: wfid,
			});
			if (
				!all_task_instance.some(
					task => task.status !== taskStatus.COMPLETED
				)
			) {
				updated_wf.completed = true;
				await updated_wf.save();
				const index_wfinstance = req.user.followedworkflow.findIndex(
					element => element.workflowinstance.equals(updated_wf._id)
				);

				const main_wf_id =
					req.user.followedworkflow[index_wfinstance].workflow;
				const main_wf = await WorkFlow.findById({ _id: main_wf_id });

				main_wf.followers.forEach((follower, index) => {
					if (
						follower.follower.equals(req.user._id) &&
						follower.completed === false
					) {
						main_wf.followers[index].completed = true;
					}
				});

				await main_wf.save();
			}

			res.status(200).send({ success: true });
		} catch (error) {
			res.status(500).send();
		}
	}
);

/**
 * @swagger
 * /following/workflow/{wfid}/task/{tkid}/notify:
 *   post:
 *     summary: Enable or disable a deadline reminder email for a task
 *     description: |
 *       Sets the `notification` flag on the task instance. The cron job in
 *       `utility/cronjobs.js` scans tasks where the flag is true and sends
 *       a deadline email shortly before the configured end time.
 *     tags: [User Workflows]
 *     operationId: toggleTaskNotification
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: wfid
 *         required: true
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *       - in: path
 *         name: tkid
 *         required: true
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [task_notification]
 *             properties:
 *               task_notification: { type: boolean }
 *             example: { task_notification: true }
 *     responses:
 *       200:
 *         description: Notification preference saved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 notification: { type: boolean }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Enable/Disable task deadline email notification
router.post(
	'/following/workflow/:wfid/task/:tkid/notify',
	auth,
	async (req, res, next) => {
		const { wfid, tkid } = req.params;
		try {
			const wf = await WorkFlowInstance.findOne({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await TaskInstance.findOne({
				_id: tkid,
				owner: req.user._id,
			});

			if (!task || !wf) {
				return res.status(404).json({ error: 'Workflow or task not found' });
			}

			task.notification = Boolean(req.body.task_notification);
			await task.save();
			res.status(200).send({ success: true, notification: task.notification });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @swagger
 * /user/voting/history:
 *   get:
 *     summary: List every workflow the caller has voted on
 *     description: |
 *       Returns one entry per upvoted or downvoted workflow with the
 *       direction of the vote. Deleted workflows are excluded. Useful for
 *       rendering the "your activity" section of the user profile.
 *     tags: [User Workflows]
 *     operationId: getVotingHistory
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Voting history.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/VotingHistoryEntry' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Get the voting history for a particular user
router.get('/user/voting/history', auth, async (req, res, next) => {
	try {
		const workflows_upvoted = await WorkFlow.find({
			'voting.up_vote.voter': req.user._id,
			deleted: false,
		}).select('_id name');
		const workflows_downvoted = await WorkFlow.find({
			'voting.down_vote.voter': req.user._id,
			deleted: false,
		}).select('_id name');

		const history_upvote = workflows_upvoted.map(obj => ({
			_id: obj._id,
			name: obj.name,
			vote: 'UP_VOTE',
		}));

		const history_downvote = workflows_downvoted.map(obj => ({
			_id: obj._id,
			name: obj.name,
			vote: 'DOWN_VOTE',
		}));

		res.status(200).send(history_upvote.concat(history_downvote));
	} catch (error) {
		next(error);
	}
});

module.exports = router;
