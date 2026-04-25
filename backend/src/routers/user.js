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
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, confirmPassword]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 7 }
 *               confirmPassword: { type: string }
 *     responses:
 *       201: { description: Account created, activation email sent }
 *       400: { description: Validation error or passwords do not match }
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
 *     summary: Activate account or get user by token
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Account activated or user data returned }
 *       400: { description: Invalid token or user not found }
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
 *     summary: Request account deactivation
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deactivation email sent }
 *       400: { description: Invalid token }
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
 *     summary: Confirm account deactivation
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Account deactivated }
 *       400: { description: Invalid token }
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
 *     summary: Request a password reset email
 *     tags: [Users]
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
 *       200: { description: Reset email sent if account exists }
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
 *     summary: Reset password using token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 7 }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid token or passwords do not match }
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
 *     summary: Check if two tokens belong to the same user
 *     tags: [Users]
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
 *       200: { description: Match result returned }
 *       400: { description: Invalid tokens }
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
 *     summary: Authenticate user and get token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns user info and token }
 *       400: { description: Invalid credentials }
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
 *     summary: Resend the activation email for an inactive account
 *     tags: [Users]
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
 *       200: { description: Activation email sent if the account is pending }
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
 *     summary: Logout from current device
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out successfully }
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
 *     summary: Logout from all devices
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Logged out from all devices }
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
 *     summary: Update current user profile
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               password: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: User updated }
 *       400: { description: Validation error }
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
 *     summary: Upload or update user avatar
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Avatar updated }
 *       400: { description: Invalid file type or size }
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
