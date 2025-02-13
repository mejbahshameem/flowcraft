# Phases 2 through 4 Explanation

## Phase 2: Authentication Pages

### Login and Register

The login and register forms are built as standalone Angular components using Reactive Forms with Material form fields. Both forms validate input client side (required fields, email format, minimum password length) before submitting to the backend.

On successful login, the JWT token is stored via `TokenService` which wraps `localStorage` access behind a signal. This signal drives reactive UI updates: the navbar immediately reflects auth state changes without requiring a page reload.

### Token Management

`TokenService` manages the JWT lifecycle. It exposes a readonly signal (`tokenChange`) that other services can depend on. `AuthService` computes an `isAuthenticated` signal by reading the token signal, which the navbar subscribes to for showing/hiding auth dependent links.

`AuthInterceptor` is registered as an HTTP interceptor via `provideHttpClient(withInterceptors([authInterceptor]))`. It reads the token from `TokenService` and attaches it as a Bearer header on every outgoing request.

### Auth Guard

`authGuard` is a functional `CanActivateFn` that checks `tokenService.isLoggedIn()`. If the token is missing or expired, the user is redirected to `/login`. Protected routes like `/dashboard` and `/workflow/create` use this guard.

### Forgot Password and Reset Password

The forgot password flow sends a POST to `/api/v1/users/forgot-password` with the email. The backend generates a reset token and emails a link. The reset password component reads the token from query params and submits the new password.

### Account Activation and Deactivation

Activation and deactivation are simple confirmation pages that call the backend with the token from the URL path. Success or failure is shown via a Material snack bar notification.

## Phase 3: Home Page and Search

### Home Page Redesign

The home page features a hero section with the tagline "Discover workflows. Follow the path." and a prominent search bar. Below the hero, a features strip highlights four key platform capabilities (Discover, Follow, Community Voted, Progress).

Popular workflows are fetched from `GET /api/v1/workflows/popular` and displayed in a responsive grid using the shared `WorkflowCardComponent`.

### Search

The search bar on the home page and the dedicated search results page both use the `interest` query parameter when calling `GET /api/v1/search`. Results are mapped to the `Workflow` interface and rendered in a grid of workflow cards.

### Workflow Card

`WorkflowCardComponent` is a generic, reusable card that accepts data of varying shapes (popular workflows, search results, created workflows). It uses helper methods to extract the ID, name, description, and upvote count regardless of the source API format.

## Phase 4: Nodemailer Migration

### Backend Email Service

The `emailService.js` module was rewritten to use Nodemailer with Gmail SMTP transport. Configuration uses environment variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`) loaded from the dev.env file.

The transport is created with `secure: true` on port 465, using an app password generated from Google account settings. This replaces the previous email approach and works reliably for activation emails, password reset links, and task notification reminders.

### Email Templates

Email content is generated as plain HTML strings within the service functions. Each email type (activation, password reset, task reminder) has its own template with appropriate subject lines and body content.
# Phases 2, 3, and 4 Explanation

This document explains every part of the Angular frontend built across three phases: the project scaffold and core architecture (Phase 2), the authentication pages (Phase 3), and the home and search pages (Phase 4).

## Phase 2: Angular Project Scaffold

### What is Angular?

Angular is a TypeScript framework for building single page applications (SPAs). Unlike the old vanilla JavaScript frontend where each page was a separate HTML file, Angular compiles everything into one application that runs in the browser. Navigation between pages happens without full page reloads, making the experience feel fast and smooth like a native app.

### Why Angular 20?

Angular 20 is the latest stable version. It includes standalone components by default (no NgModules needed), signal based reactivity, and the new control flow syntax (@if, @for) which replaces the older *ngIf and *ngFor directives. These features make the code shorter and easier to understand.

### Project Setup (ng new)

The Angular CLI command `ng new frontend` generated the project structure. Key choices made during setup:

- **SCSS** for styling instead of plain CSS. SCSS lets you nest selectors and use variables, making stylesheets cleaner.
- **Skip SSR** (Server Side Rendering) since this is a client only SPA.
- **Skip Git** since the project lives inside an existing git repository.

The generated files include:
- `angular.json`: Build and serve configuration. This tells Angular CLI how to compile the project, where to find source files, and how to run the dev server.
- `tsconfig.json`: TypeScript compiler settings with strict mode enabled for type safety.
- `package.json`: Dependencies including Angular core, Material, RxJS, and zone.js.
- `src/main.ts`: The entry point that bootstraps the root App component.
- `src/index.html`: The single HTML page. The browser loads this once, and Angular takes over rendering from there.

### Angular Material 3

Angular Material is a UI component library that provides pre built, accessible components following Google's Material Design guidelines. Version 20 uses Material 3 (also called Material You), which is the newer design system with:

- **CSS custom properties** (variables) for theming instead of Sass mixins
- **Color tokens** like `--mat-sys-primary`, `--mat-sys-surface` that you reference in your SCSS
- **Dynamic color** support with palette based theming

The theme is configured in `styles.scss` using `mat.theme()` with an azure primary palette and blue tertiary palette. This generates all the CSS variables that Material components use.

### Environment Files

- `environment.ts`: Used during development. Sets `apiUrl` to `http://localhost:3000/api/v1`.
- `environment.prod.ts`: Used in production builds. Sets `apiUrl` to `/api/v1` (relative, served from same origin).

