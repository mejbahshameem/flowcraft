# FlowCraft Frontend

Angular 20 single-page application for FlowCraft. Built with the standalone-component architecture, Angular Material, and the new `@angular/build:application` builder.

## Development

```bash
npm install
npx ng serve
```

The dev server runs on http://localhost:4200 and proxies `/api/*` to the backend on port 3000 via [`proxy.conf.json`](proxy.conf.json).

## Build

```bash
npm run build                 # production build (default configuration)
npm run build -- --configuration development
```

Production output lands in `dist/frontend/browser/`. The `production` configuration in [`angular.json`](angular.json) replaces `src/environments/environment.ts` with `environment.prod.ts`, which uses a relative `/api/v1` base URL (the host platform handles the proxy).

## Environments

| File | Used by | `apiUrl` |
|------|---------|----------|
| `src/environments/environment.ts` | `ng serve` | `http://localhost:3000/api/v1` |
| `src/environments/environment.prod.ts` | production builds | `/api/v1` (relative) |

## Testing

Unit tests use Karma + Jasmine. There are currently no `*.spec.ts` files in this project; CI runs a production build to validate the bundle compiles and stays within bundle budgets.

```bash
npx ng test     # Karma watch mode (when specs are added)
```

## Deployment

The SPA is deployed to **Vercel** (https://flowcraftio.vercel.app). Vercel auto-builds on every push to `main`.

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist/frontend/browser`
- [`vercel.json`](vercel.json) rewrites `/api/*` to the Render backend (same-origin, no CORS) and handles SPA fallback for deep links.

A containerized alternative is also provided in [`Dockerfile`](Dockerfile) (nginx serving the static bundle with a runtime-templated `BACKEND_URL`) for any platform that prefers a container deploy.
