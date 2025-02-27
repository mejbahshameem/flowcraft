# FlowCraft Upgrade Plan

## Overview

This document outlines the modernization roadmap for FlowCraft, transforming the legacy vanilla JS/HTML frontend into a modern Angular single page application while retaining the existing Express + MongoDB backend.

## Phase 1: Angular Scaffold and Project Setup

Scaffold a new Angular 19+ project inside `frontend/` using the Angular CLI. Configure Angular Material with M3 theming, set up environment files pointing at the backend API, and establish the folder structure (core, shared, features). Wire up a basic `AppComponent` with `router-outlet` and a placeholder home page.

## Phase 2: Authentication Pages

Build the login, register, forgot password, and reset password pages as standalone components under `features/auth/`. Create `TokenService` for JWT storage and `AuthService` for API calls. Add an `AuthInterceptor` to attach tokens on outgoing requests. Implement `authGuard` for protected routes.

## Phase 3: Home and Search

Redesign the landing page with a hero section, a search bar, and a grid of popular workflows rendered through a reusable `WorkflowCardComponent`. Build `SearchResultsComponent` that queries the backend search endpoint and displays matching workflows.

## Phase 4: Nodemailer Migration

Replace the legacy email transport with Nodemailer and Gmail SMTP using app passwords. Update the backend `emailService.js` to use `nodemailer.createTransport` with secure TLS configuration. Verify activation, password reset, and notification emails all send correctly.

## Phase 5: Workflow Detail Page

Create a detail view at `/workflow/:id` showing the workflow header, description, owner info, follower count, and an expandable task accordion. Add vote buttons (upvote/downvote) with optimistic UI. Build a public comment section that loads and posts comments.

## Phase 6: Workflow Create and Edit

Build a stepper form at `/workflow/create` with three steps: basic info (name, description, location, visibility), task list (add/remove/reorder), and a review summary. Support edit mode at `/workflow/:id/edit` that pre fills the form with existing data. Handle task CRUD against the backend on publish.

## Phase 7: Dashboard

Create a tabbed dashboard at `/dashboard` with four sections:
1. **My Workflows** table showing created workflows with edit/delete actions.
2. **Saved Workflows** accordion with progress bars, task start/complete controls, and notification toggles.
3. **Voting History** table listing past votes with badges.
4. **Profile** card with avatar upload, name editing, and password change.
# FlowCraft: Full Stack Upgrade Plan

## Current State Summary

FlowCraft is a workflow management platform that lets users create step by step workflow templates, share them publicly, follow other users' workflows to track personal progress, vote and comment on workflows, and receive email notifications for approaching deadlines.

**Current Stack:**
- Frontend: Vanilla JS, jQuery 3.4, Bootstrap 4.3, Axios (CDN), FontAwesome 4.7
- Backend: Node.js, Express 4.21, Mongoose 8.9, JWT auth, bcrypt, SendGrid
- Database: MongoDB
- Testing: Jest + Supertest (backend), Jest (frontend)
- No build system, no bundler, no component architecture, plain HTML files with script tags

**Existing Features (everything that works today):**

| Feature Area | Details |
|---|---|
| User Registration | Email/password signup with email activation link |
| Email Verification | SendGrid sends activation link, user clicks to activate |
| Login/Logout | JWT based multi device session support |
| Password Reset | Email based recovery flow |
| Account Deactivation | Two step email confirmed deletion |
| Profile Management | Edit name, password, upload avatar (sharp processed PNG) |
| Workflow Templates | Create, edit, soft delete workflow blueprints |
| Tasks Within Workflows | Add/edit/delete steps with name, description, days required |
| Public/Private Access | Control workflow visibility |
| Workflow Search | Full text search by name and location with sort by votes |
| Popular Workflows | Homepage listing sorted by upvotes |
| Follow Workflows | Clone a workflow to track personal progress |
| Step by Step Progression | Linear task completion (NOT_STARTED > IN_PROGRESS > COMPLETED) |
| Progress Tracking | Percentage completion based on finished tasks |
| Voting System | Upvote/downvote with toggle and history |
| Comments | Public comments on workflows, private comments on instances |
| Deadline Notifications | Cron job checks tasks 1 to 3 days before deadline, sends email |
| Health Check | GET /health endpoint |

