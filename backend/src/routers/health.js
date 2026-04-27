const express = require('express');

const router = new express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Service liveness probe
 *     description: |
 *       Returns a static `ok` response with the current timestamp and the
 *       process uptime in seconds. Render and the container HEALTHCHECK in
 *       backend/Dockerfile both poll this endpoint to confirm the service
 *       is alive. Note that this route is mounted at the application root
 *       rather than under `/api/v1`.
 *     tags: [System]
 *     operationId: getHealth
 *     servers:
 *       - url: /
 *         description: Application root (this endpoint is not under /api/v1)
 *     responses:
 *       200:
 *         description: Service is up.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthResponse' }
 */
router.get('/health', (_req, res) => {
	res.status(200).json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

module.exports = router;
