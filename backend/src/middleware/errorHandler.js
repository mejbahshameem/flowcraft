const errorHandler = (err, req, res, next) => {
	if (res.headersSent) {
		return next(err);
	}

	if (err.name === 'ValidationError') {
		const messages = Object.values(err.errors).map(e => e.message);
		return res.status(400).json({
			error: 'Validation failed',
			messages,
		});
	}

	if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({ error: 'Invalid token' });
	}

	if (err.name === 'TokenExpiredError') {
		return res.status(401).json({ error: 'Token has expired' });
	}

	if (err.name === 'CastError' && err.kind === 'ObjectId') {
		return res.status(400).json({ error: 'Invalid resource ID' });
	}

	if (err.code === 11000) {
		const field = Object.keys(err.keyPattern)[0];
		return res.status(409).json({
			error: `A record with that ${field} already exists`,
		});
	}

	if (err.name === 'MulterError') {
		return res.status(400).json({ error: err.message });
	}

	const statusCode = err.statusCode || 500;
	const message = statusCode === 500 ? 'Internal server error' : err.message;

	if (statusCode === 500) {
		console.error('Unhandled error:', err);
	}

	res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
