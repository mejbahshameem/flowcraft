const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const WorkFlow = require('../models/workflow');
const WorkFlowInstance = require('../models/workflowinstance');
const User = require('../models/user');
const Comment = require('../models/comment');
const jwt = require('jsonwebtoken');
const { commentType } = require('../utility/enums');
/**
 * @swagger
 * /comment/post:
 *   post:
 *     summary: Post a comment on a workflow
 *     tags: [Comments]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, workflow, comment_type]
 *             properties:
 *               description: { type: string }
 *               workflow: { type: string }
 *               comment_type: { type: string, enum: [public, private] }
 *     responses:
 *       201: { description: Comment posted }
 *       400: { description: Invalid comment or workflow }
 */
//posting a comment in other workflows. Both Public and private comments supported. May have 1 and 2
router.post('/comment/post', auth, escapehtml, async (req, res) => {
	try {
		// for testing output	fs.writeFileSync('test.txt', req.body.workflow);
		const wf =
			(await WorkFlow.findById({ _id: req.body.workflow })) ||
			(await WorkFlowInstance.findById({ _id: req.body.workflow }));
		if (!wf) {
			return res.status(400).send();
		}
		if (
			(req.body.comment_type === commentType.PRIVATE &&
				(!('current_step' in wf) || !wf.owner.equals(req.user._id))) ||
			(req.body.comment_type === commentType.PUBLIC &&
				'current_step' in wf)
		) {
			return res.status(400).send();
		}

		let comment = new Comment({
			...req.body,
			commenter: req.user._id,
		});

		wf.comments = wf.comments.concat({ comment: comment._id });

		await comment.save();
		await wf.save();
		res.status(201).send(comment);
	} catch (error) {
		res.status(500).send(error);
	}
});
/**
 * @swagger
 * /workflow/{_id}/comments/{type}/all/{token}:
 *   get:
 *     summary: Get all comments for a workflow
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [public, private] }
 *       - in: path
 *         name: token
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of comments }
 *       400: { description: Workflow not found or unauthorized }
 *///get all the comments of a workflow.
router.get('/workflow/:_id/comments/:type/all/:token?', async (req, res) => {
	const { _id, type, token } = req.params;

	try {
		const wf =
			(await WorkFlow.findById({ _id })) ||
			(await WorkFlowInstance.findById({ _id }));

		if (!wf) {
			return res.status(400).send();
		}

		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			user = await User.findById({
				_id: decoded._id,
			});
		}

		if (
			(type === commentType.PRIVATE &&
				(!('current_step' in wf) ||
					!token ||
					!user ||
					!wf.owner.equals(user._id))) ||
			(type === commentType.PUBLIC && 'current_step' in wf)
		) {
			return res.status(400).send();
		}

		const comments = await Comment.find({
			workflow: _id,
			comment_type: type,
		})
			.populate('commenter', 'name');

		if (!comments) return res.status(404).send();
		res.status(200).send(comments);
	} catch (error) {
		res.status(500).send();
	}
});

module.exports = router;
