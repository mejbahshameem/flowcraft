# FlowCraft

A collaborative platform for creating, sharing, and executing step by step workflows. Users can design multi step workflow templates, share them with the community, follow workflows created by others, and track their progress through sequential task completion.

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
| Frontend | HTML5, JavaScript, jQuery, Bootstrap 4 |
| Auth | JSON Web Tokens (JWT), bcrypt |
| Email | SendGrid |
| Scheduling | node schedule (cron jobs for deadline reminders) |
| Image Processing | Sharp |
| Testing | Jest, Supertest |

## Project Structure

`
flowcraft/
Backend/
    config/              # Environment configs (not tracked)
    src/
        db/              # MongoDB connection
        middleware/       # Auth and input sanitization
        models/          # Mongoose schemas
        routers/         # Express route handlers
        utility/         # Cron jobs, email, enums
    tests/               # Backend test suites
Frontend/
    css/                 # Stylesheets
    js/                  # Client side JavaScript
    tests/               # Frontend test suites
    *.html               # Page templates
README.md
`

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** (local instance or MongoDB Atlas)
- **SendGrid** API key (for email features)

### Backend Setup

1. Navigate to the Backend directory:
   `
   cd Backend
   `

2. Install dependencies:
   `
   npm install
   `

3. Create environment files by copying the examples:
   `
   cp config/dev.env.example config/dev.env
   cp config/test.env.example config/test.env
   `

4. Edit config/dev.env with your actual values:
   `
   PORT=3000
   MONGODB_URL=mongodb://127.0.0.1:27017/flowcraft-dev
   JWT_SECRET=<your_secret>
   SendGrid_API_Key=<your_sendgrid_key>
   SENDER_EMAIL=<your_verified_sender>
   FRONTEND_URL=http://localhost:8080/
   `
   Use a different MONGODB_URL database name for 	est.env.

5. Start the development server:
   `
   npm run dev
   `

### Frontend Setup

1. Install a static file server:
   `
   npm install http-server -g
   `

2. Navigate to the Frontend directory:
   `
   cd Frontend
   `

3. Start the server:
   `
   http-server
   `

4. Open http://localhost:8080 in your browser.

5. To point the frontend to a different backend URL, edit the getHostUrl() function in Frontend/js/dependency.js.

### Running Tests

**Backend tests** (73 automated test cases across 4 suites):
`
cd Backend
npm run test
`

Make sure config/test.env is configured with a valid SendGrid API key and a separate test database URL.

**Frontend tests:**
`
cd Frontend
npm test
`

## API Overview

| Resource | Endpoints |
|----------|-----------|
| Users | Registration, login, logout, profile update, avatar upload, password reset, account activation/deactivation |
| Workflows | Create, edit, delete, copy, follow/unfollow, vote, search |
| Tasks | Create, edit, delete within workflows |
| Task Control | Start/end tasks, toggle notifications, progress tracking |
| Comments | Post and retrieve public/private comments |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
