# FlowCraft

[![CI](https://github.com/mejbahshameem/flowcraft/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mejbahshameem/flowcraft/actions/workflows/ci.yml)

A collaborative platform for creating, sharing, and executing step by step workflows. Users can design multi step workflow templates, share them with the community, follow workflows created by others, and track their progress through sequential task completion.

**Live:** Frontend on Vercel — https://flowcraftio.vercel.app · Backend on Render — https://flowcraft-2s58.onrender.com

## Features

**Workflow Engine**
- Create reusable workflow templates with sequential tasks
- Each task has estimated duration and step ordering
- Strict step by step progression ensures nothing is skipped
- Copy and customize public workflows to fit your needs

**Collaboration**
- Public and private workflow visibility controls
- Community voting (upvote/downvote) on workflow quality
- Public comments on workflow templates
- Private notes on personal workflow instances

**Task Tracking**
- Follow any public workflow to create your own instance
- Start and complete tasks with time logging
- Visual progress tracking with completion percentages
- Deadline notifications via email (configurable per task)

**User System**
- Email based registration with account activation
- JWT based authentication supporting multiple sessions
- Profile management with avatar upload
- Password recovery via email

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express 4.21, Mongoose 8.9 |
| Database | MongoDB |
| Frontend | Angular 20, Angular Material 3, TypeScript 5.9, SCSS |
| Auth | JSON Web Tokens (JWT) with expiration, bcrypt (12 rounds) |
| Security | Helmet, CORS, rate limiting, mongo sanitize |
| Email | Nodemailer with Gmail SMTP |
| Scheduling | node schedule (cron jobs for deadline reminders) |
| Image Processing | Sharp |
| API Docs | Swagger / OpenAPI 3.0 at `/api/docs` |
| Testing | Jest, Supertest |

## Project Structure

```
flowcraft/
backend/
    config/              # Environment configs (not tracked)
    src/
        db/              # MongoDB connection
        middleware/       # Auth and input sanitization
        models/          # Mongoose schemas
        routers/         # Express route handlers
        utility/         # Cron jobs, email, enums
    tests/               # Backend test suites
frontend/
    src/
        app/
            core/        # Models, services, auth, interceptors
            features/    # Page components (auth, home, search)
            shared/      # Reusable components and validators
        environments/    # Environment configs
    proxy.conf.json      # Dev proxy to backend
README.md
```

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** (local instance or MongoDB Atlas)
- **Gmail** account with App Password (for email features)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create environment files by copying the examples:
   ```
   cp config/dev.env.example config/dev.env
   cp config/test.env.example config/test.env
   ```

4. Edit config/dev.env with your actual values:
   ```
   PORT=3000
   MONGODB_URL=mongodb://127.0.0.1:27017/flowcraft-dev
   JWT_SECRET=<your_secret>
   GMAIL_USER=<your_gmail@gmail.com>
   GMAIL_APP_PASSWORD=<your_gmail_app_password>
   FRONTEND_URL=http://localhost:4200/
   ```
   Use a different MONGODB_URL database name for test.env.

5. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the Angular development server with backend proxy:
   ```
   npx ng serve
   ```

4. Open http://localhost:4200 in your browser. API requests are proxied to the backend on port 3000.

### Running Tests

**Backend tests** (Jest + Supertest, 4 suites against a test MongoDB):
```
cd backend
npm run test       # local watch mode
npm run test:ci    # single run, used by GitHub Actions
```

Make sure config/test.env is configured with valid Gmail credentials and a separate test database URL.

**Frontend tests:**
```
cd frontend
npx ng test
```

## API Overview

All API endpoints are versioned under `/api/v1` (the health probe at `/health` is the only exception). The full interactive specification is rendered with Swagger UI at `/api/docs`, generated from JSDoc `@swagger` annotations in [`backend/src/routers/`](backend/src/routers/) and the shared components in [`backend/src/config/swagger.js`](backend/src/config/swagger.js).

| Resource | Endpoints |
|----------|-----------|
| Users | Registration, login, logout, profile update, avatar upload, password reset, account activation/deactivation |
| Workflows | Create, edit, delete, copy, follow/unfollow, vote, search |
| Tasks | Create, edit, delete within workflows |
| User Workflows | Start/end tasks, toggle notifications, progress tracking |
| Comments | Post and retrieve public/private comments |
| System | `GET /health` for liveness probes used by the container HEALTHCHECK and Render |

### Live API Documentation

| Environment | Swagger UI | Raw OpenAPI JSON |
|-------------|------------|------------------|
| Local | http://localhost:3000/api/docs | http://localhost:3000/api/docs.json |
| Production | https://flowcraft-2s58.onrender.com/api/docs | https://flowcraft-2s58.onrender.com/api/docs.json |

## Continuous Integration & Deployment

- **CI:** GitHub Actions runs on every push and pull request to `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — backend tests against a MongoDB 7 service container, plus a production frontend build. Status is reflected by the badge above and required-check rules can be enabled in branch protection.
- **Backend deploy:** Render auto-builds the backend Docker image from `backend/Dockerfile` on every push to `main`.
- **Frontend deploy:** Vercel auto-builds the Angular SPA from `frontend/` on every push to `main`. `frontend/vercel.json` rewrites `/api/*` to the Render backend so the SPA stays same-origin.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
