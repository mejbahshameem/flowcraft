const express = require('express');

const router = new express.Router();

router.get('/health', (_req, res) => {
	res.status(200).json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

module.exports = router;
