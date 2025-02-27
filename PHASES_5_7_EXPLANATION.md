# Phases 5 through 7 Explanation

## Phase 5: Workflow Detail Page

### Detail View

The workflow detail page loads at `/workflow/:id` and fetches the full workflow data from `GET /api/v1/workflow/:id/view`. The response includes the name, description, task list, owner name, vote counts, and follower count.

The page layout has a header section showing the workflow name, owner, and key metrics (followers, upvotes, downvotes). Two action buttons let authenticated users follow the workflow or copy a shareable link.

### Task Accordion

Tasks are displayed in a Material expansion panel accordion, sorted by `step_no`. Each panel header shows the step number as a badge alongside the task name and estimated days. Expanding a panel reveals the full task description.

### Vote Buttons

The `VoteButtonsComponent` is a standalone inline template component that handles upvoting and downvoting. It posts to `PATCH /api/v1/workflow/:id/vote` with the vote type. The UI updates optimistically, incrementing or decrementing the displayed counts immediately while the API call completes in the background.

### Comment Section

`CommentSectionComponent` loads public comments from `GET /api/v1/workflow/:id/comments/all` and renders them in a list with commenter name and comment text. Authenticated users see a text input at the bottom to post new comments via `POST /api/v1/comments`.

## Phase 6: Workflow Create and Edit

### Stepper Form

The create workflow page at `/workflow/create` uses a Material stepper with three steps:

1. **Basic Information**: Name (required, max 120 chars), description (required, max 500 chars), location, and visibility (public/private) as a select dropdown.
2. **Add Tasks**: A dynamic `FormArray` where users add and remove tasks. Each task has a name, description, step number (auto assigned), and estimated days. Tasks can be deleted inline, and step numbers renumber automatically.
3. **Review**: A summary showing all entered data before publishing. The publish button triggers sequential API calls to create the workflow and then each task individually.

### Edit Mode

When navigating to `/workflow/:id/edit`, the component detects the route parameter and enters edit mode. It fetches the existing workflow and tasks via `TaskService.getWorkflowTasks()`, populates the forms, and switches the publish action to update calls. Deleting a task in edit mode also sends a delete request to the backend.

### Task Persistence

Tasks are saved after the workflow is created or updated. Each task is sent individually: new tasks use `POST /api/v1/tasks`, existing tasks use `PATCH /api/v1/workflow/:id/task/:taskId`. A completion counter tracks when all task operations finish before navigating to the detail page.

## Phase 7: Dashboard

### Layout

The dashboard at `/dashboard` uses a Material tab nav bar with four tabs: My Workflows, Saved, Voting History, and Profile. Each tab is a child route rendered inside a `router-outlet`, keeping the tab bar persistent while content swaps.

### My Workflows Tab

Displays a Material table of workflows the user has created. Columns show the workflow name (clickable link to detail page), upvote count, downvote count, and follower count. Action buttons allow editing (navigates to edit page) or deleting (opens a confirmation dialog first).

The delete flow uses a shared `ConfirmDialogComponent` that returns a boolean on close. On confirmation, the workflow is deleted via `DELETE /api/v1/workflow/:id` and the row is removed from the table reactively using signal updates.

### Saved Workflows Tab

Shows workflows the user is following in a Material accordion. Each panel header displays the workflow name and completion percentage. Opening a panel lazy loads the task instances from `GET /api/v1/following/workflow/:instanceId/tasks/all`.

Each task row shows a status icon (unchecked, in progress, or completed), the task name, and estimated days. Users can start tasks, mark them complete, and toggle email notification reminders. The progress bar updates in real time as tasks are completed.

The unfollow action removes the workflow instance from the saved list.

### Voting History Tab

A simple Material table listing workflows the user has voted on. Each row shows the workflow name and a colored badge indicating upvote or downvote. Badges use the primary container color for upvotes and error container for downvotes.

### Profile Tab

The profile section has three Material cards:

1. **Avatar Card**: Shows the user avatar (or a placeholder icon), display name, and email extracted from the JWT payload. An upload button allows selecting a new avatar image (under 1MB, sent as multipart form data).
2. **Profile Settings Card**: A form to update the display name via `PATCH /api/v1/users/me`.
3. **Change Password Card**: Two fields (new password, confirm password) with client side match validation before submitting.

### Routing and Guards

All dashboard child routes are protected by `authGuard`. The base `/dashboard` path redirects to `/dashboard/my-workflows` as the default tab. Workflow create and edit routes are also guarded.

The wildcard route (`**`) redirects to the home page, ensuring unknown paths degrade gracefully.
