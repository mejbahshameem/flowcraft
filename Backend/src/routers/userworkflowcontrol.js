const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const User = require('../models/user');
const WorkFlow = require('../models/workflow');
const WorkFlowInstance = require('../models/workflowinstance');
const TaskInstance = require('../models/taskinstance');
const { taskStatus } = require('../utility/eunms');
const moment = require('moment');
const TaskNotification = require('../models/tasknotification');

//getting the currently following workflow of a user and also the current progress
router.get(
	'/users/me/workflowinstance/following/all',
	auth,
	async (req, res) => {
		try {
			const user = await User.findById(req.user._id);

			//check if number of workflow following is zero
			if (user.followedworkflow.length === 0) {
				return res.status(404).send();
			}

			// checking unfinished workflow
			const workflowPromises = user.followedworkflow
				.filter(async instance => {
					return await WorkFlowInstance.find({
						_id: instance.workflowinstance,
						completed: false,
					});
				})
				.map(async obj => {
					const wfinstance = await WorkFlowInstance.findOne({
						_id: obj.workflowinstance,
					});

					//calculate percentage of finished tasks
					const tasks = await TaskInstance.find({
						workflow_instance: wfinstance._id,
					});

					var completed_tasks = 0;

					tasks.forEach(task => {
						if (task.status === taskStatus.COMPLETED) {
							completed_tasks++;
						}
					});

					percentage = Math.round(
						(completed_tasks / tasks.length) * 100
					);

					if (tasks.length === 0) {
						percentage = 0;
					}

					return {
						workflow_instance: wfinstance._id,
						name: wfinstance.name,
						percentage,
						tasks: tasks.length,
					};
				});

			Promise.all(workflowPromises).then(workflowInstances =>
				res.status(200).send(workflowInstances)
			);
		} catch (error) {
			res.status(500).send();
		}
	}
);

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
			});
			return acc;
		},
		[]);
		res.status(200).send(workflow_reduced_stat);
	} catch (error) {
		res.status(500).send();
	}
});

//get all taskinstance for a particular workflowinstance
router.get('/following/workflow/:_id/tasks/all', auth, async (req, res) => {
	const { _id } = req.params;
	try {
		const wf = await WorkFlowInstance.findOne({
			_id,
			owner: req.user._id,
		});
		const tasks = await TaskInstance.find({ workflow_instance: _id });

		if (!tasks || !wf) {
			return res.status(400).send();
		}
		tasks.push({ current_step_workflow: wf.current_step });
		res.send(tasks);
	} catch (error) {
		res.status(500).send();
	}
});

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

// Enable/Disable task deadline email notification
router.post(
	'/following/workflow/:wfid/task/:tkid/notify',
	auth,
	async (req, res) => {
		const { wfid, tkid } = req.params;
		try {
			const wf = await WorkFlowInstance.findById({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await TaskInstance.findById({ _id: tkid });

			if (!task || !wf || task.status === taskStatus.COMPLETED) {
				return res.status(400).send();
			}

			task.notification = req.body.task_notification;
			await task.save();
			res.status(200).send({ success: true });
		} catch (error) {
			res.status(500).send();
		}
	}
);

// Get the voting history for a particular user
router.get('/user/voting/history', auth, async (req, res) => {
	try {
		const workflows_upvoted = await WorkFlow.find({
			'voting.up_vote.voter': req.user._id,
		});
		const workflows_downvoted = await WorkFlow.find({
			'voting.down_vote.voter': req.user._id,
		});

		let history_upvote = workflows_upvoted.reduce(function(acc, obj) {
			acc.push({ _id: obj._id, name: obj.name, vote: 'UP VOTE' });
			return acc;
		}, []);

		let history_downvote = workflows_downvoted.reduce(function(acc, obj) {
			acc.push({ _id: obj._id, name: obj.name, vote: 'DOWN VOTE' });
			return acc;
		}, []);

		history = history_upvote.concat(history_downvote);
		res.status(200).send(history);
	} catch (error) {
		res.status(500).send();
	}
});

module.exports = router;
