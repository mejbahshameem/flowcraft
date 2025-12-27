# Phase 1 Explanation: Angular Scaffold and Project Setup

## What Was Done

Phase 1 established the foundation for the new Angular frontend. The legacy vanilla HTML/CSS/JS files in `Frontend/` remain untouched for reference, while a fresh Angular project lives in `frontend/`.

### Project Initialization

A new Angular 19 project was generated using `ng new frontend` with standalone components, SCSS styling, and SSR disabled. The strict TypeScript configuration was kept to enforce type safety throughout the codebase.

### Angular Material Integration

Angular Material was installed and configured with the M3 (Material 3) design system. A custom theme was defined in `styles.scss` using `mat.theme()` with a violet primary palette and orange tertiary accent. This gives FlowCraft a distinct visual identity separate from the default Material blue.

### Folder Structure

The `src/app/` directory follows a scalable feature based layout:

```
src/app/
  core/           # Singletons: services, guards, interceptors, models
    auth/         # TokenService, AuthService, AuthInterceptor, authGuard
    models/       # TypeScript interfaces matching backend schemas
    services/     # HTTP services for workflows, tasks, users, comments, search
  shared/         # Reusable UI components (navbar, workflow card, confirm dialog)
  features/       # Route level feature modules
    auth/         # Login, register, forgot password, reset password, activation
    home/         # Landing page with hero and popular workflows
    search/       # Search results page
    workflow/     # Detail view and create/edit stepper
    dashboard/    # Tabbed user dashboard
```

### Environment Configuration

Environment files (`environment.ts` and `environment.development.ts`) define the `apiUrl` pointing at `http://localhost:3000/api/v1` for development builds and a placeholder production URL.

### Routing

`app.routes.ts` uses lazy loaded standalone components for every route. This keeps the initial bundle small since feature components are only downloaded when the user navigates to them.

### Proxy Configuration

A `proxy.conf.json` forwards `/api` requests to the backend during `ng serve`, avoiding CORS issues in local development.
# Phase 1: Backend Security and API Modernization

## Overview

Phase 1 transformed the FlowCraft backend from a university project into a production grade REST API. Every change focused on security hardening, API standards, and developer experience. No new features were added. The goal was to bring the existing functionality up to professional standards.

## What Was Done and Why

### 1. Helmet (HTTP Security Headers)

Added the `helmet` middleware to the Express pipeline. Helmet sets a collection of HTTP response headers that protect against common web attacks:

- **X-Content-Type-Options: nosniff** prevents browsers from MIME sniffing responses, stopping attackers from disguising malicious files as harmless content types.
- **X-Frame-Options: SAMEORIGIN** prevents the app from being embedded in iframes on other sites, blocking clickjacking attacks where a hidden iframe tricks users into clicking things they did not intend to.
- **Strict-Transport-Security** tells browsers to only use HTTPS for future requests, even if someone types http:// in the URL bar.
- **X-XSS-Protection** enables the browser's built in XSS filter as an additional layer.

Without helmet, the API responses had no security headers at all. Any browser connecting to the API was getting raw responses with zero protection guidance.

### 2. CORS (Cross Origin Resource Sharing)

Added the `cors` middleware with an allowlist based configuration. CORS controls which frontend domains are allowed to call the API from a browser.

Before: No CORS config, meaning either all origins were blocked (browser default) or all were allowed depending on how the browser handled it. Neither is correct for production.

After: The `CORS_ORIGIN` environment variable defines exactly which frontend URLs can make requests. In development it is localhost:8080. In production you set it to your actual domain. Any request from an unlisted origin gets rejected by the browser before it even reaches the route handler.

### 3. Morgan (Request Logging)

Added the `morgan` middleware for HTTP request logging. Every incoming request now gets logged with method, URL, status code, response time, and content length.

This is essential for debugging in production. Without logging, if something goes wrong you have no visibility into what requests are hitting the server, how long they take, or what status codes are being returned. Morgan writes to stdout which integrates with any log aggregation service (Render logs, Docker logs, etc.).

### 4. Mongo Sanitize (NoSQL Injection Prevention)

Added `express-mongo-sanitize` middleware. This strips any keys starting with `$` or containing `.` from request body, query params, and URL params.

MongoDB queries use `$` operators like `$gt`, `$ne`, `$regex`. Without sanitization, an attacker can send a login request like:

```json
{ "email": "admin@example.com", "password": { "$ne": "" } }
```

This would match any non empty password, bypassing authentication entirely. Mongo sanitize removes the `$ne` key before it reaches the query, making this attack impossible.

### 5. Rate Limiting

Added `express-rate-limit` on authentication endpoints (login, register, password reset). Each IP address is limited to 20 requests per 15 minute window.

Without rate limiting, an attacker could automate thousands of login attempts per second to brute force passwords, or spam the registration endpoint to fill the database with fake accounts. Rate limiting makes these attacks impractical without affecting normal user behavior (20 requests in 15 minutes is more than enough for legitimate use).

### 6. Body Size Limit

