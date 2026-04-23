import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  loading = signal(false);
  pendingActivationEmail = signal<string | null>(null);
  resending = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.pendingActivationEmail.set(null);
    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403 && err.error?.code === 'NOT_ACTIVATED') {
          this.pendingActivationEmail.set(err.error.email || email || null);
          return;
        }
        const message = err.error?.error || 'Login failed. Please check your credentials.';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
    });
  }

  resendActivation(): void {
    const email = this.pendingActivationEmail();
    if (!email) return;
    this.resending.set(true);
    this.authService.resendActivation(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.snackBar.open(
          'Activation email sent. Check your inbox.',
          'Close',
          { duration: 5000 }
        );
      },
      error: () => {
        this.resending.set(false);
        this.snackBar.open('Could not send activation email', 'Close', { duration: 4000 });
      },
    });
  }

  togglePassword(): void {
    this.hidePassword.update((v) => !v);
  }
}
