const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { error: 'Too many attempts, please try again later' },
	standardHeaders: true,
	legacyHeaders: false,
});

const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	message: { error: 'Too many requests, please try again later' },
	standardHeaders: true,
	legacyHeaders: false,
});

const commentLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 30,
	message: { error: 'Too many comments, please slow down' },
	standardHeaders: true,
	legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter, commentLimiter };
