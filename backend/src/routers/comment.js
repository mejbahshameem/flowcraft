const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const WorkFlow = require('../models/workflow');
const WorkFlowInstance = require('../models/workflowinstance');
const User = require('../models/user');
const Comment = require('../models/comment');
const jwt = require('jsonwebtoken');
const { commentLimiter } = require('../middleware/rateLimiter');
const { commentType } = require('../utility/enums');
/**
 * @swagger
 * /comment/post:
 *   post:
 *     summary: Post a comment on a workflow
 *     description: |
 *       Two distinct comment types share this endpoint. `PUBLIC` comments
 *       attach to the source workflow template and are visible to everyone
 *       who can view it. `PRIVATE` comments attach to the callers personal
 *       workflow instance and act as private notes that only the owner can
 *       see. Posting a `PRIVATE` comment on a public template, or a
 *       `PUBLIC` comment on a workflow instance, returns 403. Rate limited
 *       to 30 posts per 10 minutes per IP.
 *     tags: [Comments]
 *     operationId: postComment
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comment, workflow, comment_type]
 *             properties:
 *               comment: { type: string, maxLength: 2000 }
 *               workflow:
 *                 allOf: [{ $ref: '#/components/schemas/ObjectId' }]
 *                 description: Either a workflow id (PUBLIC) or a workflow instance id (PRIVATE).
 *               comment_type: { type: string, enum: [PUBLIC, PRIVATE] }
 *             example:
 *               comment: 'Great workflow, very helpful!'
 *               workflow: 64f6a1b2c3d4e5f60718293a
 *               comment_type: PUBLIC
 *     responses:
 *       201:
 *         description: Comment created.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
//posting a comment in other workflows. Both Public and private comments supported. May have 1 and 2
router.post('/comment/post', auth, commentLimiter, escapehtml, async (req, res, next) => {
	try {
		const wf =
			(await WorkFlow.findById({ _id: req.body.workflow })) ||
			(await WorkFlowInstance.findById({ _id: req.body.workflow }));
		if (!wf) {
			return res.status(404).json({ error: 'Workflow not found' });
		}
		if (
			(req.body.comment_type === commentType.PRIVATE &&
				(!('current_step' in wf) || !wf.owner.equals(req.user._id))) ||
			(req.body.comment_type === commentType.PUBLIC &&
				'current_step' in wf)
		) {
			return res.status(403).json({ error: 'Comment not allowed on this workflow' });
		}

		const comment = new Comment({
			comment: req.body.comment,
			workflow: req.body.workflow,
			comment_type: req.body.comment_type,
			commenter: req.user._id,
		});

		wf.comments = (wf.comments || []).concat({ comment: comment._id });

		await comment.save();
		await wf.save();
		res.status(201).send(comment);
	} catch (error) {
		next(error);
	}
});
/**
 * @swagger
 * /workflow/{_id}/comments/{type}/all/{token}:
 *   get:
 *     summary: List comments on a workflow or workflow instance
 *     description: |
 *       `PUBLIC` comments are returned for any caller. `PRIVATE` comments
 *       require the optional `token` segment to verify the caller owns the
 *       workflow instance, since private comments are personal notes
 *       rather than community discussion.
 *     tags: [Comments]
 *     operationId: listComments
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         description: Workflow id (for PUBLIC) or workflow instance id (for PRIVATE).
 *         schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' }
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [PUBLIC, PRIVATE] }
 *       - in: path
 *         name: token
 *         required: false
 *         description: Owner JWT, required for PRIVATE comments. Use the `owner` token returned by `GET /workflow/{_id}/view`.
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comments sorted by `createdAt` descending. The `commenter` field is populated with `{ _id, name, avatar }`.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Comment' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *///get all the comments of a workflow.
router.get('/workflow/:_id/comments/:type/all/:token?', async (req, res, next) => {
	const { _id, type, token } = req.params;

	try {
		const wf =
			(await WorkFlow.findById({ _id })) ||
			(await WorkFlowInstance.findById({ _id }));

		if (!wf) {
			return res.status(404).json({ error: 'Workflow not found' });
		}

		let user = null;
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			user = await User.findById({ _id: decoded._id });
		}

		if (
			(type === commentType.PRIVATE &&
				(!('current_step' in wf) ||
					!token ||
					!user ||
					!wf.owner.equals(user._id))) ||
			(type === commentType.PUBLIC && 'current_step' in wf)
		) {
			return res.status(403).json({ error: 'Not allowed to view these comments' });
		}

		const comments = await Comment.find({
			workflow: _id,
			comment_type: type,
		})
			.sort({ createdAt: -1 })
			.populate('commenter', 'name avatar');

		res.status(200).send(comments || []);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