Angular automatically swaps these files during build via the `fileReplacements` configuration in `angular.json`.

### Proxy Configuration

`proxy.conf.json` tells the Angular dev server to forward any request starting with `/api` to `http://localhost:3000`. This avoids CORS issues during development without modifying the backend. In production, a reverse proxy (like Nginx) would handle this.

### Standalone Components

Every component in Angular 20 is standalone by default. This means each component declares its own imports (what other components and modules it uses) directly in its `@Component` decorator. There is no need for NgModules, which were a common source of confusion in older Angular versions.

Example from the login component:
```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, ...],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
```

### Signal Based Reactivity

Signals are Angular's newer approach to managing state changes. Instead of relying on change detection checking every component on every event, signals explicitly track which data changed and only update what is affected.

```typescript
// Creating a signal with an initial value
loading = signal(false);

// Reading a signal's value (call it like a function)
if (this.loading()) { ... }

// Updating a signal
this.loading.set(true);

// Computed signals (automatically recalculate when dependencies change)
readonly isAuthenticated = computed(() => this.tokenService.isLoggedIn());
```

### inject() Function

Instead of declaring dependencies in the constructor (the older pattern), Angular provides the `inject()` function that can be called at class field initialization time:

```typescript
export class LoginComponent {
  private fb = inject(FormBuilder);       // Available immediately
  private authService = inject(AuthService);

  // Can use this.fb here because inject() runs during field initialization
  loginForm = this.fb.group({ ... });
}
```

This is necessary because TypeScript strict mode does not allow using constructor parameters in field initializers (they have not been assigned yet when fields are initialized). The `inject()` function resolves this by pulling from Angular's dependency injection context during construction.

### Core Models (TypeScript Interfaces)

Interfaces define the shape of data objects without adding runtime code:

- `User`: _id, name, email, avatar, createdAt, updatedAt
- `AuthResponse`: user + token (returned by login endpoint)
- `MessageResponse`: success flag + message (returned by most action endpoints)
- `Workflow`: _id, name, description, location, access, owner, upvotes, downvotes, isDeleted
- `Task`: _id, name, description, duration, step, workflow reference
- `Comment`: _id, text, workflow, commenter, access (public/private)

### TokenService

Manages JWT storage and validation:

- `setToken(token)`: Stores the JWT in localStorage under the key `flowcraft_token`.
- `getToken()`: Retrieves the stored token.
- `removeToken()`: Clears the token on logout.
- `isLoggedIn()`: Decodes the JWT payload (the middle Base64 segment) and checks whether `exp` (expiry timestamp) is still in the future. Returns false if expired or if no token exists.

### AuthService

The main authentication service uses signals to expose reactive state:

- `currentUser` signal: Holds the logged in user object or null.
- `isAuthenticated` computed signal: Derives from tokenService.isLoggedIn().
- `login()`: POSTs credentials, stores the returned token, and updates the user signal.
- `register()`: POSTs name, email, password, and confirmPassword.
- `logout()`: POSTs to logout endpoint, clears token and user state, navigates to /login. Catches errors to ensure cleanup always happens.
- `activateAccount()`: GETs the activation endpoint with the token from the email link.
- `requestPasswordReset()`: POSTs email to trigger a reset email.
- `resetPassword()`: POSTs the reset token and new password.
- `requestDeactivation()` and `confirmDeactivation()`: Two step deactivation flow matching the backend's design.
- `fetchProfile()`: GETs the current user's profile and updates the signal.

### Auth Guard

