const express = require('express');
const router = new express.Router();
const auth = require('../middleware/auth');
const escapehtml = require('../middleware/escape-html');
const { authLimiter } = require('../middleware/rateLimiter');
const User = require('../models/user');
const multer = require('multer');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { useraccountStatus } = require('../utility/enums');
const {
	sendActivationToken,
	sendDeactivationToken,
	sendResetPassword,
} = require('../utility/emailService');

/**
 * @swagger
 * /users/create:
 *   post:
 *     summary: Register a new user account
 *     description: |
 *       Creates a new account in the `NOT_ACTIVATED` state and emails an
 *       activation token. The recipient must call `GET /user/{token}` from
 *       the link in that email before they can log in. Rate limited to 20
 *       attempts per 15 minutes per IP via the auth limiter.
 *     tags: [Users]
 *     operationId: createUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword]
 *             properties:
 *               name: { type: string, example: 'Ada Lovelace' }
 *               email: { type: string, format: email, example: 'ada@example.com' }
 *               password: { type: string, minLength: 7, format: password }
 *               confirmPassword: { type: string, format: password }
 *     responses:
 *       201:
 *         description: Account created and activation email queued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucess: { type: boolean, example: true }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
//Create a new user
router.post('/users/create', authLimiter, escapehtml, async (req, res) => {
	try {
		const user = new User(req.body);
		const isMatchPassword = req.body.password === req.body.confirmPassword;
		if (!isMatchPassword) {
			throw new Error('password does not match');
		}

		await user.save();
		const activationToken = await user.generateAccountToken();
		sendActivationToken(user.name, user.email, activationToken);
		// const token = await user.generateAuthToken();

		res.status(201).send({ sucess: true });
	} catch (error) {
		res.status(400).send(error.message);
	}
});

/**
 * @swagger
 * /user/{token}:
 *   get:
 *     summary: Activate an account or look up a user by JWT
 *     description: |
 *       Two behaviours share the same path. If the user is currently
 *       `NOT_ACTIVATED`, the account is flipped to `ACTIVATED` and a
 *       `{ success: true }` response is returned. Otherwise the populated
 *       user document is returned, which is how the workflow detail view
 *       reverse looks up an owner from a signed identifier.
 *     tags: [Users]
 *     operationId: getUserByToken
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Account or owner JWT signed with `JWT_SECRET`.
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activation result or user document.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - { $ref: '#/components/schemas/Success' }
 *                 - { $ref: '#/components/schemas/User' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
//Activate user by a matching token or return a user to the requested client
router.get('/user/:token', async (req, res) => {
	try {
		const { token } = req.params;
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const user = await User.findOne({
			_id: decoded._id,
			'tokens.token': token,
		});

		if (!user) {
			return res.status(400).send();
		}

		if (user.account_status !== useraccountStatus.ACTIVATED) {
			user.account_status = useraccountStatus.ACTIVATED;
			await user.save();
			return res.status(200).send({ success: true });
		}

		res.status(200).send(user);
	} catch (error) {
		res.status(500).send(error);
	}
});

/**
 * @swagger
 * /users/deactivate/{token}:
 *   post:
 *     summary: Request a deactivation confirmation email
 *     description: |
 *       Generates a fresh single use account token and emails it to the
 *       authenticated user. Confirming via `POST /deactivate/{token}` then
 *       flips the account status to `DELETED` and revokes all sessions.
 *     tags: [Users]
 *     operationId: requestDeactivation
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Existing account token used to confirm the caller's identity.
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deactivation email queued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucess: { type: boolean, example: true }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//Deactivate Account request
router.post('/users/deactivate/:token', auth, async (req, res) => {
	try {
		const { token } = req.params;
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findOne({
			_id: decoded._id,
			'tokens.token': token,
		});

		if (!user) {
			return res.status(400).send();
		}

		const deactivationToken = await user.generateAccountToken();
		sendDeactivationToken(user.name, user.email, deactivationToken);

		res.status(200).send({ sucess: true });
	} catch (error) {
		res.status(400).send(error.message);
	}
});

/**
 * @swagger
 * /deactivate/{token}:
 *   post:
 *     summary: Confirm and finalize account deactivation
 *     description: |
 *       Marks the account as `DELETED` and clears every active session
 *       token. The link emailed by `POST /users/deactivate/{token}` calls
 *       this endpoint with the single use token.
 *     tags: [Users]
 *     operationId: confirmDeactivation
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Account deactivated. }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
//Deactivate user account by a matching token
router.post('/deactivate/:token', async (req, res) => {
	try {
		const { token } = req.params;
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findOne({
			_id: decoded._id,
			'tokens.token': token,
		});

		if (!user) {
			return res.status(400).send();
		}

		user.account_status = useraccountStatus.DELETED;
		user.tokens = [];
		await user.save();

		res.status(200).send();
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /user/account/forget/password:
 *   post:
 *     summary: Trigger a password reset email
 *     description: |
 *       Always responds with `{ success: true }` regardless of whether the
 *       email matches a real account, to avoid leaking which addresses are
 *       registered. When a match exists the user receives an email
 *       containing a single use reset token. Rate limited.
 *     tags: [Users]
 *     operationId: forgotPassword
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset email dispatched if the address is registered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
//Password reset request
router.post('/user/account/forget/password', authLimiter, escapehtml, async (req, res) => {
	try {
		const user = await User.findOne({
			email: req.body.email,
		});

		if (!user) {
			return res.status(200).send({ success: true });
		}

		const resetpasswordToken = await user.generateAccountToken();
		sendResetPassword(user.name, user.email, resetpasswordToken);

		res.status(200).send({ success: true });
	} catch (error) {
		res.status(400).send(error.message);
	}
});

/**
 * @swagger
 * /user/account/reset/password:
 *   post:
 *     summary: Set a new password using a reset token
 *     description: |
 *       Consumes the reset token sent by `POST /user/account/forget/password`
 *       and replaces the user's password. All previously issued session
 *       tokens are revoked, forcing other devices to log in again.
 *     tags: [Users]
 *     operationId: resetPassword
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 7, format: password }
 *               confirmPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password updated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       400:
 *         description: Token expired or invalid, or passwords do not match.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
// Reset password with token and new password in request body
router.post('/user/account/reset/password', authLimiter, escapehtml, async (req, res) => {
	try {
		const { token, password, confirmPassword } = req.body;

		if (!token || !password || !confirmPassword) {
			return res.status(400).json({ error: 'All fields are required' });
		}

		if (password !== confirmPassword) {
			return res.status(400).json({ error: 'Passwords do not match' });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findOne({
			_id: decoded._id,
			'tokens.token': token,
		});

		if (!user) {
			return res.status(400).json({ error: 'Invalid or expired reset token' });
		}

		user.password = password;
		user.tokens = [];
		await user.save();

		res.status(200).json({ success: true });
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return res.status(400).json({ error: 'Reset token has expired' });
		}
		res.status(400).send(error.message);
	}
});

/**
 * @swagger
 * /match/{token1}/{token2}:
 *   get:
 *     summary: Check whether two signed user tokens reference the same account
 *     description: |
 *       Useful for the comment flow, where the workflow detail view returns
 *       a signed owner identifier. The frontend can then ask the server
 *       whether the viewer matches that owner without exposing the raw user
 *       id.
 *     tags: [Users]
 *     operationId: matchUserTokens
 *     parameters:
 *       - in: path
 *         name: token1
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: token2
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Match decision.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/MatchResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 */
//Match two user
router.get('/match/:token1/:token2', async (req, res) => {
	try {
		let matched_user = false;
		const { token1, token2 } = req.params;
		const decoded1 = jwt.verify(token1, process.env.JWT_SECRET);
		const decoded2 = jwt.verify(token2, process.env.JWT_SECRET);
		const user1 = await User.findById({
			_id: decoded1._id,
		});

		const user2 = await User.findById({
			_id: decoded2._id,
		});

		if (!user1 || !user2) {
			return res.status(400).send();
		}

		if (user1._id.equals(user2._id)) {
			matched_user = true;
		}

		res.status(200).send({ matched_user });
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Authenticate and obtain a bearer token
 *     description: |
 *       Verifies the email and password and returns a fresh JWT plus the
 *       basic profile fields the frontend needs for its session. If the
 *       account is still `NOT_ACTIVATED`, the response is 403 with the
 *       `NotActivatedError` shape so clients can offer a resend prompt.
 *       Rate limited to 20 attempts per 15 minutes per IP.
 *     tags: [Users]
 *     operationId: loginUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *             example:
 *               email: ada@example.com
 *               password: 'correct-horse-battery-staple'
 *     responses:
 *       200:
 *         description: Authenticated. Returns the bearer token and minimal user info.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403:
 *         description: Account exists but is not activated yet.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotActivatedError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
//user login
router.post('/users/login', authLimiter, escapehtml, async (req, res) => {
	try {
		const user = await User.findbyCredentials(
			req.body.email,
			req.body.password
		);

		const token = await user.generateAuthToken();
		const { name, avatar } = user;
		res.status(200).send({ user: { name, avatar }, token });
	} catch (error) {
		if (error.code === 'NOT_ACTIVATED') {
			return res.status(403).json({
				error: 'Please activate your account first',
				code: 'NOT_ACTIVATED',
				email: error.email,
				resendUrl: '/api/v1/users/activation/resend',
			});
		}
		res.status(400).json({ error: error.message });
	}
});

/**
 * @swagger
 * /users/activation/resend:
 *   post:
 *     summary: Resend the account activation email
 *     description: |
 *       Reissues a fresh activation token for an account that is still in
 *       the `NOT_ACTIVATED` state. Always responds 200 so callers cannot
 *       enumerate which addresses are registered or already activated.
 *     tags: [Users]
 *     operationId: resendActivation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Activation email queued if applicable.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
router.post('/users/activation/resend', authLimiter, escapehtml, async (req, res, next) => {
	try {
		const email = (req.body.email || '').toString().trim().toLowerCase();
		if (!email) {
			return res.status(400).json({ error: 'Email is required' });
		}

		const user = await User.findOne({ email });
		if (user && user.account_status === useraccountStatus.NOT_ACTIVATED) {
			const activationToken = await user.generateAccountToken();
			sendActivationToken(user.name, user.email, activationToken);
		}

		res.status(200).json({ success: true });
	} catch (error) {
		next(error);
	}
});

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Log the current session out
 *     description: Removes the bearer token from the user's `tokens` array. Other active sessions on the same account stay valid.
 *     tags: [Users]
 *     operationId: logoutCurrentSession
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Session terminated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
//LOGOUT User
router.post('/users/logout', auth, async (req, res) => {
	try {
		req.user.tokens = req.user.tokens.filter(token => {
			return token.token !== req.token;
		});
		await req.user.save();
		res.status(200).send({ success: true });
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /users/logoutAll/{token}:
 *   post:
 *     summary: Revoke every active session for a user
 *     description: |
 *       Verifies the provided JWT, locates the matching user, and clears
 *       every entry in their session token array. Useful from the password
 *       reset email flow to force re authentication everywhere.
 *     tags: [Users]
 *     operationId: logoutAllSessions
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: All sessions revoked.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */
//logout user from all devices
router.post('/users/logoutAll/:token', async (req, res) => {
	try {
		const { token } = req.params;
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findOne({
			_id: decoded._id,
			'tokens.token': token,
		});

		user.tokens = [];
		await user.save();
		res.status(200).send({ success: true });
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the authenticated user profile
 *     description: |
 *       Returns the full user document for the bearer token holder. Sensitive
 *       fields such as the password hash and active session tokens are
 *       stripped by the model's `toJSON` transform before serialization.
 *     tags: [Users]
 *     operationId: getCurrentUser
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//Get current authenticated user profile
router.get('/users/me', auth, async (req, res) => {
	try {
		res.status(200).send(req.user);
	} catch (error) {
		res.status(500).send();
	}
});

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     description: |
 *       Partial update for the user. Only `name` and `password` are
 *       editable; `confirmPassword` must match `password` when present.
 *       Any other field in the body returns 400 with `invalid updates`.
 *     tags: [Users]
 *     operationId: updateCurrentUser
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               password: { type: string, minLength: 7, format: password }
 *               confirmPassword: { type: string, format: password }
 *             example:
 *               name: 'Ada L.'
 *     responses:
 *       200:
 *         description: User updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               minItems: 2
 *               maxItems: 2
 *               items:
 *                 oneOf:
 *                   - { $ref: '#/components/schemas/User' }
 *                   - { $ref: '#/components/schemas/Success' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//update a user
router.patch('/users/me', auth, escapehtml, async (req, res) => {
	const isMatchPassword = req.body.password === req.body.confirmPassword;
	if (!isMatchPassword) {
		return res.status(400).send({ error: 'Password does not match!' });
	}
	delete req.body.confirmPassword;
	const updates = Object.keys(req.body);

	const allowedUpdates = ['name', 'password'];
	const isvalidOperation = updates.every(update =>
		allowedUpdates.includes(update)
	);

	if (!isvalidOperation) {
		return res.status(400).send({ error: 'invalid updates!' });
	}

	try {
		updates.forEach(update => (req.user[update] = req.body[update]));
		await req.user.save();

		res.status(200).send([req.user, { success: true }]);
	} catch (error) {
		res.status(400).send(error);
	}
});

//avatar upload support
const upload = multer({
	limits: {
		fileSize: 1000000,
	},
	fileFilter(req, file, callback) {
		if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
			return callback(new Error('Supported File Type: jpg,jpeg,png'));
		}
		callback(undefined, true);
	},
});

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     summary: Upload or replace the user's avatar
 *     description: |
 *       Accepts a single `avatar` file (jpg, jpeg, or png) up to 1 MB. The
 *       image is resized to 300x300, re encoded as PNG, and stored on the
 *       user document as a base64 data URL. The response body is the data
 *       URL string.
 *     tags: [Users]
 *     operationId: uploadAvatar
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated avatar data URL.
 *         content:
 *           text/plain:
 *             schema: { type: string, example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
//Edit avatar
router.post(
	'/users/me/avatar',
	auth,
	upload.single('avatar'),
	async (req, res) => {
		const buffer = await sharp(req.file.buffer)
			.resize({ width: 300, height: 300 })
			.png()
			.toBuffer();
		req.user.avatar = `data:image/png;base64,${buffer.toString('base64')}`;

		await req.user.save();

		res.send(req.user.avatar);
	},
	(error, req, res, next) => {
		res.status(400).send(error.message);
	}
);

module.exports = router;
