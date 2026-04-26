# FlowCraft Backend

REST API for the FlowCraft workflow management platform built with Express.js and MongoDB.

## Architecture

```
src/
├── app.js                  # Express app setup, middleware pipeline
├── index.js                # Server entry point with env validation
├── config/
│   └── swagger.js          # OpenAPI/Swagger configuration
├── db/
│   └── mongoose.js         # MongoDB connection
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── errorHandler.js     # Central error handling
│   ├── escape-html.js      # HTML entity encoding for inputs
│   └── rateLimiter.js      # Rate limiting for auth endpoints
├── models/
│   ├── user.js             # User schema with auth methods
│   ├── workflow.js          # Workflow template schema
│   ├── workflowinstance.js  # User specific workflow copy
│   ├── task.js             # Task within a workflow template
│   ├── taskinstance.js     # User specific task copy
│   ├── tasknotification.js # Scheduled email notifications
│   └── comment.js          # Workflow comments
├── routers/
│   ├── user.js             # Auth and user management routes
│   ├── workflow.js         # Workflow CRUD, search, voting
│   ├── task.js             # Task CRUD within workflows
│   ├── comment.js          # Comment endpoints
│   ├── userworkflowcontrol.js # Follow, progress, task execution
│   └── health.js           # Health check endpoint
└── utility/
    ├── emailService.js     # Nodemailer Gmail email functions
    ├── cronjobs.js         # Deadline notification scheduler
    ├── enums.js            # Shared constants
    └── validateEnv.js      # Environment variable validation
```

## Security

| Feature | Implementation |
|---------|---------------|
| Helmet | HTTP security headers with a strict Content Security Policy (data and blob image sources allowed for avatars) |
| CORS | Allowlist based origin control via `CORS_ORIGIN` env var |
| Rate Limiting | 20 requests per 15 minutes on auth endpoints, 30 comments per 10 minutes per IP |
| Mongo Sanitize | Prevents NoSQL injection by stripping `$` operators from input |
| Body Size Limit | 10KB max JSON payload to prevent DoS |
| Password Hashing | bcrypt with 12 salt rounds |
| JWT Expiration | Auth tokens expire in 7 days, account tokens in 24 hours |
| Central Error Handler | Consistent JSON error responses, no stack traces in production |
| Input Sanitization | HTML entity encoding on user submitted content |

## API Endpoints

All routes are prefixed with `/api/v1`. Full interactive documentation available at `/api/docs`.

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /users/create | No | Register new account |
| POST | /users/login | No | Authenticate and get token. Returns 403 with `code: "NOT_ACTIVATED"` when the account is pending activation |
| POST | /users/activation/resend | No | Resend the activation email for an inactive account |
| POST | /users/logout | Yes | Logout current session |
| POST | /users/logoutAll/:token | No | Logout all sessions |
| GET | /user/:token | No | Activate account by token |
| GET | /users/me | Yes | Get current authenticated user profile |
| PATCH | /users/me | Yes | Update profile |
| POST | /users/me/avatar | Yes | Upload avatar (jpg, jpeg, png) |
| POST | /users/deactivate/:token | Yes | Request account deactivation |
| POST | /deactivate/:token | No | Confirm deactivation |
| POST | /user/account/forget/password | No | Request password reset |
| POST | /user/account/reset/password | No | Set new password with token |
| GET | /match/:token1/:token2 | No | Check if tokens belong to same user |

### Workflows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /workflow/create | Yes | Create workflow |
| POST | /workflow/:id/copy | Yes | Copy workflow into the caller's account as a private draft |
| PATCH | /workflow/:id/edit | Yes | Edit workflow info |
| DELETE | /workflow/:id/delete | Yes | Soft delete workflow |
| POST | /workflow/:id/follow | Yes | Follow a workflow |
| GET | /workflow-instance/:id/unfollow | Yes | Unfollow a workflow |
| POST | /workflow/:id/vote | Yes | Vote on a workflow. Body: `{ vote: "UP_VOTE"\|"DOWN_VOTE" }` |
| DELETE | /workflow/:id/vote | Yes | Clear the current user's vote on a workflow |
| GET | /workflow/:id/view | No | View workflow details |
| GET | /workflows/popular | No | Top 10 by upvotes |
| GET | /search | No | Full text search. Query params: `interest`, `location`, `sortBy=createdAt\|up_vote`, `limit` (default 20, max 50), `skip` (default 0) |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /workflow/tasks/create | Yes | Add task to workflow |
| GET | /workflow/:id/tasks/all | Yes | List tasks in workflow |
| PATCH | /workflow/:wfid/tasks/:tkid | Yes | Edit task |
| DELETE | /workflow/:wfid/tasks/:tkid | Yes | Remove task |

### Task Control (Followed Workflows)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users/me/workflowinstance/following/all | Yes | List followed workflows with progress |
| GET | /user/me/created-workflows/all | Yes | List owned workflows |
| GET | /following/workflow/:id/tasks/all | Yes | Tasks in followed workflow |
| POST | /following/workflow/:wfid/task/:tkid/start | Yes | Start a task |
| POST | /following/workflow/:wfid/task/:tkid/end | Yes | Complete a task |
| POST | /following/workflow/:wfid/task/:tkid/notify | Yes | Toggle deadline notification |
| GET | /user/voting/history | Yes | Voting history |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /comment/post | Yes | Post comment. Body: `{ comment, workflow, comment_type: "PUBLIC"\|"PRIVATE" }` |
| GET | /workflow/:id/comments/:type/all/:token? | No | Get comments by type |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | Yes | Server port (default: 3000) |
| MONGODB_URL | Yes | MongoDB connection string |
| JWT_SECRET | Yes | Secret key for signing JWT tokens |
| GMAIL_USER | Yes | Gmail address for sending emails |
| GMAIL_APP_PASSWORD | Yes | Gmail App Password for SMTP auth |
| FRONTEND_URL | Yes | Frontend URL for email links |
| CORS_ORIGIN | No | Comma separated allowed origins |

## Running

```bash
npm install
npm run dev      # Development with nodemon
npm run test     # Local watch-mode tests against config/test.env
npm run test:ci  # Single-pass run used by GitHub Actions
```

## Docker

A production-ready multi-stage Docker image is provided. Build and run:

```bash
docker build -t flowcraft-api .
docker run --rm -p 3000:3000 \
  -e MONGODB_URL=... \
  -e JWT_SECRET=... \
  -e GMAIL_USER=... \
  -e GMAIL_APP_PASSWORD=... \
  -e FRONTEND_URL=... \
  flowcraft-api
```

The image runs as a non-root user under `tini`, exposes a `HEALTHCHECK` against `/health`, and is the same artifact deployed to Render.

## Testing

73 automated tests across 4 test suites:

| Suite | Tests | Covers |
|-------|-------|--------|
| user.test.js | 19 | Registration, login, activation, profile, password reset |
| workflow.test.js | 19 | Workflow CRUD, tasks, copy, voting history |
| controlworkflow.test.js | 22 | Follow, unfollow, task execution, notifications, search |
| Comment-Utility.test.js | 13 | Comments, cron jobs, public/private access control |
