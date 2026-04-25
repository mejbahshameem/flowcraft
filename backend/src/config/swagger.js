const swaggerJsdoc = require('swagger-jsdoc');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'FlowCraft API',
			version: '1.0.0',
			description: 'REST API for FlowCraft workflow management platform',
		},
		servers: [
			{
				url: '/api/v1',
				description: 'API v1',
			},
		],
		components: {
			securitySchemes: {
				BearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				User: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						name: { type: 'string' },
						email: { type: 'string', format: 'email' },
						account_status: {
							type: 'string',
							enum: ['activated', 'not_activated', 'deleted'],
						},
						avatar: { type: 'string', nullable: true },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				Workflow: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						name: { type: 'string' },
						description: { type: 'string' },
						location: { type: 'string' },
						access: { type: 'string', enum: ['public', 'private'] },
						owner: { type: 'string' },
						deleted: { type: 'boolean' },
						tasks: {
							type: 'array',
							items: {
								type: 'object',
								properties: { task: { type: 'string' } },
							},
						},
					},
				},
				Task: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						name: { type: 'string' },
						description: { type: 'string' },
						step_no: { type: 'number' },
						days_required: { type: 'number' },
						workflow: { type: 'string' },
					},
				},
				Comment: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						description: { type: 'string' },
						comment_type: { type: 'string', enum: ['public', 'private'] },
						workflow: { type: 'string' },
						commenter: { type: 'string' },
					},
				},
				Error: {
					type: 'object',
					properties: {
						error: { type: 'string' },
					},
				},
				Success: {
					type: 'object',
					properties: {
						success: { type: 'boolean' },
					},
				},
			},
		},
	},
	apis: ['./src/routers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
