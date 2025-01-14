const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const Task = require('../models/task');
const WorkFlow = require('../models/workflow');
//Create task for the workflow
//workflow id is in req.body
router.post('/workflow/tasks/create', auth, escapehtml, async (req, res) => {
	try {
		const task = new Task({ ...req.body });
		await task.save();

		const wf = await WorkFlow.findOne({
			_id: task.workflow,
			owner: req.user._id,
		});
		if (!wf) {
			return res.status(400).send();
		}
		wf.tasks = wf.tasks.concat({ task: task._id });
		await wf.save();

		res.status(201).send(task);
	} catch (error) {
		res.status(500).send(error);
	}
});

// //GET /tasks?completed=true
// //GET /tasks?limit=2&skip=3
// //GET /tasks?sortBy=createdAt:desc
// router.get('/tasks', auth, async (req, res) => {
// 	const match = {};
// 	const sort = {};

// 	if (req.query.completed) {
// 		match.completed = req.query.completed === 'true';
// 	}

// 	if (req.query.sortBy) {
// 		const parts = req.query.sortBy.split(':');
// 		sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
// 	}

// 	try {
// 		//		const tasks = await Task.find({ owner: req.user._id });
// 		await req.user
// 			.populate({
// 				path: 'tasks',
// 				// match: match,
// 				match,
// 				options: {
// 					limit: parseInt(req.query.limit),
// 					skip: parseInt(req.query.skip),
// 					sort,
// 				},
// 			})
// 			.execPopulate();
// 		res.status(200).send(req.user.tasks);
// 	} catch (error) {
// 		res.status(500).send();
// 	}
// });

//get all tasks for a particular workflow
router.get('/workflow/:_id/tasks/all', auth, async (req, res) => {
	const { _id } = req.params;

	try {
		const wf = await WorkFlow.findOne({ _id, owner: req.user._id });
		if (!wf) {
			return res.status(400).send();
		}
		const tasks = await Task.find({ workflow: _id });
		if (!tasks) {
			return res.status(404).send();
		}

		res.status(200).send({
			name: wf.name,
			description: wf.description,
			access: wf.access,
			location: wf.location,
			tasks,
		});
	} catch (error) {
		res.status(500).send();
	}
});

// router.get('/tasks/:_id', auth, async (req, res) => {
// 	const { _id } = req.params;
// 	try {
// 		const task = await Task.findOne({ _id, owner: req.user._id });
// 		if (!task) {
// 			return res.status(404).send();
// 		}

// 		res.send(task);
// 	} catch (error) {
// 		res.status(500).send();
// 	}
// });

//Edit an existing task
//Editable field task name and description

router.patch(
	'/workflow/:wfid/tasks/:tkid',
	auth,
	escapehtml,
	async (req, res) => {
		const { wfid, tkid } = req.params;

		const updates = Object.keys(req.body);

		const allowedUpdates = [
			'name',
			'description',
			'days_required',
			'step_no',
		];
		const isvalidOperation = updates.every(update =>
			allowedUpdates.includes(update)
		);

		if (!isvalidOperation) {
			return res.status(400).send({ error: 'invalid updates!' });
		}

		try {
			const wf = await WorkFlow.findOne({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await Task.findOne({ _id: tkid });

			if (!wf || !task || !task.workflow.equals(wf._id)) {
				return res.status(400).send();
			}

			updates.forEach(update => (task[update] = req.body[update]));

			await task.save();

			res.status(200).send(task);
		} catch (error) {
			res.status(500).send(error);
		}
	}
);

//delete a task in the workflow
router.delete('/workflow/:wfid/tasks/:tkid', auth, async (req, res) => {
	try {
		var wf = await WorkFlow.findOne({
			_id: req.params.wfid,
			owner: req.user._id,
		});

		if (!wf) {
			return res.status(400).send();
		}

		const task = await Task.findOneAndDelete({
			_id: req.params.tkid,
		});

		wf.tasks = wf.tasks.filter(
			entry => !entry.task.equals(req.params.tkid)
		);

		await wf.save();
		res.status(200).send({ success: true });
	} catch (error) {
		res.status(500).send();
	}
});

module.exports = router;