Set a 10KB maximum on JSON request bodies via `express.json({ limit: '10kb' })`.

Without a body limit, an attacker could send a multi gigabyte JSON payload to the server, consuming all available memory and crashing the process. This is a simple denial of service attack. 10KB is generous for any legitimate API call (workflow data, user profiles, comments) while blocking oversized payloads.

### 7. Environment Variable Validation

Created `validateEnv.js` that runs on server startup and checks that all required environment variables (PORT, MONGODB_URL, JWT_SECRET, SENDER_EMAIL, FRONTEND_URL) are present and not empty.

Before: If you forgot to set MONGODB_URL, the server would start, then crash with a cryptic Mongoose connection error when the first request came in. If JWT_SECRET was missing, token generation would silently fail. Missing SENDER_EMAIL would cause email functions to fail at runtime.

After: The server refuses to start and prints exactly which variables are missing. There is also a warning if JWT_SECRET is still set to the placeholder value. This catches configuration errors at deploy time instead of at runtime.

### 8. Enum File Rename

Renamed `eunms.js` to `enums.js` (fixing a typo from the original codebase) and updated all import paths. A small change but it matters for code readability and professionalism.

### 9. bcrypt Salt Rounds (10 to 12)

Increased the bcrypt hashing cost from 10 to 12 rounds. Each increment doubles the computation time needed to hash a password.

At 10 rounds, hashing takes roughly 100ms. At 12 rounds, it takes roughly 400ms. For legitimate users logging in, this difference is imperceptible. For an attacker trying to crack hashed passwords from a database breach, 12 rounds is 4x more expensive per attempt. With millions of attempts, this is a significant deterrent. 12 rounds is the current industry recommendation (OWASP, Auth0).

### 10. JWT Token Expiration

Added expiration times to all JWT tokens: authentication tokens expire in 7 days, account activation and password reset tokens expire in 24 hours.

Before: Tokens never expired. If someone stole a JWT (from an old browser session, a compromised machine, or network interception), they could use it forever. There was no way to invalidate access short of changing the JWT_SECRET, which would log out every user.

After: Auth tokens automatically become invalid after 7 days, forcing re login. Account tokens (activation, reset) expire in 24 hours since they are one time use actions that should not stay valid indefinitely.

### 11. Central Error Handler

Created an `errorHandler` middleware that catches all errors thrown by route handlers and returns consistent JSON error responses.

Before: Each route had its own try/catch with different error response formats. Some returned `{ error: message }`, some returned plain strings, some returned the raw Error object. In production, unhandled errors could leak stack traces and internal details to the client.

After: All errors go through one handler that returns `{ error: message }` format consistently. In production mode, stack traces are never sent to the client. Validation errors from Mongoose get extracted into readable messages.

### 12. API Versioning (/api/v1 prefix)

Added the `/api/v1` prefix to all routes. Previously, endpoints were at the root level (e.g., `/users/create`). Now they are at `/api/v1/users/create`.

API versioning is standard practice for any API that might evolve. If you need to make breaking changes in the future, you create `/api/v2` endpoints while keeping `/api/v1` working for existing clients. Without versioning, any breaking change forces all clients to update simultaneously.

### 13. Password Reset Redesign

Redesigned the password reset flow. The original implementation generated a new random password and sent it in the email URL. This meant:
- A plaintext password was transmitted in a URL (visible in browser history, server logs, email logs)
- The password was changed immediately when the reset was requested, not when the user confirmed

The new flow generates a secure token, sends a link to a reset page with that token, and the user chooses their own new password. The token expires in 24 hours and is single use.

### 14. Swagger / OpenAPI Documentation

Added automatic API documentation using swagger-jsdoc and swagger-ui-express, available at `/api/docs` when the server is running.

Every endpoint is documented with its HTTP method, path, required authentication, request body schema, and possible response codes. This is generated from JSDoc comments in the route files, so the documentation stays in sync with the code.

Interactive documentation means anyone reviewing the API (including yourself in 6 months) can see every endpoint, what it expects, and what it returns, without reading the source code.

### 15. Health Check Endpoint

Added `GET /health` that returns `{ status: "ok", timestamp: ... }`. This is used by hosting platforms (Render, AWS, etc.) to know if the server is alive and accepting requests. Without it, the platform has no way to automatically detect if the server has crashed or become unresponsive, and cannot restart it.

## Test Updates

All 73 existing test cases were updated to work with the new `/api/v1` route prefix and the new password reset flow. No tests were removed. The test suite continues to pass fully, validating that all changes are backward compatible at the functional level.

## What This Means

Before Phase 1, the API was functional but had no defense against common attacks, no logging, no documentation, no token expiration, inconsistent error handling, and no configuration validation. These are the kinds of issues that would immediately stand out in a code review or security audit.

After Phase 1, the API follows OWASP security recommendations, has proper HTTP headers, input sanitization, rate limiting, body limits, token expiration, consistent error responses, automatic documentation, and validated configuration. This is the baseline expected of any production REST API.