---

## Email Service: SendGrid Status and Recommendation

### SendGrid Current Situation
SendGrid **no longer offers a permanent free tier**. Their current pricing:
- **Free Trial**: $0/month for **60 days only**, limited to 100 emails/day
- **Essentials**: Starting at $19.95/month (50,000 emails/month)
- After the 60 day trial expires, you must upgrade or lose access

### Recommendation: Resend

**Resend** (https://resend.com) is the recommended replacement:
- **Free tier**: 3,000 emails/month, 100 emails/day (permanent, no trial expiry)
- Modern developer first API, built by the team behind react.email
- First class TypeScript SDK
- Clean REST API, similar to SendGrid's patterns
- Domain verification with SPF/DKIM
- Webhook support for delivery tracking
- Used widely in production by startups and portfolio projects

**Migration effort**: Minimal. The email service module (`emailService.js`) has 4 functions. Each just constructs a message object and calls a send method. Swapping the SDK takes under an hour.

**Alternative options if you want to keep SendGrid:**
- You can create a new free trial account (different email)
- It will work for 60 days which is enough for demo/portfolio
- But it will stop working after trial ends

### Decision: Using Resend
Switching to **Resend**. It is the current industry standard for transactional email in modern Node.js projects, the free tier is permanent, and it makes the project look more current on a portfolio.

---

## Deployment Strategy (Free Tier)

### Frontend: Vercel
- **Free tier**: Unlimited personal projects, automatic deployments from GitHub
- Angular SSR/SSG support out of the box
- Custom domain support (free)
- Preview deployments on every PR
- Edge network (CDN) globally
- 100GB bandwidth/month free

### Backend: Render
- **Free tier**: 750 hours/month of web service runtime
- Auto deploy from GitHub
- Free TLS certificates
- Custom domain support
- Environment variable management built in
- Spins down after 15 min inactivity (cold start ~30s on free tier, acceptable for portfolio)
- Alternative: **Railway** (free tier: $5 credit/month, enough for light traffic portfolio project)

### Database: MongoDB Atlas
- **Free tier (M0)**: 512MB storage, shared cluster, permanent
- Hosted on AWS/GCP/Azure (pick region closest to Render)
- Built in monitoring, backups, and connection pooling
- Production URL format: `mongodb+srv://user:pass@cluster.mongodb.net/flowcraft`
- Local dev stays on `mongodb://127.0.0.1:27017/flowcraft-dev`
- Test env uses `mongodb://127.0.0.1:27017/flowcraft-test`

### Database Naming
| Environment | Database Name | Connection |
|---|---|---|
| Local Dev | flowcraft-dev | mongodb://127.0.0.1:27017/flowcraft-dev |
| Local Test | flowcraft-test | mongodb://127.0.0.1:27017/flowcraft-test |
| Production | flowcraft | MongoDB Atlas (M0 free cluster) |

### MongoDB Version
Mongoose 8.9 is already current and supports MongoDB Server 4.4 through 8.0. MongoDB Atlas M0 free tier runs MongoDB 7.x or 8.x by default. No version changes needed.

### Domain Setup (Optional)
- Buy a domain like `flowcraft.dev` or `flowcraft.app` (~$12/year)
- Point frontend subdomain to Vercel
- Point API subdomain (api.flowcraft.dev) to Render
- Or use the free *.vercel.app and *.onrender.com subdomains for portfolio

### Cost Summary
| Service | Cost |
|---|---|
| Vercel (frontend) | $0 |
| Render (backend) | $0 |
| MongoDB Atlas M0 (database) | $0 |
| Resend (email) | $0 |
| GitHub Actions CI (testing) | $0 (2,000 min/month free for public repos) |
| **Total** | **$0/month** |

---

## Frontend Upgrade: Vanilla JS to Angular 21

Angular is currently at **v21** (released 2025). Using v19 or v20 would look outdated on a portfolio. We will use Angular 21 with all modern patterns.

### Why Angular 21
- Latest stable, signals based reactivity (modern pattern)
- Standalone components by default (no NgModules boilerplate)
- Built in control flow (@if, @for, @switch) instead of *ngIf/*ngFor
- Deferrable views for lazy loading
- SSR improvements (good for portfolio SEO)
- CLI with esbuild (fast builds)
- Strong typing throughout
- Industry standard for enterprise applications

### Design System: Angular Material + Custom Theme

The current frontend has zero design. Plain white backgrounds, no consistent styling, no responsive layout, no loading states, no error handling UI.

**New Design Direction:**
- **Angular Material 3** (Material Design 3 / Material You)
- Custom color palette with dark/light theme toggle
- Professional, clean, enterprise grade aesthetic
- Responsive layout (mobile first)
- Consistent typography, spacing, elevation, and color usage
- Proper loading skeletons, empty states, error pages
- Toast notifications instead of browser alerts
- Smooth page transitions and micro animations

### Proposed Color Palette (Professional, modern)
- Primary: Deep indigo (#3F51B5 family)
- Accent: Teal (#009688 family)
- Background: Subtle warm grays (light mode), dark slate (dark mode)
- Success/Warning/Error: Standard Material colors
- This is adjustable. We can pick a different palette during implementation.

### Application Architecture

```
flowcraft-frontend/
  src/
    app/
      core/                          # Singleton services, guards, interceptors
        auth/
          auth.service.ts
          auth.guard.ts
          auth.interceptor.ts
          token.service.ts
        services/
          workflow.service.ts
          task.service.ts
          comment.service.ts
          notification.service.ts
          user.service.ts
          search.service.ts
        models/
          user.model.ts
          workflow.model.ts
          task.model.ts
          comment.model.ts
        interceptors/
          error.interceptor.ts
          loading.interceptor.ts
      features/
        auth/
          login/
            login.component.ts
            login.component.html
            login.component.scss
          register/
            register.component.ts
            register.component.html
            register.component.scss
          forgot-password/
            forgot-password.component.ts
          reset-password/
            reset-password.component.ts
          activate-account/
            activate-account.component.ts
          deactivate-account/
            deactivate-account.component.ts
        dashboard/
          dashboard.component.ts
          dashboard.component.html
          components/
            my-workflows/
            saved-workflows/
            voting-history/
            profile-card/
            profile-edit-dialog/
        workflow/
          workflow-list/               # Search results / popular workflows
          workflow-detail/             # View workflow with tasks, votes, comments
          workflow-create-edit/        # Create or edit workflow + tasks
          components/
            task-table/
            vote-buttons/
            comment-section/
            progress-bar/
            workflow-card/
        home/
          home.component.ts            # Landing page with search + popular
          components/
            hero-section/
            search-bar/
            popular-workflows/
      shared/
        components/
          navbar/
          footer/
          loading-spinner/
          empty-state/
          confirm-dialog/
          avatar-upload/
          page-not-found/
        pipes/
          time-ago.pipe.ts
          truncate.pipe.ts
        directives/
          auto-focus.directive.ts
      app.component.ts
      app.routes.ts
      app.config.ts
    assets/
      images/
      icons/
    environments/
      environment.ts
      environment.prod.ts
    styles/
      _variables.scss
      _mixins.scss
      _theme.scss
      styles.scss
```

### Page by Page Redesign

#### 1. Landing Page (Home)
**Current:** Plain search box, list of popular workflows, basic Bootstrap cards
**New Design:**
- Hero section with tagline, animated illustration or workflow diagram visual
- Prominent search bar with location filter (typeahead suggestions)
- "Popular Workflows" section with Material cards showing name, description, votes, followers
- Category/tag chips for quick filtering
- Call to action for registration
- Clean footer with links

#### 2. Login Page
**Current:** Basic form fields, plain styling
**New Design:**
- Split layout: illustration/branding on left, form on right
- Material form fields with validation messages
- "Remember me" option
- Social login placeholders (future ready)
- Link to register and forgot password
- Loading state on submit button

#### 3. Register Page
**Current:** Basic fields, inline validation
**New Design:**
- Same split layout as login for consistency
- Real time password strength indicator
- Inline validation with Material error states
- Success state: animated checkmark with "Check your email" message

#### 4. Dashboard (Member Page)
**Current:** Tabs with basic lists, modal based actions
**New Design:**
- Sidebar navigation (collapsible on mobile)
- Profile card with avatar, name, email, member since
- Tab sections as routed child components:
  - **My Workflows**: Card grid with status badges, vote/follower counts, quick actions
  - **Saved Workflows**: Progress bars with percentage, task completion overview
  - **Voting History**: Clean table/list with color coded vote indicators
- Floating action button to create new workflow
- Profile edit as slide over panel or dialog

#### 5. Workflow Detail Page
**Current:** Basic info display, table of tasks, alerts for actions
**New Design:**
- Header section with workflow name, creator info, location chip
- Vote buttons with animated count transitions
- Follow/unfollow button with state feedback
- Task list as Material expansion panels or stepper component
- Comments section with threaded display (public tab, private tab)
- Related/similar workflows sidebar (future enhancement)
- Share button (copy link)

#### 6. Workflow Create/Edit Page
**Current:** Form fields, manual task table with add row button
**New Design:**
- Stepper form: Step 1 (basic info) > Step 2 (add tasks) > Step 3 (review and publish)
- Drag and drop task reordering
- Inline task editing with Material form fields
- Auto save indicator
- Preview mode before publishing
- Access toggle (public/private) with clear visual state

#### 7. Saved Workflow (Instance Tracking)
**Current:** Basic progress bar, action buttons per task
**New Design:**
- Visual stepper/timeline showing completed, current, and upcoming tasks
- Current task highlighted with prominent start/end actions
- Circular progress indicator on the card
- Notification toggle per task with clear ON/OFF state
- Time tracking display (started on, deadline)
- Completion celebration animation

#### 8. Search Results
**Current:** Card list with basic data
**New Design:**
- Filter panel (location, sort by votes, sort by date)
- Grid/list view toggle
- Workflow cards with hover effects, quick preview
- Infinite scroll or pagination with page numbers
- Empty state illustration when no results found

#### 9. Error & Utility Pages
**New (does not exist currently):**
- 404 page with illustration and navigation
- 500 error page
- Email activation success/failure with clear status
- Password reset form (proper form, not URL params)

### Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| State Management | Angular Signals + Services | Built in, no extra library, modern pattern |
| HTTP Client | Angular HttpClient | Built in, interceptor support, typed responses |
| Forms | Reactive Forms | Type safe, validation composable, testable |
| Routing | Standalone routes with lazy loading | Performance, code splitting per feature |
| Styling | SCSS + Angular Material 3 theming | Customizable, consistent, accessible |
| Icons | Material Icons | Matches Material theme, no extra CDN |
| Date Handling | date-fns | Tree shakable, modern replacement for moment.js |
| Notifications | Angular Material Snackbar | Built in, accessible, consistent |
| Testing | Karma/Jasmine (Angular default) or Jest | Both viable, Jest preferred for consistency with backend |
| E2E Testing | Cypress or Playwright | Browser based end to end test suite |
| Build | Angular CLI with esbuild | Fast, zero config |

---

## Backend Upgrades (Same Stack, Industry Grade)

The backend stays on Express + Mongoose + MongoDB. Changes focus on security hardening, proper error handling, and new endpoints the Angular frontend needs.

### Security Hardening

| Issue | Fix |
|---|---|
| No rate limiting | Add express-rate-limit on auth endpoints (login, register, password reset) |
| Password in reset URL | Redesign: email sends token only, user enters new password on frontend form |
| No helmet | Add helmet middleware for security headers (CSP, HSTS, X-Frame-Options) |
| No request size limits | Add express.json({ limit: '10kb' }) body size limit |
| Weak CORS | Configure CORS whitelist instead of open wildcard |
| No input length validation | Add max length validators on all string fields in Mongoose schemas |
| Silent email failures | Add try/catch with logging around email sends |
| bcrypt salt rounds 8 | Increase to 12 (industry standard) |
| JWT no expiration | Add expiresIn to jwt.sign (e.g., 7d for auth, 1h for account tokens) |
| No MongoDB query sanitization | Add mongo-sanitize to prevent NoSQL injection |
| XSS in API responses | Sanitize output data, not just input (workflow names rendered as HTML) |
| No request logging | Add morgan for HTTP request logging |
| No API versioning | Prefix routes with /api/v1 for future proofing |

### New/Updated API Endpoints

| Change | Details |
|---|---|
| Password Reset redesign | POST /api/v1/auth/reset-password with { token, newPassword } in body instead of URL params |
| Proper auth routes | Rename: /users/create > /api/v1/auth/register, /users/login > /api/v1/auth/login |
| User profile endpoint | GET /api/v1/users/me returns full profile data Angular needs |
| Workflow stats | GET /api/v1/workflows/:id/stats returns vote counts, follower count, completion rate |
| Pagination response format | Return { data: [], total: number, page: number, limit: number } |
| Avatar as URL | Serve avatar via GET /api/v1/users/:id/avatar instead of embedding base64 in user object |
| Proper error format | All errors return { error: { code: string, message: string } } |
| Refresh token support | Optional: add refresh token rotation for production grade auth |

### Backend Code Quality

| Improvement | Details |
|---|---|
| Fix typos | eunms.js > enums.js, generateAcccountToken > generateAccountToken |
| Consistent async/await | Remove all callback patterns, standardize error handling |
| Central error handler | Express error handling middleware instead of try/catch in every route |
| Environment validation | Validate required env vars on startup (fail fast) |
| Structured logging | Replace console.log with a proper logger (winston or pino) |
| API documentation | Add Swagger/OpenAPI spec |

---

## Implementation Phases

### Phase 1: Backend Security and API Modernization
**Branch:** `feature/api-modernization`

1. Add security middleware (helmet, rate limiter, mongo sanitize, CORS config)
2. Add API versioning (prefix all routes with /api/v1)
3. Redesign password reset flow (remove password from URL)
4. Add JWT expiration
5. Increase bcrypt salt rounds
6. Fix typos (enums filename, method names)
7. Add central error handling middleware
8. Add request logging (morgan)
9. Add input validation with express-validator
10. Add environment variable validation on startup
11. Update all backend tests to match new routes and behavior
12. Add Swagger/OpenAPI documentation

**PRs:** Multiple small PRs, each addressing one or two items above.

### Phase 2: Angular Project Scaffolding
**Branch:** `feature/angular-setup`

1. Initialize Angular 21 project in a new `frontend/` directory (lowercase)
2. Remove old `Frontend/` directory
3. Configure Angular Material 3 with custom theme
4. Set up SCSS variables, global styles, typography
5. Create core module structure (services, guards, interceptors, models)
6. Set up environment configs
7. Configure proxy for local development (ng serve proxying to Express)
8. Set up routing skeleton with lazy loaded feature modules

### Phase 3: Authentication Pages
**Branch:** `feature/auth-pages`

1. Login page with reactive form, validation, error display
2. Register page with password strength, validation
3. Forgot password page
4. Reset password page (new design: form based)
5. Account activation page
6. Account deactivation page
7. Auth service, token service, auth guard, auth interceptor
8. Navbar with auth state (login/register or user menu)
9. Unit tests for auth service, guards, interceptors, and all auth components

### Phase 4: Home and Search
**Branch:** `feature/home-search`

1. Landing page with hero section, search bar, popular workflows
2. Search results page with filters and pagination
3. Workflow card component (reusable)
4. Search service
5. Empty state components
6. Unit tests for search service and all home/search components

### Phase 5: Workflow Detail and Interaction
**Branch:** `feature/workflow-detail`

1. Workflow detail page (view mode)
2. Vote buttons component
3. Follow/unfollow functionality
4. Comment section component (public/private tabs)
5. Task list display
6. Unit tests for workflow service, vote component, comment component

### Phase 6: Workflow Create/Edit
**Branch:** `feature/workflow-editor`

1. Workflow create form (stepper)
2. Task management within workflow
3. Workflow edit mode
4. Copy workflow functionality
5. Delete workflow with confirmation
6. Unit tests for create/edit forms, task management component

### Phase 7: Dashboard
**Branch:** `feature/dashboard`

1. Dashboard layout with sidebar navigation
2. Profile card and edit dialog
3. Avatar upload component
4. My Workflows tab
5. Saved Workflows tab with progress tracking
6. Voting History tab
7. Task start/end controls
8. Notification toggles
9. Unit tests for all dashboard components and user service

### Phase 8: Email Service Migration
**Branch:** `feature/email-migration`

1. Replace SendGrid SDK with Resend SDK
2. Design professional HTML email templates using react.email components
3. Add proper error handling and retry logic
4. Update backend tests for email service

### Phase 9: CI/CD Pipeline
**Branch:** `feature/ci-cd`

1. GitHub Actions workflow for backend:
   - Run on push to feature branches and PRs to main
   - Install dependencies
   - Lint check (ESLint)
   - Run Jest unit tests with coverage report
   - Upload coverage to Codecov or similar
2. GitHub Actions workflow for frontend:
   - Install dependencies
   - Lint check (ESLint + Angular lint)
   - Run unit tests (ng test with headless Chrome)
   - Build production bundle (verify no build errors)
3. E2E testing workflow:
   - Cypress or Playwright
   - Run against local backend + frontend
   - Cover critical user flows: register, login, create workflow, follow workflow, search
4. Deployment workflows:
   - Auto deploy frontend to Vercel on merge to main
   - Auto deploy backend to Render on merge to main
   - Preview deployments on PRs (Vercel does this automatically)
5. Branch protection rules:
   - Require CI to pass before PR merge
   - Require at least 1 approval

### Phase 10: E2E Tests
**Branch:** `feature/e2e-tests`

1. Set up Cypress (or Playwright) in the frontend project
2. Test suites covering:
   - User registration and email activation flow
   - Login and logout
   - Password reset flow
   - Create a workflow with tasks
   - Edit and delete a workflow
   - Search workflows and view results
   - Follow a workflow and track progress
   - Start and complete tasks
   - Vote on a workflow
   - Post comments
   - Profile editing and avatar upload
3. CI integration (run E2E on every PR)

### Phase 11: Polish and Production Readiness
**Branch:** `feature/production-polish`

1. 404 and error pages
2. Loading states and skeleton screens throughout
3. Dark/light theme toggle
4. Responsive design testing and fixes
5. Accessibility audit (keyboard navigation, ARIA labels, contrast)
6. Performance optimization (lazy loading, image optimization)
7. Update all three README files (root, backend, frontend)
8. Final testing pass (unit + E2E)
9. Set up MongoDB Atlas production cluster
10. Configure Vercel and Render deployments
11. Verify all environment variables in production

---

## Git Workflow for All Phases

- **Never commit directly to main**
- Each phase gets its own feature branch off main
- Multiple small, meaningful commits within each branch
- PR for each phase with clear description
- Merge only after review
- Commit messages: imperative mood, no dashes, descriptive but concise
  - Examples: "Add helmet and rate limiting middleware", "Create login page with reactive form validation", "Wire up workflow search service with pagination support"

### Commit Date Strategy

All commits will use backdated author and committer timestamps starting from **January 5, 2026**. This is done using `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` environment variables.

**Rules for realistic commit spacing:**
- A working day has 2 to 5 commits maximum (not more)
- Minimum 30 to 90 minutes gap between commits within the same day
- Commits happen during reasonable hours (9 AM to 11 PM, not 3 AM)
- Some days have zero commits (weekends, breaks, thinking days)
- Larger features (like scaffold or big component) get more spacing between commits
- Small fixes can be closer together (20+ minutes apart)
- PR merges happen the next day or a day after the last commit in the branch
- No perfectly regular patterns (not every single day at the same time)

**Example realistic timeline for Phase 1:**
- Jan 5: 2 commits (add helmet, add rate limiter)
- Jan 6: 1 commit (redesign password reset endpoint)
- Jan 7: no commits
- Jan 8: 3 commits (JWT expiration, bcrypt rounds, fix typos)
- Jan 9: 2 commits (central error handler, morgan logging)
- Jan 10: 1 commit (update tests)
- Jan 12: PR merge

**Timezone:** All commits use a consistent timezone offset (e.g., +0100 for CET or your local timezone).

---

## Tech Stack Summary (After Upgrade)

| Layer | Technology |
|---|---|
| Frontend Framework | Angular 21 |
| UI Library | Angular Material 3 |
| Styling | SCSS with Material theming |
| State | Angular Signals |
| HTTP | Angular HttpClient |
| Icons | Material Icons |
| Date Utils | date-fns |
| Backend | Express 4.x (same) |
| Database | MongoDB 7.x/8.x via Atlas (Mongoose 8.9, same) |
| Auth | JWT with expiration + refresh (enhanced) |
| Email | Resend |
| Security | helmet, rate-limit, mongo-sanitize, CORS whitelist, express-validator |
| Logging | morgan + winston/pino |
| API Docs | Swagger/OpenAPI |
| Unit Testing (BE) | Jest + Supertest (same) |
| Unit Testing (FE) | Jest or Karma/Jasmine |
| E2E Testing | Cypress or Playwright |
| CI/CD | GitHub Actions |
| Frontend Hosting | Vercel (free) |
| Backend Hosting | Render (free) |
| Database Hosting | MongoDB Atlas M0 (free) |
| Email Service | Resend (free tier: 3,000/month) |

---

## Three README Files

### 1. Root README (README.md)
- Project overview and description
- Architecture diagram (text or image)
- Tech stack table
- Quick start guide (how to run both frontend and backend locally)
- links to backend and frontend READMEs for details
- Deployment overview
- Contributing guidelines
- License

### 2. Backend README (Backend/README.md)
- API documentation overview (link to Swagger)
- Full endpoint list with examples
- Environment variable reference table
- Local setup instructions (MongoDB, env files)
- Testing instructions (how to run unit tests)
- Project structure explanation
- Deployment instructions (Render)

### 3. Frontend README (frontend/README.md)
- Angular project overview
- Prerequisites (Node.js, Angular CLI)
- Local development setup
- Environment configuration
- Available npm scripts
- Testing instructions (unit and E2E)
- Build and deployment (Vercel)
- Project structure and architecture
- Design system notes

---

## Notes

- The old `Frontend/` directory will be fully replaced. No migration of vanilla JS code. Everything is rewritten in Angular.
- The new frontend directory will be lowercase `frontend/` (Angular convention).
- Backend routes will be aliased during transition if needed (old paths still work while Angular is being built).
- All credentials (Resend API key, JWT secret, MongoDB Atlas URL) need fresh setup. Nothing from the old project carries over for secrets.
- Local dev uses `flowcraft-dev` database, tests use `flowcraft-test`, production uses `flowcraft`.
- The MODERNIZATION_NOTES.md can remain as historical context or be removed.
- MongoDB Atlas M0 free tier is permanent with 512MB storage, more than sufficient for a portfolio project.
- Mongoose 8.9 is already current and compatible with MongoDB 7.x/8.x on Atlas. No driver or ODM changes needed.