A functional route guard (`CanActivateFn`) that checks if the user has a valid token. If not, it redirects to the login page. Used to protect routes that require authentication:

```typescript
export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  if (tokenService.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};
```

### HTTP Interceptors

Interceptors are functions that modify HTTP requests or responses globally:

- **authInterceptor**: Clones every outgoing request and adds an `Authorization: Bearer <token>` header if a token exists. This way, individual services do not need to manually attach tokens.
- **errorInterceptor**: Catches HTTP error responses. On a 401 (Unauthorized), it removes the stored token and redirects to the login page. This handles session expiry gracefully.

Both interceptors are registered in `app.config.ts` via `provideHttpClient(withInterceptors([...]))`.

### Data Services

Each service wraps HttpClient calls to specific backend endpoints:

- **WorkflowService**: getPopular(), getById(), search(), create(), copy(), follow(), vote()
- **SearchService**: search(query, sortBy) using HttpParams to build query strings
- **UserService**: getProfile(), updateProfile(), uploadAvatar() using FormData
- **CommentService**: getComments(workflowId, type, token?), postComment()
- **TaskService**: getTasks(), createTask(), updateTask(), deleteTask()

### Shared Components

Reusable components used across multiple pages:

**NavbarComponent**: A Material toolbar at the top of every page. Uses `@if` to conditionally show different content based on auth state. When logged out, shows Login and Sign Up buttons. When logged in, shows a Dashboard link and a user menu (mat-menu) with Profile and Logout options.

**FooterComponent**: Simple footer with a link to the FlowCraft home page and a dynamic copyright year.

**LoadingSpinnerComponent**: Inline template wrapping a Material spinner with a standard diameter. Used as a loading indicator.

**EmptyStateComponent**: A flexible placeholder shown when a list is empty or an error occurs. Takes icon, title, and message as signal inputs so parent components can customize what is displayed.

**WorkflowCardComponent**: Displays a single workflow as a Material card. Takes a Workflow object as input. Shows the name, a truncated description, the owner, a location chip, and the vote count. The entire card is wrapped in a routerLink to the workflow detail page. Has a hover state that adds elevation.

### Password Validator

A custom Angular validator factory function:
```typescript
export function passwordMatchValidator(passwordField: string, confirmField: string) {
  return (group: AbstractControl) => {
    const password = group.get(passwordField);
    const confirm = group.get(confirmField);
    if (password?.value !== confirm?.value) {
      return { passwordMismatch: true };
    }
    return null;
  };
}
```
This is applied as a form group level validator, checking that two named controls have matching values.

### App Configuration

`app.config.ts` registers all application level providers:
- `provideRouter(routes)`: Enables routing
- `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`: Enables HTTP calls with both interceptors
- `provideAnimationsAsync()`: Enables Angular Material animations using lazy loading
- `provideZoneChangeDetection()`: Standard Angular change detection using zones

### App Routes

Routes use lazy loading via `loadComponent` so that each page is only downloaded when the user navigates to it, reducing the initial bundle size:

```typescript
{
  path: 'login',
  loadComponent: () => import('./features/auth/login/login.component')
    .then(m => m.LoginComponent),
}
```

Auth pages (login, register, forgot password, reset password) are children of the auth layout route, so they all share the split panel layout. Standalone pages like activate, deactivate, and search have their own top level routes.

### App Component

The root component simply renders the navbar, a main content area with a router outlet (where page components are dynamically inserted), and the footer. Every page shares this shell.

---

## Phase 3: Authentication Pages

### Auth Layout

A split panel layout component that wraps all authentication forms. The left panel has a gradient background with the app name and tagline. The right panel contains a Material card with a `<router-outlet>` where child components (login, register, etc.) are rendered.

On mobile screens (below 768px), the left panel is hidden and the form takes the full width. This is handled with a CSS `@media` query.

### Login Page

Built with Angular Reactive Forms. A reactive form is a model driven approach where the form structure is defined in TypeScript code:

```typescript
loginForm = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
});
```

Each field has an initial value (empty string) and an array of validators. The template binds to the form using `[formGroup]` and `formControlName` directives.

**Password visibility toggle**: A button with a Material icon switches between `visibility` and `visibility_off` icons. The input type toggles between `'password'` and `'text'` based on a signal.

**Loading state**: When the form is submitted, a `loading` signal is set to true, the submit button is disabled, and the button text is replaced with a spinner.

