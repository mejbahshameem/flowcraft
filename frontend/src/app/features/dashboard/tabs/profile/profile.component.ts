import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserService } from '../../../../core/services/user.service';
import { TokenService } from '../../../../core/auth/token.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private tokenService = inject(TokenService);
  private snackBar = inject(MatSnackBar);

  userName = signal('');
  userEmail = signal('');
  avatarUrl = signal<string | null>(null);
  saving = signal(false);
  uploadingAvatar = signal(false);

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(7)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const token = this.tokenService.getToken();
    if (token) {
      const payload = this.tokenService.decodePayload(token);
      if (payload) {
        this.userName.set((payload['name'] as string) || '');
        this.userEmail.set((payload['email'] as string) || '');
        this.profileForm.patchValue({ name: this.userName() });
      }
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 1_048_576) {
      this.snackBar.open('Avatar must be under 1MB', 'Close', { duration: 3000 });
      return;
    }

    this.uploadingAvatar.set(true);
    this.userService.uploadAvatar(file).subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.snackBar.open('Avatar updated', 'Close', { duration: 3000 });
      },
      error: () => {
        this.uploadingAvatar.set(false);
        this.snackBar.open('Could not upload avatar', 'Close', { duration: 4000 });
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    const name = this.profileForm.value.name!;
    this.userService.updateProfile({ name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.userName.set(name);
        this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Could not update profile', 'Close', { duration: 4000 });
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (password !== confirmPassword) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.saving.set(true);
    this.userService.updateProfile({ password: password!, confirmPassword: confirmPassword! }).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordForm.reset();
        this.snackBar.open('Password changed', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Could not change password', 'Close', { duration: 4000 });
      },
    });
  }
}
