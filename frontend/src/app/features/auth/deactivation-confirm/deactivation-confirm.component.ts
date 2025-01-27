import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-deactivation-confirm',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './deactivation-confirm.component.html',
  styleUrl: './deactivation-confirm.component.scss',
})
export class DeactivationConfirmComponent implements OnInit {
  loading = signal(true);
  success = signal(false);
  errorMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('Invalid confirmation link. No token provided.');
      return;
    }

    this.authService.confirmDeactivation(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.authService.clearSession();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.error || 'Confirmation failed. The link may be invalid or expired.',
        );
      },
    });
  }
}
