import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
    ],
  },
  {
    path: 'activate/:token',
    loadComponent: () =>
      import('./features/auth/activate-account/activate-account.component').then(
        (m) => m.ActivateAccountComponent,
      ),
  },
  {
    path: 'deactivate/:token',
    loadComponent: () =>
      import('./features/auth/deactivate-account/deactivate-account.component').then(
        (m) => m.DeactivateAccountComponent,
      ),
  },
  {
    path: 'deactivation/confirm/:token',
    loadComponent: () =>
      import('./features/auth/deactivation-confirm/deactivation-confirm.component').then(
        (m) => m.DeactivationConfirmComponent,
      ),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search-results/search-results.component').then(
        (m) => m.SearchResultsComponent,
      ),
  },
  {
    path: 'workflow/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workflow/workflow-create/workflow-create.component').then(
        (m) => m.WorkflowCreateComponent,
      ),
  },
  {
    path: 'workflow/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workflow/workflow-create/workflow-create.component').then(
        (m) => m.WorkflowCreateComponent,
      ),
  },
  {
    path: 'workflow/:id',
    loadComponent: () =>
      import('./features/workflow/workflow-detail/workflow-detail.component').then(
        (m) => m.WorkflowDetailComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    children: [
      { path: '', redirectTo: 'my-workflows', pathMatch: 'full' },
      {
        path: 'my-workflows',
        loadComponent: () =>
          import('./features/dashboard/tabs/my-workflows/my-workflows.component').then(
            (m) => m.MyWorkflowsComponent,
          ),
      },
      {
        path: 'saved',
        loadComponent: () =>
          import('./features/dashboard/tabs/saved-workflows/saved-workflows.component').then(
            (m) => m.SavedWorkflowsComponent,
          ),
      },
      {
        path: 'voting-history',
        loadComponent: () =>
          import('./features/dashboard/tabs/voting-history/voting-history.component').then(
            (m) => m.VotingHistoryComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/tabs/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
