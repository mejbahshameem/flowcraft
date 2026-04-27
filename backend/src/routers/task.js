const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const Task = require('../models/task');
const WorkFlow = require('../models/workflow');

/**
 * @swagger
 * /workflow/tasks/create:
 *   post:
 *     summary: Add a task to a workflow the caller owns
 *     description: |
 *       Appends a new task to an owned workflow. The owner sets a step
 *       number and an estimated duration in days; followers later see this
 *       data on their personal task instances.
 *     tags: [Tasks]
 *     operationId: createTask
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workflow, name, step_no, days_required]
 *             properties:
 *               workflow: { $ref: '#/components/schemas/ObjectId' }
 *               name: { type: string, maxLength: 120 }
 *               description: { type: string }
 *               step_no: { type: integer, minimum: 1 }
 *               days_required: { type: number, minimum: 0 }
 *             example:
 *               workflow: 64f6a1b2c3d4e5f60718293a
 *               name: Set up workstation
 *               description: Install required tooling and join the team chat
 *               step_no: 1
 *               days_required: 1
 *     responses:
 *       201:
 *         description: Task created.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Task' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
//Create task for the workflow
//workflow id is in req.body
router.post('/workflow/tasks/create', auth, escapehtml, async (req, res, next) => {
	try {
		const wf = await WorkFlow.findOne({
			_id: req.body.workflow,
			owner: req.user._id,
		});
		if (!wf) {
			return res.status(404).json({ error: 'Workflow not found or not owned by user' });
		}

		const task = new Task({
			name: req.body.name,
			description: req.body.description || '',
			days_required: req.body.days_required,
			step_no: req.body.step_no,
			workflow: wf._id,
		});
		await task.save();

		await WorkFlow.updateOne(
			{ _id: wf._id, owner: req.user._id },
			{ $push: { tasks: { task: task._id } } }
		);

		res.status(201).send(task);
	} catch (error) {
		next(error);
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

/**
 * @swagger
 * /workflow/{_id}/tasks/all:
 *   get:
 *     summary: List all tasks in an owned workflow
 *     description: |
 *       Returns the workflow's display fields together with its task list,
 *       intended for the workflow owners editing view. Followers should
 *       use `GET /following/workflow/{_id}/tasks/all` instead, which
 *       returns per follower task instance state.
 *     tags: [Tasks]
 *     operationId: listWorkflowTasks
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/ObjectIdPath'
 *     responses:
 *       200:
 *         description: Workflow header with task array.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WorkflowTasksList' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
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

/**
 * @swagger
 * /workflow/{wfid}/tasks/{tkid}:
 *   patch:
 *     summary: Edit a task
 *     description: |
 *       Partial update for a task. Only `name`, `description`,
 *       `days_required`, and `step_no` are editable; any other field is
 *       silently ignored. The task must belong to a workflow owned by the
 *       caller.
 *     tags: [Tasks]
 *     operationId: updateTask
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: wfid
 *         required: true
 *         description: Owning workflow id.
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *       - in: path
 *         name: tkid
 *         required: true
 *         description: Task id.
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               days_required: { type: number, minimum: 0 }
 *               step_no: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Updated task.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Task' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
//Edit an existing task
//Editable field task name and description

router.patch(
	'/workflow/:wfid/tasks/:tkid',
	auth,
	escapehtml,
	async (req, res, next) => {
		const { wfid, tkid } = req.params;

		const allowedUpdates = ['name', 'description', 'days_required', 'step_no'];
		const updates = Object.keys(req.body);
		const isValidOperation = updates.every(k => allowedUpdates.includes(k));

		if (!isValidOperation) {
			return res.status(400).json({ error: 'invalid updates!' });
		}

		try {
			const wf = await WorkFlow.findOne({
				_id: wfid,
				owner: req.user._id,
			});
			const task = await Task.findOne({ _id: tkid });

			if (!wf || !task || !task.workflow.equals(wf._id)) {
				return res.status(404).json({ error: 'Workflow or task not found' });
			}

			updates.forEach(update => (task[update] = req.body[update]));

			await task.save();

			res.status(200).send(task);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * @swagger
 * /workflow/{wfid}/tasks/{tkid}:
 *   delete:
 *     summary: Remove a task from a workflow
 *     description: |
 *       Permanently deletes the task document and removes its reference
 *       from the parent workflow's `tasks` array. Existing follower task
 *       instances created before deletion are left intact.
 *     tags: [Tasks]
 *     operationId: deleteTask
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
 *         description: Task deleted.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
//delete a task in the workflow
router.delete('/workflow/:wfid/tasks/:tkid', auth, async (req, res, next) => {
	try {
		const wf = await WorkFlow.findOne({
			_id: req.params.wfid,
			owner: req.user._id,
		});

		if (!wf) {
			return res.status(404).json({ error: 'Workflow not found' });
		}

		await Task.findOneAndDelete({ _id: req.params.tkid });

		wf.tasks = wf.tasks.filter(entry => !entry.task.equals(req.params.tkid));

		await wf.save();
		res.status(200).send({ success: true });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
