const swaggerJsdoc = require('swagger-jsdoc');

/**
 * OpenAPI / Swagger specification for the FlowCraft REST API.
 *
 * The spec is generated from JSDoc blocks in src/routers/*.js and the
 * components defined here. All paths are mounted under /api/v1 and the
 * interactive UI is served at /api/docs by app.js.
 */
const options = {
	definition: {
		openapi: '3.0.3',
		info: {
			title: 'FlowCraft API',
			version: '1.0.0',
			description: [
				'REST API for the FlowCraft workflow collaboration platform.',
				'',
				'FlowCraft lets users design step by step workflow templates, share them publicly, follow workflows created by others, and track their personal progress through sequential task completion.',
				'',
				'**Authentication**',
				'',
				'Most endpoints require a JSON Web Token issued by `POST /users/login`. Send it in the `Authorization` header as `Bearer <token>`. Account activation, password reset, and two confirmation flows use single use account tokens delivered by email; those are passed in the URL path rather than the header.',
				'',
				'**Conventions**',
				'',
				'* All identifiers are 24 character MongoDB ObjectIds.',
				'* Timestamps use ISO 8601 in UTC.',
				'* Successful mutations return `{ "success": true }` unless a richer payload is documented.',
				'* Validation, authentication, and rate limit errors return `{ "error": "<reason>" }` with the appropriate HTTP status.',
			].join('\n'),
			contact: {
				name: 'FlowCraft Engineering',
				url: 'https://github.com/mejbahshameem/flowcraft',
			},
			license: {
				name: 'MIT',
				url: 'https://github.com/mejbahshameem/flowcraft/blob/main/LICENSE',
			},
		},
		servers: [
			{
				url: '/api/v1',
				description: 'Same origin (relative to the host serving these docs)',
			},
			{
				url: 'http://localhost:3000/api/v1',
				description: 'Local development',
			},
			{
				url: 'https://flowcraft-2s58.onrender.com/api/v1',
				description: 'Production (Render)',
			},
		],
		tags: [
			{
				name: 'Users',
				description: 'Registration, authentication, profile management, account lifecycle, and password recovery.',
			},
			{
				name: 'Workflows',
				description: 'Workflow templates: create, edit, delete, copy, follow, vote, search, and view.',
			},
			{
				name: 'Tasks',
				description: 'Tasks within a workflow template that the owner adds and edits.',
			},
			{
				name: 'User Workflows',
				description: 'A users own followed workflow instances and the per task progress tracking.',
			},
			{
				name: 'Comments',
				description: 'Public comments on workflow templates and private notes on personal workflow instances.',
			},
			{
				name: 'System',
				description: 'Service health and operational endpoints.',
			},
		],
		components: {
			securitySchemes: {
				BearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT issued by POST /users/login. Send as `Authorization: Bearer <token>`.',
				},
			},
			parameters: {
				ObjectIdPath: {
					name: '_id',
					in: 'path',
					required: true,
					description: 'MongoDB ObjectId of the target resource.',
					schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
				},
				PaginationLimit: {
					name: 'limit',
					in: 'query',
					required: false,
					description: 'Maximum number of items to return (default 20, capped at 50).',
					schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
				},
				PaginationSkip: {
					name: 'skip',
					in: 'query',
					required: false,
					description: 'Number of items to skip before returning results (default 0).',
					schema: { type: 'integer', minimum: 0, default: 0 },
				},
			},
			schemas: {
				ObjectId: {
					type: 'string',
					pattern: '^[a-fA-F0-9]{24}$',
					example: '64f6a1b2c3d4e5f60718293a',
				},
				Success: {
					type: 'object',
					properties: {
						success: { type: 'boolean', example: true },
					},
				},
				Error: {
					type: 'object',
					properties: {
						error: { type: 'string', example: 'Workflow not found' },
					},
				},
				NotActivatedError: {
					type: 'object',
					properties: {
						error: { type: 'string', example: 'Please activate your account first' },
						code: { type: 'string', example: 'NOT_ACTIVATED' },
						email: { type: 'string', format: 'email' },
						resendUrl: { type: 'string', example: '/api/v1/users/activation/resend' },
					},
				},
				User: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string', example: 'Ada Lovelace' },
						email: { type: 'string', format: 'email', example: 'ada@example.com' },
						account_status: {
							type: 'string',
							enum: ['ACTIVATED', 'NOT_ACTIVATED', 'DELETED'],
						},
						avatar: {
							type: 'string',
							nullable: true,
							description: 'Base64 encoded data URL for the user avatar image.',
						},
						followedworkflow: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									workflow: { $ref: '#/components/schemas/ObjectId' },
									workflowinstance: { $ref: '#/components/schemas/ObjectId' },
								},
							},
						},
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				LoginResponse: {
					type: 'object',
					properties: {
						user: {
							type: 'object',
							properties: {
								name: { type: 'string', example: 'Ada Lovelace' },
								avatar: { type: 'string', nullable: true },
							},
						},
						token: {
							type: 'string',
							description: 'JWT bearer token. Expires in 7 days.',
						},
					},
				},
				Workflow: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string', maxLength: 120 },
						description: { type: 'string', maxLength: 4000 },
						location: { type: 'string', nullable: true, maxLength: 160 },
						access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
						owner: { $ref: '#/components/schemas/ObjectId' },
						source_workflow: {
							allOf: [{ $ref: '#/components/schemas/ObjectId' }],
							nullable: true,
							description: 'Set when this workflow was copied from another template.',
						},
						deleted: { type: 'boolean', default: false },
						tasks: {
							type: 'array',
							items: {
								type: 'object',
								properties: { task: { $ref: '#/components/schemas/ObjectId' } },
							},
						},
						voting: {
							type: 'object',
							properties: {
								up_vote: {
									type: 'array',
									items: {
										type: 'object',
										properties: { voter: { $ref: '#/components/schemas/ObjectId' } },
									},
								},
								down_vote: {
									type: 'array',
									items: {
										type: 'object',
										properties: { voter: { $ref: '#/components/schemas/ObjectId' } },
									},
								},
							},
						},
						followers: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									follower: { $ref: '#/components/schemas/ObjectId' },
									completed: { type: 'boolean' },
								},
							},
						},
						comments: {
							type: 'array',
							items: {
								type: 'object',
								properties: { comment: { $ref: '#/components/schemas/ObjectId' } },
							},
						},
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				WorkflowInstance: {
					type: 'object',
					description: 'A users personal copy of a followed workflow with progress state.',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						description: { type: 'string' },
						location: { type: 'string', nullable: true },
						owner: { $ref: '#/components/schemas/ObjectId' },
						current_step: { type: 'integer', minimum: 1 },
						completed: { type: 'boolean' },
						tasks: {
							type: 'array',
							items: {
								type: 'object',
								properties: { task: { $ref: '#/components/schemas/ObjectId' } },
							},
						},
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				Task: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string', maxLength: 120 },
						description: { type: 'string' },
						step_no: { type: 'integer', minimum: 1 },
						days_required: { type: 'number', minimum: 0 },
						workflow: { $ref: '#/components/schemas/ObjectId' },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				TaskInstance: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						description: { type: 'string' },
						step_no: { type: 'integer', minimum: 1 },
						days_required: { type: 'number' },
						workflow_instance: { $ref: '#/components/schemas/ObjectId' },
						owner: { $ref: '#/components/schemas/ObjectId' },
						status: {
							type: 'string',
							enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
						},
						notification: { type: 'boolean' },
						timeFrame: {
							type: 'object',
							properties: {
								timelog: {
									type: 'object',
									properties: {
										start_time: { type: 'string', format: 'date-time', nullable: true },
										end_time: { type: 'string', format: 'date-time', nullable: true },
									},
								},
							},
						},
					},
				},
				WorkflowSummary: {
					type: 'object',
					description: 'Compact representation of a workflow used by listings, search results, and the popular feed.',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						description: { type: 'string' },
						location: { type: 'string', nullable: true },
						access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
						owner: {
							type: 'object',
							nullable: true,
							properties: {
								_id: { $ref: '#/components/schemas/ObjectId' },
								name: { type: 'string' },
							},
						},
						upvotes: { type: 'integer', minimum: 0 },
						downvotes: { type: 'integer', minimum: 0 },
						followers: { type: 'integer', minimum: 0 },
						tasks: { type: 'integer', minimum: 0 },
						isDeleted: { type: 'boolean' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				FollowedWorkflowSummary: {
					type: 'object',
					properties: {
						workflow_instance: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						percentage: {
							type: 'integer',
							minimum: 0,
							maximum: 100,
							description: 'Completion percentage based on completed tasks divided by total tasks.',
						},
						tasks: { type: 'integer', description: 'Total task count for the source workflow.' },
					},
				},
				CreatedWorkflowSummary: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						up_votes: { type: 'integer', minimum: 0 },
						down_votes: { type: 'integer', minimum: 0 },
						followers: { type: 'integer', minimum: 0 },
						is_copy: { type: 'boolean' },
					},
				},
				WorkflowDetailView: {
					type: 'object',
					description: 'Public detail payload returned by GET /workflow/{_id}/view.',
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						tasks: {
							type: 'array',
							items: { $ref: '#/components/schemas/Task' },
						},
						owner: {
							type: 'string',
							description: 'JWT signed user identifier of the workflow owner. Use it with /match/{token1}/{token2} or /workflow/{_id}/comments for downstream calls.',
						},
						up_votes: { type: 'integer' },
						down_votes: { type: 'integer' },
						followers: { type: 'integer' },
					},
				},
				WorkflowTasksList: {
					type: 'object',
					description: 'Owner facing payload returned by GET /workflow/{_id}/tasks/all.',
					properties: {
						name: { type: 'string' },
						description: { type: 'string' },
						access: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
						location: { type: 'string', nullable: true },
						tasks: {
							type: 'array',
							items: { $ref: '#/components/schemas/Task' },
						},
					},
				},
				VotingHistoryEntry: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						name: { type: 'string' },
						vote: { type: 'string', enum: ['UP_VOTE', 'DOWN_VOTE'] },
					},
				},
				Comment: {
					type: 'object',
					properties: {
						_id: { $ref: '#/components/schemas/ObjectId' },
						comment: { type: 'string', maxLength: 2000 },
						comment_type: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
						workflow: { $ref: '#/components/schemas/ObjectId' },
						commenter: {
							oneOf: [
								{ $ref: '#/components/schemas/ObjectId' },
								{
									type: 'object',
									properties: {
										_id: { $ref: '#/components/schemas/ObjectId' },
										name: { type: 'string' },
										avatar: { type: 'string', nullable: true },
									},
								},
							],
							description: 'Returned as an ObjectId on creation and as a populated `{ _id, name, avatar }` object when listed.',
						},
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				HealthResponse: {
					type: 'object',
					properties: {
						status: { type: 'string', example: 'ok' },
						timestamp: { type: 'string', format: 'date-time' },
						uptime: {
							type: 'number',
							description: 'Process uptime in seconds.',
							example: 1234.56,
						},
					},
				},
				MatchResponse: {
					type: 'object',
					properties: {
						matched_user: { type: 'boolean' },
					},
				},
			},
			responses: {
				Unauthorized: {
					description: 'Missing or invalid bearer token.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
							example: { error: 'Please authenticate' },
						},
					},
				},
				Forbidden: {
					description: 'Authenticated, but the action is not allowed for this user or in this state.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
						},
					},
				},
				NotFound: {
					description: 'The requested resource does not exist.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
						},
					},
				},
				ValidationError: {
					description: 'Request body or parameters failed validation.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
						},
					},
				},
				RateLimited: {
					description: 'Too many requests. The auth limiter allows 20 requests per 15 minutes; the comment limiter allows 30 per 10 minutes per IP.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
							example: { error: 'Too many requests, please try again later' },
						},
					},
				},
				ServerError: {
					description: 'Unexpected server error.',
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/Error' },
						},
					},
				},
			},
		},
	},
	apis: ['./src/routers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
