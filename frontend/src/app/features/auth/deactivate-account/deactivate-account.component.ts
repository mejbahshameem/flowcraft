import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-deactivate-account',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './deactivate-account.component.html',
  styleUrl: './deactivate-account.component.scss',
})
export class DeactivateAccountComponent implements OnInit {
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
      this.errorMessage.set('Invalid deactivation link. No token provided.');
      return;
    }

    this.authService.requestDeactivation(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.error || 'Deactivation request failed. The link may be invalid or expired.',
        );
      },
    });
  }
}