**Error handling**: Errors from the backend (like "Invalid credentials") are shown in a Material Snackbar, which is a small notification bar that appears at the bottom of the screen and auto dismisses after 5 seconds.

### Register Page

Similar reactive form structure with four fields: name, email, password, and confirmPassword. The form has a group level validator (passwordMatchValidator) that checks the two password fields match.

**Password strength indicator**: The `getPasswordStrength()` method calculates a score based on:
- Length >= 8 characters (+1)
- Length >= 12 characters (+1)
- Contains uppercase letters (+1)
- Contains numbers (+1)
- Contains special characters (+1)

The score maps to Weak (0 to 1), Medium (2 to 3), or Strong (4 to 5). The corresponding color class is applied to the strength text.

**Success state**: After successful registration, instead of showing the form, a success message with an email icon prompts the user to check their inbox for an activation link. This uses the `@if / @else` control flow.

### Forgot Password Page

A minimal form with just an email field. On submission, it calls `authService.requestPasswordReset()`. After success, shows a "Check Your Email" message with the `mark_email_read` icon.

### Reset Password Page

Reads a `token` query parameter from the URL on initialization (via `ActivatedRoute`). Provides a form for a new password and confirmation with the passwordMatchValidator. On success, shows a confirmation message with a link to log in.

### Activate Account Component

Reads a `token` route parameter, calls `authService.activateAccount()`, and shows one of three states:
1. **Loading**: Spinner while the API call is in progress
2. **Success**: Green check icon with success message and link to login
3. **Error**: Red error icon with the error message from the backend

### Deactivate Account Component

Similar pattern to activation. Reads a token from route params, calls `authService.requestDeactivation()`. Shows success (email sent confirmation) or error state.

### Deactivation Confirm Component

The final step of account deactivation. After the user clicks the confirmation link in their email, this component calls `authService.confirmDeactivation()` with the token. On success, it also calls `authService.clearSession()` to remove the JWT and user state.

---

## Phase 4: Home and Search

### Home Page

Two sections:

**Hero Section**: A full width gradient banner (primary to tertiary color) with centered text content. Contains a heading, subtitle, and two call to action buttons. The "Get Started Free" button links to registration and uses `mat-flat-button` (filled). The "Browse Workflows" button links to the search page and uses `mat-stroked-button` (outlined) with a search icon.

The hero has negative margins (`margin: -24px -24px 0`) to extend past the app content padding and reach the edges of the viewport.

**Popular Workflows Section**: Fetches workflows from `workflowService.getPopular()` on initialization. Displays them in a CSS Grid container using `auto-fill` with `minmax(320px, 1fr)` so the columns automatically adjust based on screen width. Each workflow renders as a WorkflowCardComponent.

Handles three states:
- Loading: centered spinner
- Error: EmptyState with "Unable to Load Workflows"
- Empty array: EmptyState with "No Workflows Yet"

### Search Results Page

**Search Bar**: Contains three elements in a flex row:
1. A Material form field with search input and a search icon prefix
2. A "Search" button that triggers the search
3. A Material select dropdown for sort options (Most Relevant, Most Popular, Most Recent)

**URL Based Search**: The component subscribes to `ActivatedRoute.queryParamMap` changes. When query parameters change (either from user interaction or direct URL access), it reads `q` (query) and `sort` parameters and performs the search. This means search results are shareable via URL.

**Search Execution**: Uses `router.navigate()` to update query parameters instead of calling the API directly. The subscription to query param changes then triggers the actual API call. This ensures the URL always reflects the current search state.

**Results Display**: Same responsive grid layout as the home page. Shows:
- Loading spinner during search
- "No Results Found" empty state after a search with no matches
- Result count and grid of WorkflowCards when results exist
- "Search Workflows" prompt when the page loads without a query

---

## Architecture Summary

The frontend follows a clear separation:

- **Core**: Singleton services and infrastructure (auth, HTTP interceptors, data services). Created once and shared across the entire app.
- **Features**: Page level components organized by feature area (auth, home, search). Each feature is lazy loaded.
- **Shared**: Reusable UI components and validators used by multiple features.

Data flows from backend API through services to components via RxJS Observables. Component state is managed with Angular signals. Navigation uses the Angular Router with lazy loaded routes. The auth interceptor automatically attaches tokens to API calls, and the error interceptor handles session expiry.

This architecture scales well for adding future features like workflow creation, task management, and user profiles, as each would be a new feature module with its own lazy loaded routes.
